#!/usr/bin/env node
/**
 * SessionStart Hook - Initializes session environment with project detection
 *
 * Fires: Once per session (startup, resume, clear, compact)
 * Purpose: Load config, detect project info, persist to env vars, output context
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 *
 * Core detection logic extracted to lib/project-detector.cjs for OpenCode plugin reuse.
 */

// Crash wrapper
try {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const {
    loadConfig,
    writeEnv,
    updateSessionState,
    resolvePlanPath,
    getReportsPath,
    resolveNamingPattern,
    extractTaskListId,
    isHookEnabled
  } = require('./lib/kit-config-utils.cjs');
  const { createHookTimer, logHookCrash } = require('./lib/hook-logger.cjs');
  const { loadState } = require('./lib/session-state-manager.cjs');

  // Early exit if hook disabled in config
  if (!isHookEnabled('session-init')) {
    process.exit(0);
  }

  // Import shared project detection logic
  const {
    detectProjectType,
    detectPackageManager,
    detectFramework,
    getGitBranch,
    getGitRoot,
    getCodingLevelStyleName,
    getCodingLevelGuidelines,
    buildContextOutput
  } = require('./lib/project-detector.cjs');

/**
 * Detect if this session is running inside an Agent Team.
 * Scans ~/.claude/teams/ for active team configs and checks membership.
 * Note: Returns first team found — Claude Code supports one team per session.
 * Note: Team lifecycle (creation/cleanup) is managed by Claude Code, not this hook.
 * @returns {{ teamName: string, memberCount: number } | null}
 */
function detectAgentTeam() {
  try {
    const teamsDir = path.join(os.homedir(), '.claude', 'teams');
    if (!fs.existsSync(teamsDir)) return null;

    const teams = fs.readdirSync(teamsDir, { withFileTypes: true });
    for (const entry of teams) {
      if (!entry.isDirectory()) continue;
      const configPath = path.join(teamsDir, entry.name, 'config.json');
      if (!fs.existsSync(configPath)) continue;
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.members && config.members.length > 0) {
          return { teamName: entry.name, memberCount: config.members.length };
        }
      } catch { /* skip malformed configs */ }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Main hook execution
 */
async function main() {
  const timer = createHookTimer('session-init', { event: 'SessionStart' });
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    const data = stdin ? JSON.parse(stdin) : {};
    const envFile = process.env.CLAUDE_ENV_FILE;
    const source = data.source || 'unknown';
    const sessionId = data.session_id || null;

    const config = loadConfig();
    const sessionStateEnabled = config.hooks?.['session-state'] !== false;

    const detections = {
      type: detectProjectType(config.project?.type),
      pm: detectPackageManager(config.project?.packageManager),
      framework: detectFramework(config.project?.framework)
    };

    // Resolve plan - now returns { path, resolvedBy }
    const resolved = resolvePlanPath(null, config);

    if (sessionId) {
      updateSessionState(sessionId, prev => ({
        ...prev,
        sessionOrigin: process.cwd(),
        activePlan: resolved.resolvedBy === 'session' ? resolved.path : null,
        suggestedPlan: resolved.resolvedBy === 'branch' ? resolved.path : null,
        timestamp: Date.now(),
        source
      }));
    }

    // Reports path only uses active plans, not suggested ones
    const reportsPath = getReportsPath(resolved.path, resolved.resolvedBy, config.plan, config.paths);

    // Extract task list ID for Claude Code Tasks coordination (shared helper)
    const taskListId = extractTaskListId(resolved);

    // Keep startup metadata cheap. Expensive enrichment is intentionally deferred.
    const staticEnv = {
      nodeVersion: process.version,
      osPlatform: process.platform,
      gitBranch: getGitBranch(),
      gitRoot: getGitRoot(),
      user: process.env.USERNAME || process.env.USER || process.env.LOGNAME || os.userInfo().username,
      locale: process.env.LANG || '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      claudeSettingsDir: path.resolve(__dirname, '..')
    };

    // Compute base directory for absolute paths (Issue #327: use CWD for subdirectory support)
    // Git root is kept in staticEnv for reference, but CWD determines where files are created
    const baseDir = process.cwd();

    // Compute resolved naming pattern (date + issue resolved, {slug} kept as placeholder)
    const namePattern = resolveNamingPattern(config.plan, staticEnv.gitBranch);

    if (envFile) {
      // Session & plan config
      writeEnv(envFile, 'HS_SESSION_ID', sessionId || '');
      writeEnv(envFile, 'HS_PLAN_NAMING_FORMAT', config.plan.namingFormat);
      writeEnv(envFile, 'HS_PLAN_DATE_FORMAT', config.plan.dateFormat);
      writeEnv(envFile, 'HS_PLAN_ISSUE_PREFIX', config.plan.issuePrefix || '');
      writeEnv(envFile, 'HS_PLAN_REPORTS_DIR', config.plan.reportsDir);

      // NEW: Resolved naming pattern for DRY file naming in agents
      // Example: "251212-1830-GH-88-{slug}" or "251212-1830-{slug}"
      // Agents use: `{agent-type}-$HS_NAME_PATTERN.md` and substitute {slug}
      writeEnv(envFile, 'HS_NAME_PATTERN', namePattern);

      // Plan resolution
      writeEnv(envFile, 'HS_ACTIVE_PLAN', resolved.resolvedBy === 'session' ? resolved.path : '');
      writeEnv(envFile, 'HS_SUGGESTED_PLAN', resolved.resolvedBy === 'branch' ? resolved.path : '');

      // Claude Code Tasks integration - enables multi-session/subagent coordination
      // Task list ID = plan directory name (shared across all sessions working on same plan)
      if (taskListId) {
        writeEnv(envFile, 'CLAUDE_CODE_TASK_LIST_ID', taskListId);
      }

      // Paths - use absolute paths based on CWD for subdirectory workflow support (Issue #327)
      writeEnv(envFile, 'HS_GIT_ROOT', staticEnv.gitRoot || '');
      writeEnv(envFile, 'HS_REPORTS_PATH', path.join(baseDir, reportsPath));
      writeEnv(envFile, 'HS_DOCS_PATH', path.join(baseDir, config.paths.docs));
      writeEnv(envFile, 'HS_PLANS_PATH', path.join(baseDir, config.paths.plans));
      writeEnv(envFile, 'HS_PROJECT_ROOT', process.cwd());

      // Project detection
      writeEnv(envFile, 'HS_PROJECT_TYPE', detections.type || '');
      writeEnv(envFile, 'HS_PACKAGE_MANAGER', detections.pm || '');
      writeEnv(envFile, 'HS_FRAMEWORK', detections.framework || '');

      // NEW: Static environment info (so other hooks don't need to recompute)
      writeEnv(envFile, 'HS_NODE_VERSION', staticEnv.nodeVersion);
      writeEnv(envFile, 'HS_OS_PLATFORM', staticEnv.osPlatform);
      writeEnv(envFile, 'HS_GIT_BRANCH', staticEnv.gitBranch || '');
      writeEnv(envFile, 'HS_USER', staticEnv.user);
      writeEnv(envFile, 'HS_LOCALE', staticEnv.locale);
      writeEnv(envFile, 'HS_TIMEZONE', staticEnv.timezone);
      writeEnv(envFile, 'HS_CLAUDE_SETTINGS_DIR', staticEnv.claudeSettingsDir);

      // Locale config
      if (config.locale?.thinkingLanguage) {
        writeEnv(envFile, 'HS_THINKING_LANGUAGE', config.locale.thinkingLanguage);
      }
      if (config.locale?.responseLanguage) {
        writeEnv(envFile, 'HS_RESPONSE_LANGUAGE', config.locale.responseLanguage);
      }

      // Plan validation config (for /kit:plan validate, /kit:plan --hard, /kit:plan --parallel)
      const validation = config.plan?.validation || {};
      writeEnv(envFile, 'HS_VALIDATION_MODE', validation.mode || 'prompt');
      writeEnv(envFile, 'HS_VALIDATION_MIN_QUESTIONS', validation.minQuestions || 3);
      writeEnv(envFile, 'HS_VALIDATION_MAX_QUESTIONS', validation.maxQuestions || 8);
      writeEnv(envFile, 'HS_VALIDATION_FOCUS_AREAS', (validation.focusAreas || ['assumptions', 'risks', 'tradeoffs', 'architecture']).join(','));

      // Coding level config (for output style selection); -1 = disabled
      const codingLevel = config.codingLevel ?? -1;
      writeEnv(envFile, 'HS_CODING_LEVEL', codingLevel);
      if (codingLevel >= 0) {
        writeEnv(envFile, 'HS_CODING_LEVEL_STYLE', getCodingLevelStyleName(codingLevel));
      }

    }

    // Agent Teams detection — detect once, used for env vars and console output
    const teamInfo = detectAgentTeam();
    if (envFile && teamInfo) {
      writeEnv(envFile, 'HS_AGENT_TEAM', teamInfo.teamName);
      writeEnv(envFile, 'HS_AGENT_TEAM_MEMBERS', teamInfo.memberCount);
    }

    console.log(`Session ${source}. ${buildContextOutput(config, detections, resolved, staticEnv.gitRoot)}`);

    if (sessionStateEnabled && (source === 'startup' || source === 'compact')) {
      const previousState = loadState(process.cwd());
      if (previousState) {
        if (source === 'compact') {
          console.log('\n--- Session State (Post-Compaction Recovery) ---');
          console.log(previousState);
          console.log('--- End Session State ---\n');
          console.log('Context was compacted. Above is your last saved progress. Resume from where you left off.');
          console.log('IMPORTANT: Re-read active plan files and todo list. Do NOT re-do completed work.');
        } else {
          console.log('\n--- Previous Session State ---');
          console.log(previousState);
          console.log('--- End Session State ---\n');
          console.log('Review above state from your last session. Continue where you left off or start fresh.');
        }
      }
    }

    // Agent Teams: Show team context if running inside a team (uses cached result)
    if (teamInfo) {
      console.log(`[i] Agent Team detected: "${teamInfo.teamName}" (${teamInfo.memberCount} members)`);
      console.log(`    Team config: ~/.claude/teams/${teamInfo.teamName}/config.json`);
      console.log(`    Use /kit:autopilot for the end-to-end pipeline (add --pr for issue to PR).`);
    }

    // Info: Show git root when running from subdirectory (Issue #327: now supported)
    if (staticEnv.gitRoot && staticEnv.gitRoot !== process.cwd()) {
      console.log(`📁 Subdirectory mode: Plans/docs will be created in current directory`);
      console.log(`   Git root: ${staticEnv.gitRoot}`);
    }

    // MITIGATION: Issue #277 - Auto-compact can bypass AskUserQuestion approval gates
    // When context is compacted mid-workflow, the summarization may lose "pending approval" state.
    // This warning reminds Claude to verify if user approval was pending before proceeding.
    // Upstream bug: Claude Code CLI should preserve pending interactive state during compaction.
    if (source === 'compact') {
      console.log(`\n⚠️ CONTEXT COMPACTED - APPROVAL STATE CHECK:`);
      console.log(`If you were waiting for user approval via AskUserQuestion (e.g., Step 4 review gate),`);
      console.log(`you MUST re-confirm with the user before proceeding. Do NOT assume approval was given.`);
      console.log(`Use AskUserQuestion to verify: "Context was compacted. Please confirm approval to continue."`);
    }

    // Auto-inject coding level guidelines (if not disabled)
    const codingLevel = config.codingLevel ?? -1;
    const guidelines = getCodingLevelGuidelines(codingLevel);
    if (guidelines) {
      console.log(`\n${guidelines}`);
    }

    if (config.assertions?.length > 0) {
      console.log(`\nUser Assertions:`);
      config.assertions.forEach((assertion, i) => {
        console.log(`  ${i + 1}. ${assertion}`);
      });
    }

    timer.end({ status: 'ok', exit: 0, note: source || 'session-start' });
    process.exit(0);
  } catch (error) {
    console.error(`SessionStart hook error: ${error.message}`);
    logHookCrash('session-init', error, { event: 'SessionStart' });
    process.exit(0);
  }
  }

  main();
} catch (e) {
  try {
    const { logHookCrash } = require('./lib/hook-logger.cjs');
    logHookCrash('session-init', e, { event: 'SessionStart' });
  } catch (_) {}
  process.exit(0); // fail-open
}
