#!/usr/bin/env node
/**
 * path-extractor.cjs - Extract paths from Claude Code tool inputs
 *
 * Extracts file_path, path, pattern params and parses Bash commands
 * to find all path-like arguments.
 */

// Flags that indicate the following value should NOT be checked as a path
// These are "exclude" semantics - the user is explicitly skipping these paths
const EXCLUDE_FLAGS = [
  '--exclude', '--ignore', '--skip', '--prune',
  '-x',           // tar exclude shorthand
  '-path',        // find -path (used with -prune)
  '--exclude-dir' // grep --exclude-dir
];

// Filesystem commands where bare directory names (build, dist, etc.)
// should be extracted as paths. For non-fs commands (grep, echo, sed),
// only tokens that look like actual paths (contain / or extension) are extracted.
const FILESYSTEM_COMMANDS = [
  'cd', 'ls', 'cat', 'head', 'tail', 'less', 'more',
  'rm', 'cp', 'mv', 'find', 'touch', 'mkdir', 'rmdir',
  'stat', 'file', 'du', 'tree', 'chmod', 'chown', 'ln',
  'readlink', 'realpath', 'wc', 'tee', 'tar', 'zip', 'unzip',
  'open', 'code', 'vim', 'nano', 'bat', 'rsync', 'scp', 'diff'
];

/**
 * Extract all paths from a tool_input object
 * Handles: file_path, path, pattern params and command strings
 *
 * @param {Object} toolInput - The tool_input from hook JSON
 * @returns {string[]} Array of extracted paths
 */
function extractFromToolInput(toolInput) {
  const paths = [];

  if (!toolInput || typeof toolInput !== 'object') {
    return paths;
  }

  // Direct path params (Read, Edit, Write, Grep, Glob tools)
  const directParams = ['file_path', 'path', 'pattern'];
  for (const param of directParams) {
    if (toolInput[param] && typeof toolInput[param] === 'string') {
      const normalized = normalizeExtractedPath(toolInput[param]);
      if (normalized) paths.push(normalized);
    }
  }

  // Extract from Bash command if present
  if (toolInput.command && typeof toolInput.command === 'string') {
    const cmdPaths = extractFromCommand(toolInput.command);
    paths.push(...cmdPaths);
  }

  return paths.filter(Boolean);
}

/**
 * Extract path-like segments from a Bash command string.
 *
 * Uses pipe-segment-aware command context: for filesystem commands (cd, cat, ls, rm, etc.)
 * bare blocked directory names are extracted with priority. For non-filesystem commands
 * (grep, echo, sed, etc.) only tokens that structurally look like paths are extracted,
 * preventing false positives on search terms and string arguments.
 *
 * @param {string} command - The command string
 * @returns {string[]} Array of extracted paths
 */
/**
 * Remove heredoc bodies from a command string.
 *
 * A heredoc body is data the command writes, not paths the command touches.
 * Both extraction passes below run over the whole command string, so without
 * this the text being written is scanned as if it were arguments — writing a
 * document that merely mentions a blocked directory name would be refused.
 *
 * @param {string} command - The raw command string
 * @returns {string} The command with every heredoc body removed
 */
function stripHeredocBodies(command) {
  // <<EOF | <<-EOF | <<'EOF' | <<"EOF", body ends at a line holding only the
  // delimiter (leading whitespace allowed, as <<- strips tabs).
  return command.replace(
    /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[\s\S]*?^[ \t]*\2[ \t]*$/gm,
    ' '
  );
}

function extractFromCommand(command) {
  if (!command || typeof command !== 'string') {
    return [];
  }

  const paths = [];

  // Heredoc bodies are written data, not arguments — drop them before any scan.
  const scanned = stripHeredocBodies(command);

  // First, extract quoted strings (preserve spaces in paths)
  const quotedPattern = /["']([^"']+)["']/g;
  let match;
  while ((match = quotedPattern.exec(scanned)) !== null) {
    const content = match[1];

    // Skip sed/awk regex expressions (s/pattern/replacement/flags)
    if (/^s[\/|@#,]/.test(content)) continue;

    // A quoted value right after an exclude flag is a path being skipped,
    // not one being read: find -not -path "./x/*", grep --exclude-dir "y".
    const preceding = scanned.slice(0, match.index).trim().split(/\s+/).pop();
    if (EXCLUDE_FLAGS.includes(preceding)) continue;

    if (looksLikePath(content)) {
      paths.push(normalizeExtractedPath(content));
    }
  }

  // Remove quoted strings for unquoted path extraction
  const withoutQuotes = scanned.replace(/["'][^"']*["']/g, ' ');

  // Split on whitespace and extract path-like tokens
  const tokens = withoutQuotes.split(/\s+/).filter(Boolean);

  // Track command context per pipe segment
  let commandName = null;
  let isFsCommand = false;
  let skipNextToken = false;
  let heredocDelimiter = null;
  let nextIsHeredocDelimiter = false;

  for (const token of tokens) {
    // Heredoc delimiter capture (after << or <<-)
    if (nextIsHeredocDelimiter) {
      heredocDelimiter = token.replace(/^['"]/, '').replace(/['"]$/, '');
      nextIsHeredocDelimiter = false;
      continue;
    }

    // Skip heredoc body content until closing delimiter
    if (heredocDelimiter) {
      if (token === heredocDelimiter) {
        heredocDelimiter = null;
      }
      continue;
    }

    // Detect heredoc start: <<EOF, <<'EOF', <<"EOF", <<-EOF
    if (token.startsWith('<<') && token.length > 2) {
      heredocDelimiter = token.replace(/^<<-?['"]?/, '').replace(/['"]?$/, '');
      continue;
    }
    if (token === '<<' || token === '<<-') {
      nextIsHeredocDelimiter = true;
      continue;
    }

    // Skip value after exclude flags (--exclude node_modules format)
    if (skipNextToken) {
      skipNextToken = false;
      continue;
    }

    // Reset command context at command/pipe boundaries
    if (token === '&&' || token === ';' || token.startsWith('|')) {
      commandName = null;
      isFsCommand = false;
      continue;
    }

    // Skip flags and shell operators
    if (isSkippableToken(token)) {
      if (EXCLUDE_FLAGS.includes(token)) {
        skipNextToken = true;
      }
      continue;
    }

    // Determine the command for this pipe segment (first non-flag token)
    if (commandName === null) {
      commandName = token.toLowerCase();
      isFsCommand = FILESYSTEM_COMMANDS.includes(commandName);
      // Skip the command word itself
      if (isCommandKeyword(token) || isFsCommand) continue;
      // Non-keyword command (e.g., ./script.sh) — fall through to path check
    }

    // For filesystem commands, extract blocked dir names with priority.
    // "cd build", "ls dist", "cat node_modules/..." — "build"/"dist" are paths here.
    if (isFsCommand && isBlockedDirName(token)) {
      paths.push(normalizeExtractedPath(token));
      continue;
    }

    // Skip common non-path command words
    if (isCommandKeyword(token)) continue;

    // Check if it looks like a path
    if (looksLikePath(token)) {
      paths.push(normalizeExtractedPath(token));
    }
  }

  return paths;
}

// Common blocked directory names that should be extracted even if they
// match command keywords (e.g., "build" is both a subcommand and a dir name)
// Keep in sync with DEFAULT_PATTERNS in pattern-matcher.cjs
const BLOCKED_DIR_NAMES = [
  'node_modules', '__pycache__', '.git', 'dist', 'build',
  '.next', '.nuxt', '.venv', 'venv', 'vendor', 'target', 'coverage'
];

/**
 * Check if token is exactly a blocked directory name
 * This takes priority over command keyword filtering
 *
 * @param {string} token - Token to check
 * @returns {boolean}
 */
function isBlockedDirName(token) {
  return BLOCKED_DIR_NAMES.includes(token);
}

/**
 * Check if a string looks like a file path
 *
 * @param {string} str - String to check
 * @returns {boolean}
 */
function looksLikePath(str) {
  if (!str || str.length < 2) return false;

  // A URL is a remote address, not a path on this machine. Without this a
  // clone URL ending in the VCS suffix reads as a blocked directory.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(str)) return false;

  // Contains path separator
  if (str.includes('/') || str.includes('\\')) return true;

  // Starts with relative path indicator
  if (str.startsWith('./') || str.startsWith('../')) return true;

  // Has file extension (likely a file)
  if (/\.\w{1,6}$/.test(str)) return true;

  // Looks like a directory path
  if (/^[a-zA-Z0-9_-]+\//.test(str)) return true;

  return false;
}

/**
 * Check if token should be skipped (flags, operators)
 *
 * @param {string} token - Token to check
 * @returns {boolean}
 */
function isSkippableToken(token) {
  // Flags
  if (token.startsWith('-')) return true;

  // Shell operators
  if (['|', '||', '&&', '>', '>>', '<', '<<', '&', ';'].includes(token)) return true;
  if (token.startsWith('|') || token.startsWith('>') || token.startsWith('<')) return true;
  if (token.startsWith('&')) return true;

  // Numeric values
  if (/^\d+$/.test(token)) return true;

  return false;
}

/**
 * Check if token is a common command keyword (not a path)
 *
 * @param {string} token - Token to check
 * @returns {boolean}
 */
function isCommandKeyword(token) {
  const keywords = [
    // Shell commands
    'echo', 'cat', 'ls', 'cd', 'rm', 'cp', 'mv', 'find', 'grep', 'head', 'tail',
    'wc', 'du', 'tree', 'touch', 'mkdir', 'rmdir', 'pwd', 'which', 'env', 'export',
    'source', 'bash', 'sh', 'zsh', 'true', 'false', 'test', 'xargs', 'tee', 'sort',
    'uniq', 'cut', 'tr', 'sed', 'awk', 'diff', 'chmod', 'chown', 'ln', 'file',

    // Package managers and their subcommands
    'npm', 'pnpm', 'yarn', 'bun', 'npx', 'pnpx', 'bunx', 'node',
    'run', 'build', 'test', 'lint', 'dev', 'start', 'install', 'ci', 'exec',
    'add', 'remove', 'update', 'publish', 'pack', 'init', 'create',

    // Build tools
    'tsc', 'esbuild', 'vite', 'webpack', 'rollup', 'turbo', 'nx',
    'jest', 'vitest', 'mocha', 'eslint', 'prettier',

    // Git
    'git', 'commit', 'push', 'pull', 'merge', 'rebase', 'checkout', 'branch',
    'status', 'log', 'diff', 'add', 'reset', 'stash', 'fetch', 'clone',

    // Docker
    'docker', 'compose', 'up', 'down', 'ps', 'logs', 'exec', 'container', 'image',

    // Misc
    'sudo', 'time', 'timeout', 'watch', 'make', 'cargo', 'python', 'python3', 'pip',
    'ruby', 'gem', 'go', 'rust', 'java', 'javac', 'mvn', 'gradle'
  ];

  return keywords.includes(token.toLowerCase());
}

/**
 * Normalize an extracted path
 * - Remove surrounding quotes
 * - Normalize path separators to forward slash
 *
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path
 */
function normalizeExtractedPath(path) {
  if (!path) return '';

  let normalized = path.trim();

  // Remove surrounding quotes
  if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.slice(1, -1);
  }

  // Strip shell metacharacters from edges (backticks, parens, braces)
  normalized = normalized.replace(/^[`({\[]+/, '').replace(/[`)};\]]+$/, '');

  // Normalize path separators to forward slash
  normalized = normalized.replace(/\\/g, '/');

  // Remove trailing slash for consistency
  if (normalized.endsWith('/') && normalized.length > 1) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

module.exports = {
  extractFromToolInput,
  extractFromCommand,
  looksLikePath,
  isSkippableToken,
  isCommandKeyword,
  isBlockedDirName,
  normalizeExtractedPath,
  BLOCKED_DIR_NAMES,
  EXCLUDE_FLAGS,
  FILESYSTEM_COMMANDS
};
