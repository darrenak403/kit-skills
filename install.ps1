[CmdletBinding()]
param(
    [string]$Ref = 'main',

    [string]$Destination,

    [switch]$Claude,

    [switch]$Codex,

    [switch]$All,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Targets
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$TargetPassedAsRef = @()
if ($Ref -match '^--(?:claude|codex|all)$') {
    # Windows PowerShell can bind a GNU-style flag in the first positional
    # parameter before ValueFromRemainingArguments sees it.
    $TargetPassedAsRef += $Ref
    $Ref = 'main'
}

$NamedTargets = @()
if ($Claude) { $NamedTargets += 'claude' }
if ($Codex) { $NamedTargets += 'codex' }
if ($All) { $NamedTargets += 'all' }
$RequestedTargets = @($TargetPassedAsRef + $NamedTargets)
if ($Targets) {
    $RequestedTargets += @($Targets | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) {
    $targetProject = if ([string]::IsNullOrWhiteSpace($Destination)) {
        (Get-Location).Path
    }
    else {
        [System.IO.Path]::GetFullPath($Destination)
    }
    $selectedTarget = if ($RequestedTargets -and $RequestedTargets.Count -gt 0) { $RequestedTargets[0].TrimStart('-') } else { 'all' }
    $nonce = [guid]::NewGuid().ToString('N')
    $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) "kit-skills-$nonce"
    $archive = "$temporaryRoot.zip"

    try {
        Invoke-WebRequest -Uri "https://github.com/darrenak403/kit-skills/archive/$Ref.zip" -OutFile $archive
        Expand-Archive -LiteralPath $archive -DestinationPath $temporaryRoot
        $installer = Get-ChildItem -LiteralPath $temporaryRoot -Recurse -File -Filter 'install.ps1' |
            Select-Object -First 1 -ExpandProperty FullName
        if ([string]::IsNullOrWhiteSpace($installer)) {
            throw "The downloaded archive does not contain install.ps1 for ref '$Ref'."
        }

        & $installer "--$selectedTarget" -Destination $targetProject
    }
    finally {
        if (Test-Path -LiteralPath $archive) {
            Remove-Item -LiteralPath $archive -Force
        }
        if (Test-Path -LiteralPath $temporaryRoot) {
            Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
        }
    }
    return
}

$SourceRoot = $PSScriptRoot
$DestinationRoot = if ([string]::IsNullOrWhiteSpace($Destination)) {
    (Get-Location).Path
}
else {
    [System.IO.Path]::GetFullPath($Destination)
}

if (Test-Path -LiteralPath $DestinationRoot -PathType Leaf) {
    throw "Destination '$DestinationRoot' must be a directory."
}

# Installing into the source checkout would replace the kit's own development
# environment; kit development uses the sandbox wrapper instead.
$normalizedSource = [System.IO.Path]::GetFullPath($SourceRoot).TrimEnd('\', '/')
$normalizedDestination = [System.IO.Path]::GetFullPath($DestinationRoot).TrimEnd('\', '/')
if ($normalizedDestination -eq $normalizedSource) {
    throw "Refusing to install into the kit source checkout '$SourceRoot'. Pass -Destination <project-directory>, or use tools/dev-install.ps1 for kit development."
}
if (-not (Test-Path -LiteralPath $DestinationRoot -PathType Container)) {
    New-Item -ItemType Directory -Path $DestinationRoot -Force | Out-Null
}

# Platform-specific policy deliberately lives here. Agent Markdown files provide
# only their identity, delegation description, and developer instructions.
$AgentPolicies = @{
    'researcher' = @{ Tier = 'cheap'; ReadOnly = $true; NeedsWebSearch = $true }
    'tester' = @{ Tier = 'cheap'; ReadOnly = $true; NeedsBash = $true }
    'project-manager' = @{ Tier = 'cheap'; ReadOnly = $false; ExtraTools = @('TaskCreate') }
    'fullstack-developer' = @{ Tier = 'standard'; ReadOnly = $false }
    'docs-manager' = @{ Tier = 'standard'; ReadOnly = $false }
    'ui-ux-designer' = @{ Tier = 'standard'; ReadOnly = $false; ExtraTools = @('WebSearch') }
    'git-manager' = @{ Tier = 'standard'; ReadOnly = $false }
    'brainstormer' = @{ Tier = 'standard'; ReadOnly = $true }
    'journal-writer' = @{ Tier = 'standard'; ReadOnly = $false }
    'planner' = @{ Tier = 'complex'; ReadOnly = $true }
    'debugger' = @{ Tier = 'complex'; ReadOnly = $false; ExtraTools = @('SlashCommand') }
    'code-reviewer' = @{ Tier = 'complex'; ReadOnly = $true }
    'code-simplifier' = @{ Tier = 'complex'; ReadOnly = $false }
    'advisor' = @{ Tier = 'elite'; ReadOnly = $true; NeedsBash = $true; NeedsWebSearch = $true }
    'kongming' = @{ Tier = 'elite'; ReadOnly = $true; NeedsBash = $true; NeedsWebSearch = $true }
}

# Write-capable agents declare an allowlist too. Omitting tools: inherits every
# tool in the host, which hands a haiku agent the Agent, WebFetch and
# NotebookEdit surface it never uses. These eleven are what every write-capable
# agent's own instructions exercise: the file and shell tools, Skill for the
# `Activate the <x> skill` step, and the task/message tools its Team Mode
# section uses. Per-agent additions go in ExtraTools.
$WriteAgentBaseTools = @(
    'Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash',
    'Skill', 'TaskList', 'TaskGet', 'TaskUpdate', 'SendMessage'
)

$ClaudeTiers = @{
    cheap = 'haiku'
    standard = 'sonnet'
    complex = 'opus'
    # The elite tier is the advisory one: its agents earn their keep with a
    # clean context and an advice-only prompt, not with a larger model. It
    # shares opus with `complex` deliberately.
    elite = 'opus'
}

$CodexTiers = @{
    cheap = @{ Model = 'gpt-5.6-luna'; Effort = 'low' }
    standard = @{ Model = 'gpt-5.6-terra'; Effort = 'medium' }
    complex = @{ Model = 'gpt-5.6-terra'; Effort = 'high' }
    elite = @{ Model = 'gpt-5.6-sol'; Effort = 'high' }
}

# Declared compatibility boundary for generated artifacts. Both CLIs support
# custom agents but neither portable artifact assumes task-board tools, nested
# delegation, or interactive questions from a subagent.
$RuntimeCapabilities = @{
    claude = @{ Agent = $true; SubagentQuestions = $false; TaskBoard = $false; NestedDelegation = $false; ConfigDirectory = '.claude' }
    codex  = @{ Agent = $true; SubagentQuestions = $false; TaskBoard = $false; NestedDelegation = $false; ConfigDirectory = '.agents' }
}

function Show-Usage {
    Write-Output 'Usage: .\install.ps1 --claude | --codex | --all [-Destination <project-directory>]'
    Write-Output 'The destination defaults to the current directory. Kit developers: use tools/dev-install.ps1.'
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )

    # Codex reads hooks.json with a strict JSON parser that rejects a UTF-8 BOM.
    # Windows PowerShell 5.1 adds one for Set-Content -Encoding utf8, so use the
    # .NET writer explicitly for all generated Codex config artifacts.
    [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Resolve-Targets {
    param([string[]]$RawTargets)

    if (-not $RawTargets -or $RawTargets.Count -eq 0) {
        throw 'Choose one target: --claude, --codex, or --all.'
    }

    $normalized = @($RawTargets | ForEach-Object { $_.Trim().ToLowerInvariant().TrimStart('-') })
    if ($normalized.Count -ne 1 -or $normalized[0] -notin @('claude', 'codex', 'all')) {
        throw 'Use exactly one target: --claude, --codex, or --all.'
    }

    if ($normalized[0] -eq 'all') {
        return @('claude', 'codex')
    }

    return $normalized
}

function Read-AgentSource {
    param([System.IO.FileInfo]$File)

    $content = [System.IO.File]::ReadAllText($File.FullName)
    $match = [regex]::Match($content, '(?s)\A---\s*\r?\n(?<frontmatter>.*?)\r?\n---\s*\r?\n(?<body>.*)\z')
    if (-not $match.Success) {
        throw "Agent source '$($File.Name)' must start with YAML front matter."
    }

    $frontmatterLines = $match.Groups['frontmatter'].Value -split "`r?`n"
    $metadata = @{}
    $lineIndex = 0
    while ($lineIndex -lt $frontmatterLines.Count) {
        $line = $frontmatterLines[$lineIndex]
        if ([string]::IsNullOrWhiteSpace($line)) { $lineIndex++; continue }
        $entry = [regex]::Match($line, '^(?<key>[A-Za-z][A-Za-z0-9_-]*):\s*(?<value>.*)$')
        if (-not $entry.Success) {
            throw "Unsupported front matter in '$($File.Name)': $line"
        }
        $key = $entry.Groups['key'].Value
        $value = $entry.Groups['value'].Value.Trim()
        $lineIndex++

        if ($value -in @('>-', '>', '|-', '|')) {
            # YAML folded (>) / literal (|) block scalar: fold or preserve the
            # indented lines that follow until the next top-level key.
            $blockLines = @()
            while ($lineIndex -lt $frontmatterLines.Count -and $frontmatterLines[$lineIndex] -match '^\s+\S') {
                $blockLines += $frontmatterLines[$lineIndex].Trim()
                $lineIndex++
            }
            $value = if ($value -in @('|', '|-')) { $blockLines -join "`n" } else { $blockLines -join ' ' }
        }
        else {
            # Unwrap exactly one pair of surrounding quotes and undo that
            # style's escapes. .Trim() would eat every leading/trailing quote
            # and leave YAML escape sequences ('' or \") in the value.
            if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
                try { $value = $value | ConvertFrom-Json }
                catch { $value = $value.Substring(1, $value.Length - 2) }
            }
            elseif ($value.Length -ge 2 -and $value.StartsWith("'") -and $value.EndsWith("'")) {
                $value = $value.Substring(1, $value.Length - 2).Replace("''", "'")
            }
        }

        $metadata[$key] = $value
    }

    foreach ($required in @('name', 'description')) {
        if (-not $metadata.ContainsKey($required) -or [string]::IsNullOrWhiteSpace($metadata[$required])) {
            throw "Agent source '$($File.Name)' is missing required '$required' front matter."
        }
    }

    return [pscustomobject]@{
        Name = $metadata['name']
        Description = $metadata['description']
        Instructions = $match.Groups['body'].Value.Trim()
    }
}

function Get-AgentSources {
    $sources = @(Get-ChildItem -Path (Join-Path $SourceRoot 'agents') -File -Filter '*.md' | ForEach-Object { Read-AgentSource $_ })
    if ($sources.Count -eq 0) {
        throw 'No agent Markdown sources were found in agents/.'
    }

    $names = @($sources | ForEach-Object Name)
    $duplicates = @($names | Group-Object | Where-Object Count -gt 1 | ForEach-Object Name)
    if ($duplicates.Count -gt 0) {
        throw "Duplicate agent names: $($duplicates -join ', ')."
    }

    foreach ($agent in $sources) {
        if (-not $AgentPolicies.ContainsKey($agent.Name)) {
            throw "No install policy is defined for agent '$($agent.Name)'."
        }
        $tier = $AgentPolicies[$agent.Name].Tier
        if (-not $ClaudeTiers.ContainsKey($tier) -or -not $CodexTiers.ContainsKey($tier)) {
            throw "Agent '$($agent.Name)' references tier '$tier', which is missing from `$ClaudeTiers or `$CodexTiers."
        }
        # Capability flags only reach the generated agent through the read-only branch's
        # tools: allowlist. On a write-capable policy they would be dropped without a word.
        $policy = $AgentPolicies[$agent.Name]
        if ($policy.ContainsKey('ExtraTools') -and $policy.ReadOnly) {
            throw "Agent '$($agent.Name)' sets ExtraTools but is ReadOnly; read-only agents opt in through the capability flags instead."
        }
        foreach ($capability in @('NeedsBash', 'NeedsWebSearch')) {
            if ($policy.ContainsKey($capability) -and $policy[$capability] -and -not $policy.ReadOnly) {
                throw "Agent '$($agent.Name)' sets $capability but is not ReadOnly; capability flags only apply to read-only agents."
            }
        }
    }
    foreach ($configuredName in $AgentPolicies.Keys) {
        if ($configuredName -notin $names) {
            throw "Install policy '$configuredName' has no Markdown source."
        }
    }

    return $sources
}

function ConvertTo-TomlString {
    param([string]$Value)
    return ($Value | ConvertTo-Json -Compress)
}

function ConvertTo-TomlMultilineBasic {
    param([string]$Value)
    # TOML multi-line basic strings ("""...""") still require escaping: a raw
    # backslash (common in markdown, e.g. grep \| patterns) is an invalid
    # escape sequence, and an embedded """ would close the string early.
    $escaped = $Value.Replace('\', '\\')
    return $escaped.Replace('"""', '""\"')
}

function ConvertTo-RuntimeInstructions {
    param([string]$Text, [ValidateSet('claude', 'codex')][string]$Runtime)

    $capabilities = $RuntimeCapabilities[$Runtime]
    $output = $Text
    # Semantic directives are the portable source contract. They deliberately
    # name an intent, never a provider tool. Both supported CLIs currently use
    # the parent-relay fallbacks declared by the capability matrix.
    $directiveFallbacks = @{
        'ask-user' = if ($capabilities.SubagentQuestions) { 'ask the user' } else { 'return NEEDS_USER_INPUT with a structured question to the parent' }
        'delegate' = if ($capabilities.NestedDelegation) { 'delegate the bounded subtask' } else { 'return a delegation request and evidence to the parent' }
        'track-work' = if ($capabilities.TaskBoard) { 'update the work tracker' } else { 'report status and blockers to the parent' }
        'message-peer' = if ($capabilities.Agent) { 'send the structured result to the parent for routing' } else { 'include the structured result in the final response' }
    }
    foreach ($directive in $directiveFallbacks.Keys) {
        $output = $output.Replace("{{kit:$directive}}", $directiveFallbacks[$directive])
    }
    $output = $output -replace '(?-i:AskUserQuestion)', 'structured relay to the parent'
    $output = $output -replace '(?-i:TaskList\(\))', 'the parent-provided work item'
    $output = $output -replace '(?-i:TaskGet)', 'read the parent-provided work item'
    $output = $output -replace '(?-i:TaskCreate)', 'record planned work for the parent'
    $output = $output -replace '(?-i:TaskUpdate)', 'report status to the parent'
    $output = $output -replace '(?-i:SendMessage)', 'send a structured result to the parent'
    $output = $output -replace '(?-i:Task\(([^)]*)\))', 'parent-coordinated delegation ($1)'
    $output = $output -replace '(?-i:\bTask(List|Update|Create)\b)', 'parent coordination'
    $output = $output -replace '(?-i:\bSendMessage\b)', 'structured parent relay'
    $output = $output -replace '(?-i:\bTask\b)', 'parent coordinator'
    $output = $output -replace '(?-i:CLAUDE_[A-Z0-9_]+)', 'runtime session context'
    if ($Runtime -eq 'codex') { $output = $output -replace '\.claude', $capabilities.ConfigDirectory }
    if ($Runtime -eq 'claude') { $output = $output -replace '\.codex', $capabilities.ConfigDirectory }
    return $output
}

function Adapt-CodexRuntimeAssets {
    param([string]$Root)
    $runtimeAssetExtensions = @('.py', '.cjs', '.js', '.sh', '.ps1', '.txt', '.json', '.yaml', '.yml', '.csv', '.svg', '.html')
    $providerPattern = '(?-i:AskUserQuestion|\bTask(Get|List|Update|Create)?\b|SendMessage|CLAUDE_|\.claude)'
    foreach ($file in Get-ChildItem -LiteralPath $Root -Recurse -File) {
        if ($file.Extension -notin $runtimeAssetExtensions) { continue }
        $text = [System.IO.File]::ReadAllText($file.FullName)
        if ($text -match $providerPattern) {
            # Keep referenced scripts/assets. Only runtime location/environment
            # constants are adapted; tool words in executable code are retained
            # as data, not rendered as agent instructions.
            $adapted = $text.Replace('.claude', '.agents').Replace('CLAUDE_PROJECT_DIR', 'HS_PROJECT_DIR').Replace('CLAUDE_ROOT', 'HS_RUNTIME_ROOT')
            if ($adapted -ne $text) {
                [System.IO.File]::WriteAllText($file.FullName, $adapted, [System.Text.UTF8Encoding]::new($false))
            }
        }
    }
}

function Render-CodexSkillPayload {
    param([string]$Root)
    foreach ($file in Get-ChildItem -LiteralPath $Root -Recurse -File -Filter '*.md') {
        $before = [System.IO.File]::ReadAllText($file.FullName)
        $after = ConvertTo-RuntimeInstructions $before 'codex'
        if ($after -ne $before) { [System.IO.File]::WriteAllText($file.FullName, $after, [System.Text.UTF8Encoding]::new($false)) }
    }
}

function Copy-SourceDirectory {
    param(
        [string]$SourceName,
        [string]$DestinationRoot
    )

    $source = Join-Path $SourceRoot $SourceName
    if (-not (Test-Path -LiteralPath $source -PathType Container)) {
        throw "Required source directory '$SourceName/' is missing."
    }
    Copy-Item -LiteralPath $source -Destination $DestinationRoot -Recurse -Force
}

function Copy-ClaudeHookScripts {
    param([string]$DestinationRoot)

    Copy-SourceDirectory 'hooks' $DestinationRoot

    # hooks/hooks.json is the Claude Code plugin manifest: it resolves paths through
    # ${CLAUDE_PLUGIN_ROOT}, which only exists under a plugin install. A source install
    # wires its hooks through the generated settings.json / .codex/hooks.json instead,
    # so shipping the manifest would leave a stale, unresolvable copy behind.
    $manifest = Join-Path (Join-Path $DestinationRoot 'hooks') 'hooks.json'
    if (Test-Path -LiteralPath $manifest -PathType Leaf) {
        Remove-Item -LiteralPath $manifest -Force
    }

    # Runtime hook logs from the source checkout are machine-local telemetry,
    # not kit content; shipping them would leak the packager's session data.
    $runtimeLogs = Join-Path (Join-Path $DestinationRoot 'hooks') '.logs'
    if (Test-Path -LiteralPath $runtimeLogs -PathType Container) {
        Remove-Item -LiteralPath $runtimeLogs -Recurse -Force
    }
}

function Copy-CodexHookScripts {
    param([string]$DestinationRoot)

    # Codex wrappers deliberately do not reuse the Claude hook entrypoints.  The
    # two runtimes have different payload and response contracts (in particular,
    # CLAUDE_ENV_FILE and hookSpecificOutput are Claude-only).  Shared, side-effect
    # free normalization lives in hooks/runtime/core.cjs; each wrapper owns its
    # runtime transport.
    $source = Join-Path (Join-Path (Join-Path $SourceRoot 'hooks') 'runtime') 'codex'
    $destination = Join-Path $DestinationRoot 'hooks'
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $destination -Recurse -Force
    Copy-Item -LiteralPath (Join-Path (Join-Path (Join-Path $SourceRoot 'hooks') 'runtime') 'core.cjs') -Destination (Join-Path $destination 'core.cjs') -Force
    # The existing hook entrypoints remain the single implementation of guard
    # decisions and lifecycle work. Codex adapters translate their transport.
    $shared = Join-Path $destination 'shared'
    Copy-Item -LiteralPath (Join-Path $SourceRoot 'hooks') -Destination $shared -Recurse -Force
    Remove-Item -LiteralPath (Join-Path $shared 'runtime') -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $shared 'hooks.json') -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $shared '.logs') -Recurse -Force -ErrorAction SilentlyContinue
}

function Prune-InstalledPayload {
    param([string]$Root)

    # Dev-only payload that must never reach an installed project: test suites,
    # bytecode caches, and tooling scratch that only make sense in the source
    # checkout. This is an explicit allow/deny list (NOT .gitignore-based) so the
    # prune rule can't silently widen when someone edits an unrelated ignore file.
    #
    # Keep-list wins over every prune pattern below: hooks/scout-block/vendor/ is
    # `require()`d at runtime by hooks/scout-block/pattern-matcher.cjs and must
    # survive even if it ever contains a nested test-looking filename. This
    # function is called with $Root already pointing at the copied hooks/,
    # skills/, or scripts/ directory, so patterns match paths RELATIVE TO that
    # directory (no leading 'hooks\', 'skills\', or 'scripts\' segment).
    $keepPatterns = @(
        '(^|\\)scout-block\\vendor(\\|$)'
    )

    $prunePatterns = @(
        # Test suites: hooks/scout-block/ itself uses tests/ (not __tests__/), so
        # this only ever matches dev-only __tests__ dirs elsewhere (e.g. hooks/lib/).
        '(^|\\)__tests__(\\|$)',
        '\.test\.[^\\]+$',
        '_test\.py$',
        'test_[^\\]+\.py$',
        'test-[^\\]+\.sh$',
        # Dev-only tests/ dirs: skill scripts/tests/ (e.g. kit-codex/scripts/tests/)
        # and hooks/scout-block/tests/ (its dev suite; hooks root only).
        '(^|\\)scripts\\tests(\\|$)',
        '(^|\\)scout-block\\tests(\\|$)',
        # Python bytecode caches.
        '(^|\\)__pycache__(\\|$)',
        '\.pyc$',
        # Dev-only tooling scratch that ships no runtime value.
        '(^|\\)kit-skill-creator\\eval-viewer(\\|$)',
        '(^|\\)kit-tech-graph\\fixtures(\\|$)',
        '(^|\\)kit-tech-graph\\scripts\\test-all-styles\.sh$'
    )

    if (-not (Test-Path -LiteralPath $Root -PathType Container)) { return }

    $rootFull = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\', '/')
    $items = @(Get-ChildItem -LiteralPath $Root -Recurse -Force)
    foreach ($item in $items) {
        if (-not (Test-Path -LiteralPath $item.FullName)) { continue } # already removed as part of a pruned parent
        $relative = $item.FullName.Substring($rootFull.Length).TrimStart('\', '/')

        $kept = $false
        foreach ($keep in $keepPatterns) {
            if ($relative -match $keep) { $kept = $true; break }
        }
        if ($kept) { continue }

        foreach ($prune in $prunePatterns) {
            if ($relative -match $prune) {
                Remove-Item -LiteralPath $item.FullName -Recurse -Force
                break
            }
        }
    }
}

function Normalize-CodexSkillMetadata {
    param([string]$Destination)

    $skillsRoot = Join-Path $Destination 'skills'
    foreach ($skillFile in Get-ChildItem -Path $skillsRoot -Recurse -File -Filter 'SKILL.md') {
        $content = [System.IO.File]::ReadAllText($skillFile.FullName)
        $match = [regex]::Match($content, '(?s)\A---\s*\r?\n(?<frontmatter>.*?)\r?\n---\s*\r?\n(?<body>.*)\z')
        if (-not $match.Success) {
            throw "Skill source '$($skillFile.FullName)' must start with YAML front matter."
        }

        $name = [regex]::Match($match.Groups['frontmatter'].Value, '(?m)^name:\s*(?<value>.+?)\s*$')
        $description = [regex]::Match($match.Groups['frontmatter'].Value, '(?m)^description:\s*(?<value>.+?)\s*$')
        if (-not $name.Success -or -not $description.Success) {
            throw "Skill source '$($skillFile.FullName)' must define name and description."
        }

        # Claude uses the kit: namespace and accepts argument-hint. Codex namespaces
        # plugin skills itself and only accepts its documented skill metadata keys.
        $codexName = ($name.Groups['value'].Value.Trim().Trim('"').Trim("'") -replace '^[^:]+:', '')
        if ($codexName -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') {
            throw "Codex skill name '$codexName' derived from '$($skillFile.FullName)' must be hyphen-case."
        }

        # Codex requires a scalar description. Convert YAML folded/literal
        # descriptions ("description: >-") to one normalized line instead
        # of copying the YAML indicator as the description value.
        $codexDescription = $description.Groups['value'].Value.Trim()
        if ($codexDescription -match '^>[+-]?$|^\|[+-]?$') {
            $frontmatterLines = $match.Groups['frontmatter'].Value -split "`r?`n"
            $descriptionIndex = [Array]::FindIndex([string[]]$frontmatterLines, [Predicate[string]]{ param($line) $line -match '^description:\s*' })
            $continuation = @()
            for ($i = $descriptionIndex + 1; $i -lt $frontmatterLines.Count -and $frontmatterLines[$i] -match '^\s+'; $i++) {
                $continuation += $frontmatterLines[$i].Trim()
            }
            $codexDescription = $continuation -join ' '
        }
        if ([string]::IsNullOrWhiteSpace($codexDescription)) {
            throw "Codex skill description '$($skillFile.FullName)' cannot be empty."
        }

        $normalized = @(
            '---',
            "name: $codexName",
            "description: $codexDescription",
            '---',
            '',
            $match.Groups['body'].Value.TrimEnd(),
            ''
        ) -join "`n"
        [System.IO.File]::WriteAllText($skillFile.FullName, $normalized, [System.Text.UTF8Encoding]::new($false))
    }
}

function Write-ClaudeAgent {
    param(
        [pscustomobject]$Agent,
        [hashtable]$Policy,
        [string]$Destination
    )

    $needsBash = $Policy.ContainsKey('NeedsBash') -and $Policy['NeedsBash']
    $needsWebSearch = $Policy.ContainsKey('NeedsWebSearch') -and $Policy['NeedsWebSearch']
    $frontMatter = @(
        '---',
        "name: $($Agent.Name)",
        # JSON string encoding is valid YAML double-quoted style; descriptions
        # routinely contain ': ' and quotes, which break plain scalars.
        "description: $($Agent.Description | ConvertTo-Json -Compress)",
        "model: $($ClaudeTiers[$Policy.Tier])"
    )

    if ($Policy.ReadOnly) {
        # tools: is an allowlist, so read-only agents get the base three plus any
        # capability the policy opts into. WebSearch adds outbound egress but no
        # write path: disallowedTools below still blocks every workspace mutation.
        $tools = @('Read', 'Glob', 'Grep')
        if ($needsBash) { $tools += 'Bash' }
        if ($needsWebSearch) { $tools += 'WebSearch' }
        $frontMatter += "tools: $($tools -join ', ')"
        $frontMatter += 'disallowedTools: Write, Edit'
    }
    else {
        # No disallowedTools here: these agents exist to change the workspace.
        $tools = $WriteAgentBaseTools
        if ($Policy.ContainsKey('ExtraTools')) { $tools += $Policy['ExtraTools'] }
        $frontMatter += "tools: $($tools -join ', ')"
    }
    $frontMatter += '---'

    $instructions = (ConvertTo-RuntimeInstructions $Agent.Instructions 'claude').Replace('{runtime.config_dir}', '.claude').Replace('{runtime.skills_dir}', '.claude/skills').Replace('{runtime.rules_dir}', '.claude/rules')
    $output = ($frontMatter -join "`n") + "`n`n" + $instructions + "`n"
    Set-Content -LiteralPath (Join-Path $Destination "$($Agent.Name).md") -Value $output -Encoding utf8
}

function Write-CodexAgent {
    param(
        [pscustomobject]$Agent,
        [hashtable]$Policy,
        [string]$Destination
    )

    $tier = $CodexTiers[$Policy.Tier]
    $sandbox = if ($Policy.ReadOnly) { 'read-only' } else { 'workspace-write' }
    $output = @(
        "name = $(ConvertTo-TomlString $Agent.Name)",
        "description = $(ConvertTo-TomlString (ConvertTo-RuntimeInstructions $Agent.Description 'codex'))",
        "model = $(ConvertTo-TomlString $tier.Model)",
        "model_reasoning_effort = $(ConvertTo-TomlString $tier.Effort)",
        "sandbox_mode = $(ConvertTo-TomlString $sandbox)",
        'developer_instructions = """',
        (ConvertTo-TomlMultilineBasic (ConvertTo-RuntimeInstructions $Agent.Instructions 'codex').Replace('{runtime.config_dir}', '.agents').Replace('{runtime.skills_dir}', '.agents/skills').Replace('{runtime.rules_dir}', '.agents/rules')),
        '"""',
        ''
    ) -join "`n"
    Write-Utf8NoBom (Join-Path $Destination "$($Agent.Name).toml") $output
}

function Read-McpConfig {
    # An existing project config is user-owned and canonical for this install;
    # otherwise use the kit seed. This prevents Codex compilation from dropping
    # project MCP servers while root .mcp.json is preserved.
    $destinationPath = Join-Path $DestinationRoot '.mcp.json'
    $path = if (Test-Path -LiteralPath $destinationPath -PathType Leaf) { $destinationPath } else { Join-Path $SourceRoot '.mcp.json' }
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw 'Missing required .mcp.json source.'
    }
    try {
        return (Get-Content -LiteralPath $path -Raw | ConvertFrom-Json)
    }
    catch {
        throw "Invalid .mcp.json: $($_.Exception.Message)"
    }
}

function Install-RootMcpConfig {
    param([string[]]$Targets)

    # Claude Code reads .mcp.json from the project root by
    # convention (like .kit.json); an end user has no reason to know that
    # convention exists, so shipping the kit's default server list is the only
    # way MCP works out of the box for them.
    $source = Join-Path $SourceRoot '.mcp.json'
    $destination = Join-Path $DestinationRoot '.mcp.json'
    if (Test-Path -LiteralPath $destination -PathType Leaf) {
        Write-Host "Kept existing $destination"
        return
    }
    Copy-Item -LiteralPath $source -Destination $destination
    Write-Host "Installed $destination"
}

function Resolve-RootKitSchemaPath {
    param([string[]]$Targets)

    # .kit.json stays at the project root (hooks walk up to the nearest .kit.json
    # to locate the project root), but the schema file itself now lives inside
    # each installed target directory. When both targets are installed the copies
    # are byte-identical (both freshly copied from the same source each run), so
    # picking claude first is an arbitrary but stable tie-break, not drift.
    if ($Targets -contains 'claude') { return './.claude/schemas/kit-config.schema.json' }
    return './.codex/schemas/kit-config.schema.json'
}

function Install-TargetKitSchema {
    param([string]$TargetRoot)

    # Kit-owned like the rest of .claude/.codex, not user-owned like .kit.json: always
    # refreshed so it tracks the hooks contract of the installed kit.
    $source = Join-Path (Join-Path $SourceRoot 'schemas') 'kit-config.schema.json'
    $destinationDir = Join-Path $TargetRoot 'schemas'
    New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination (Join-Path $destinationDir 'kit-config.schema.json') -Force
}

function Resolve-RootKitConfigPath {
    # A project that already carries its own .kit.json owns the guard-rail settings;
    # the source copy is only the seed for a project that has none yet.
    $destinationPath = Join-Path $DestinationRoot '.kit.json'
    if (Test-Path -LiteralPath $destinationPath -PathType Leaf) {
        return $destinationPath
    }
    return (Join-Path $SourceRoot '.kit.json')
}

function Read-RootKitConfig {
    $path = Resolve-RootKitConfigPath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw 'Missing required .kit.json root kit configuration.'
    }
    try {
        return (Get-Content -LiteralPath $path -Raw | ConvertFrom-Json)
    }
    catch {
        throw "Invalid '$path': $($_.Exception.Message)"
    }
}

function Set-RootKitConfigSchema {
    param(
        [string]$Path,
        [string]$SchemaPath
    )

    $config = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    if ($null -ne $config.PSObject.Properties['$schema']) {
        $config.'$schema' = $SchemaPath
    }
    else {
        $config | Add-Member -Force -NotePropertyName '$schema' -NotePropertyValue $SchemaPath
    }
    $config | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $Path
}

function Install-RootKitConfig {
    param([string[]]$Targets)

    $source = Join-Path $SourceRoot '.kit.json'
    $destination = Join-Path $DestinationRoot '.kit.json'
    $schemaPath = Resolve-RootKitSchemaPath $Targets

    if (Test-Path -LiteralPath $destination -PathType Leaf) {
        $existing = Get-Content -LiteralPath $destination -Raw | ConvertFrom-Json
        $existingSchema = $existing.PSObject.Properties['$schema']
        # './schemas/...' is the old root-relative layout; the per-target path for
        # the OTHER target is also stale once the selected targets change.
        $legacyPaths = @(
            './schemas/kit-config.schema.json',
            './.claude/schemas/kit-config.schema.json',
            './.codex/schemas/kit-config.schema.json'
        )
        if ($null -ne $existingSchema -and $existingSchema.Value -in $legacyPaths -and $existingSchema.Value -ne $schemaPath) {
            Set-RootKitConfigSchema $destination $schemaPath
            Write-Host "Corrected `$schema in $destination"
            return
        }
        Write-Host "Kept existing $destination"
        return
    }

    # The hooks locate the project root by walking up to the nearest .kit.json, so an
    # installed project without one silently runs with every guard rail defaulted.
    Copy-Item -LiteralPath $source -Destination $destination
    Set-RootKitConfigSchema $destination $schemaPath
    Write-Host "Installed $destination"
}

function Assert-HooksConfig {
    param([object]$Config)

    $hooksProperty = $Config.PSObject.Properties['hooks']
    if ($null -eq $hooksProperty) { return }
    if ($hooksProperty.Value -isnot [pscustomobject]) {
        throw '.kit.json hooks must be an object.'
    }

    foreach ($hook in $hooksProperty.Value.PSObject.Properties) {
        if ($hook.Value -isnot [bool]) {
            throw "hooks.$($hook.Name) must be a boolean."
        }
    }
}

function Write-SelfIgnoreFile {
    param([string]$Directory)

    # A directory-local ignore keeps generated output out of the repository
    # without editing the project's own .gitignore.
    $lines = @(
        '# Generated by kit-skills. Keeps this directory out of the project repository.',
        '*'
    )
    Set-Content -LiteralPath (Join-Path $Directory '.gitignore') -Value ($lines -join "`n") -Encoding utf8
}

function Get-PlansDirectorySetting {
    param([object]$KitConfig)

    $paths = $KitConfig.PSObject.Properties['paths']
    if ($null -eq $paths -or $null -eq $paths.Value) { return 'plans' }
    $plans = $paths.Value.PSObject.Properties['plans']
    if ($null -eq $plans -or [string]::IsNullOrWhiteSpace([string]$plans.Value)) { return 'plans' }
    return [string]$plans.Value
}

function Ensure-PlanGitIgnores {
    param([object]$KitConfig)

    $relativeDirectories = @(
        Get-PlansDirectorySetting $KitConfig
        'docs/journals'
    )
    foreach ($relative in $relativeDirectories) {
        $directory = Join-Path $DestinationRoot $relative
        if (-not (Test-Path -LiteralPath $directory -PathType Container)) {
            New-Item -ItemType Directory -Force -Path $directory | Out-Null
        }
        # An existing ignore file is user-owned configuration; never overwrite it.
        if (-not (Test-Path -LiteralPath (Join-Path $directory '.gitignore') -PathType Leaf)) {
            Write-SelfIgnoreFile $directory
            Write-Host "Seeded $directory/.gitignore"
        }
    }
}

function Write-CodexConfig {
    param(
        [object]$McpConfig,
        [string]$Destination
    )

    $lines = @(
        '[agents]',
        'max_concurrent_threads_per_session = 4',
        ''
    )

    if ($null -ne $McpConfig.mcpServers) {
        foreach ($serverProperty in $McpConfig.mcpServers.PSObject.Properties) {
            $serverName = $serverProperty.Name.Replace('\', '\\').Replace('"', '\"')
            $server = $serverProperty.Value
            $commandProperty = $server.PSObject.Properties['command']
            if ($null -eq $commandProperty -or [string]::IsNullOrWhiteSpace([string]$commandProperty.Value)) {
                throw "MCP server '$($serverProperty.Name)' is not a stdio server and cannot be represented in Codex config.toml. Keep its canonical definition in .mcp.json and add an explicit Codex adapter before installing."
            }
            $supported = @('command', 'args', 'env', 'cwd', 'timeout', 'timeoutSeconds', 'startupTimeout')
            $unknown = @($server.PSObject.Properties.Name | Where-Object { $_ -notin $supported })
            if ($unknown.Count -gt 0) {
                throw "MCP server '$($serverProperty.Name)' has unsupported Codex fields: $($unknown -join ', '). Refusing to silently drop MCP configuration."
            }

            $lines += "[mcp_servers.`"$serverName`"]"
            $lines += "command = $(ConvertTo-TomlString ([string]$commandProperty.Value))"
            $argsProperty = $server.PSObject.Properties['args']
            if ($null -ne $argsProperty -and $null -ne $argsProperty.Value) {
                $arguments = @($argsProperty.Value | ForEach-Object { ConvertTo-TomlString ([string]$_) })
                $lines += "args = [$($arguments -join ', ')]"
            }
            $envConfigProperty = $server.PSObject.Properties['env']
            if ($null -ne $envConfigProperty -and $null -ne $envConfigProperty.Value) {
                $lines += "[mcp_servers.`"$serverName`".env]"
                foreach ($envProperty in $envConfigProperty.Value.PSObject.Properties) {
                    $envName = $envProperty.Name.Replace('\', '\\').Replace('"', '\"')
                    $lines += "`"$envName`" = $(ConvertTo-TomlString ([string]$envProperty.Value))"
                }
            }
            $cwdProperty = $server.PSObject.Properties['cwd']
            if ($null -ne $cwdProperty -and -not [string]::IsNullOrWhiteSpace([string]$cwdProperty.Value)) {
                $lines += "cwd = $(ConvertTo-TomlString ([string]$cwdProperty.Value))"
            }
            $timeoutProperty = $server.PSObject.Properties['timeout']
            if ($null -eq $timeoutProperty) { $timeoutProperty = $server.PSObject.Properties['timeoutSeconds'] }
            if ($null -ne $timeoutProperty -and $null -ne $timeoutProperty.Value) {
                $seconds = 0.0
                if (-not [double]::TryParse([string]$timeoutProperty.Value, [ref]$seconds) -or $seconds -le 0) { throw "MCP server '$($serverProperty.Name)' timeout must be a positive number of seconds." }
                $lines += "tool_timeout_sec = $seconds"
            }
            $startupProperty = $server.PSObject.Properties['startupTimeout']
            if ($null -ne $startupProperty -and $null -ne $startupProperty.Value) {
                $seconds = 0.0
                if (-not [double]::TryParse([string]$startupProperty.Value, [ref]$seconds) -or $seconds -le 0) { throw "MCP server '$($serverProperty.Name)' startupTimeout must be a positive number of seconds." }
                $lines += "startup_timeout_sec = $seconds"
            }
            $lines += ''
        }
    }

    Write-Utf8NoBom (Join-Path $Destination 'config.toml') ($lines -join "`n")
}

function Write-CodexAgentsInstructions {
    param([string]$AgentsRoot)

    $managed = @(
        '<!-- kit-skills:begin -->',
        '# Kit Skills runtime instructions',
        '',
        'Shared skills are installed in `.agents/skills/`. Follow the project AGENTS.md instructions and use the installed skills when their descriptions match the task.',
        'Runtime support files are in `.agents/`; do not assume Claude-specific tools, paths, or environment variables are available.',
        '<!-- kit-skills:end -->',
        ''
    ) -join "`n"
    $path = Join-Path $DestinationRoot 'AGENTS.md'
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        Set-Content -LiteralPath $path -Value $managed -Encoding utf8
        return
    }
    $existing = Get-Content -LiteralPath $path -Raw
    $pattern = '(?s)<!-- kit-skills:begin -->.*?<!-- kit-skills:end -->\s*'
    $output = if ($existing -match $pattern) { [regex]::Replace($existing, $pattern, $managed) } else { $existing.TrimEnd() + "`n`n" + $managed }
    Set-Content -LiteralPath $path -Value $output -Encoding utf8
}

function Merge-CodexAgentsPayload {
    param([string]$StagedAgentsRoot)

    # .agents may predate kit-skills and is user-owned.  Merge only the kit's
    # namespaced skill directories and support files; never replace the root.
    $targetRoot = Join-Path $DestinationRoot '.agents'
    New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
    $manifestPath = Join-Path $targetRoot '.kit-skills-manifest.json'
    $owned = @{}
    if (Test-Path -LiteralPath $manifestPath -PathType Leaf) {
        try { (Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json).paths | ForEach-Object { $owned[$_] = $true } } catch { Write-Warning "Ignoring invalid $manifestPath" }
    }
    $installed = @()
    foreach ($item in Get-ChildItem -LiteralPath $StagedAgentsRoot -Force) {
        $target = Join-Path $targetRoot $item.Name
        if ($item.PSIsContainer) {
            # Copy into an existing directory instead of replacing it: `.agents`
            # may contain independently installed skills and user notes.
            New-Item -ItemType Directory -Path $target -Force | Out-Null
            foreach ($child in Get-ChildItem -LiteralPath $item.FullName -Force) {
                $relative = "$($item.Name)/$($child.Name)"
                $childTarget = Join-Path $target $child.Name
                if ((Test-Path -LiteralPath $childTarget) -and -not $owned.ContainsKey($relative)) {
                    Write-Warning "Kept user-owned .agents/$relative"
                    continue
                }
                Copy-Item -LiteralPath $child.FullName -Destination $target -Recurse -Force
                $installed += $relative
            }
        } elseif (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
            Copy-Item -LiteralPath $item.FullName -Destination $target
            $installed += $item.Name
        }
    }
    @{ version = 1; paths = @($installed | Sort-Object -Unique) } | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding utf8
    Write-CodexAgentsInstructions $targetRoot
}

function Test-GuardrailHookEnabled {
    param(
        [object]$Config,
        [string]$Key
    )

    $hooks = $Config.PSObject.Properties['hooks']
    if ($null -eq $hooks -or $hooks.Value -isnot [pscustomobject]) { return $true }
    $hook = $hooks.Value.PSObject.Properties[$Key]
    if ($null -eq $hook -or $hook.Value -isnot [bool]) { return $true }
    return $hook.Value
}

function New-HookEntry {
    param(
        [string]$Command,
        [string]$StatusMessage,
        [string]$CommandWindows,
        [int]$Timeout = 10
    )

    $entry = [ordered]@{
        type = 'command'
        command = $Command
        timeout = $Timeout
        statusMessage = $StatusMessage
    }
    if (-not [string]::IsNullOrWhiteSpace($CommandWindows)) {
        # Codex hooks.json carries a Windows variant alongside the POSIX command.
        $entry = [ordered]@{
            type = 'command'
            command = $Command
            commandWindows = $CommandWindows
            timeout = $Timeout
            statusMessage = $StatusMessage
        }
    }
    return $entry
}

# Per-hook timeouts: session-init walks the project and builds context (30s);
# the session-state family persists snapshots (15s); the guard rails must stay
# snappy on every prompt/tool call (10s).
$HookTimeouts = @{
    'session-init' = 30
    'session-state' = 15
    'subagent-init' = 15
}

function Get-HookTimeout {
    param([string]$Name)
    if ($HookTimeouts.ContainsKey($Name)) { return $HookTimeouts[$Name] }
    return 10
}

function New-HooksEventTable {
    param(
        [object]$KitConfig,
        [scriptblock]$EntryFactory
    )

    # Event wiring (matchers and per-hook timeouts included): privacy-block and
    # scout-block need matcher '.*' so Bash tool calls are covered too. Every
    # one of the 8 hooks.* keys in .kit.json is honored here; the runtime
    # isHookEnabled guard inside each script stays as the second layer for
    # configs edited after install.
    $preToolUse = @()
    if (Test-GuardrailHookEnabled $KitConfig 'privacy-block') {
        $preToolUse += & $EntryFactory 'privacy-block' 'Checking kit-skills privacy guard'
    }
    if (Test-GuardrailHookEnabled $KitConfig 'scout-block') {
        $preToolUse += & $EntryFactory 'scout-block' 'Checking kit-skills scout guard'
    }

    $userPromptSubmit = @()
    if (Test-GuardrailHookEnabled $KitConfig 'secret-output-guardrail') {
        $userPromptSubmit += & $EntryFactory 'secret-output-guardrail' 'Checking for secret echoes'
    }
    if (Test-GuardrailHookEnabled $KitConfig 'dev-rules-reminder') {
        $userPromptSubmit += & $EntryFactory 'dev-rules-reminder' 'Refreshing kit-skills session rules'
    }
    if (Test-GuardrailHookEnabled $KitConfig 'simplify-gate') {
        $userPromptSubmit += & $EntryFactory 'simplify-gate' 'Checking for unsimplified diff before ship/commit'
    }

    $sessionStateEnabled = Test-GuardrailHookEnabled $KitConfig 'session-state'

    $events = [ordered]@{}
    if ($preToolUse.Count -gt 0) {
        $events.PreToolUse = @([ordered]@{ matcher = '.*'; hooks = $preToolUse })
    }
    if (Test-GuardrailHookEnabled $KitConfig 'session-init') {
        $events.SessionStart = @([ordered]@{
            matcher = '*'
            hooks = @(& $EntryFactory 'session-init' 'Initializing kit-skills session')
        })
    }
    if (Test-GuardrailHookEnabled $KitConfig 'subagent-init') {
        $events.SubagentStart = @([ordered]@{
            matcher = '*'
            hooks = @(& $EntryFactory 'subagent-init' 'Injecting subagent context')
        })
    }
    if ($sessionStateEnabled) {
        $events.Stop = @([ordered]@{
            matcher = '*'
            hooks = @(& $EntryFactory 'session-state' 'Persisting session state')
        })
        $events.SubagentStop = @([ordered]@{
            matcher = '*'
            hooks = @(& $EntryFactory 'session-state' 'Persisting subagent state')
        })
    }
    if ($userPromptSubmit.Count -gt 0) {
        $events.UserPromptSubmit = @([ordered]@{ matcher = '*'; hooks = $userPromptSubmit })
    }
    return $events
}

function Write-ClaudeHooksConfig {
    param(
        [string]$Destination,
        [object]$KitConfig
    )

    # Claude Code hook entries take a single shell command string; there is no
    # separate args array, so the script path belongs in the command.
    $entryFactory = {
        param([string]$Name, [string]$StatusMessage)
        New-HookEntry "node `"`$CLAUDE_PROJECT_DIR/.claude/hooks/$Name.cjs`"" $StatusMessage -Timeout (Get-HookTimeout $Name)
    }

    $settings = [ordered]@{
        hooks = New-HooksEventTable $KitConfig $entryFactory
    }
    $settings | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $Destination 'settings.json') -Encoding utf8
}

function Write-CodexHooksConfig {
    param(
        [string]$Destination,
        [object]$KitConfig
    )

    # The command carries the project path resolved at install time. A shell
    # substitution evaluated at hook-run time inside the user's checkout would
    # let repo contents influence which script executes, and breaks outside cwd.
    $windowsRoot = $DestinationRoot.TrimEnd('\', '/')
    $posixRoot = $windowsRoot.Replace('\', '/')
    $entryFactory = {
        param([string]$Name, [string]$StatusMessage)
        New-HookEntry "node `"$posixRoot/.codex/hooks/$Name.cjs`"" $StatusMessage "node `"$windowsRoot\.codex\hooks\$Name.cjs`"" -Timeout (Get-HookTimeout $Name)
    }

    # Codex uses the documented lifecycle names, but adapters own its response
    # envelope rather than serializing the Claude hookSpecificOutput contract.
    $events = [ordered]@{}
    if (Test-GuardrailHookEnabled $KitConfig 'session-init') { $events.SessionStart = @([ordered]@{ matcher = '*'; hooks = @(& $entryFactory 'session-init' 'Initializing kit-skills session') }) }
    if (Test-GuardrailHookEnabled $KitConfig 'subagent-init') { $events.SubagentStart = @([ordered]@{ matcher = '*'; hooks = @(& $entryFactory 'subagent-init' 'Injecting agent context') }) }
    if (Test-GuardrailHookEnabled $KitConfig 'session-state') { $events.Stop = @([ordered]@{ matcher = '*'; hooks = @(& $entryFactory 'session-state' 'Persisting session state') }); $events.SubagentStop = @([ordered]@{ matcher = '*'; hooks = @(& $entryFactory 'session-state' 'Persisting subagent state') }) }
    $beforeTool = @()
    if (Test-GuardrailHookEnabled $KitConfig 'privacy-block') { $beforeTool += & $entryFactory 'privacy-block' 'Checking kit-skills privacy guard' }
    if (Test-GuardrailHookEnabled $KitConfig 'scout-block') { $beforeTool += & $entryFactory 'scout-block' 'Checking kit-skills scout guard' }
    if ($beforeTool.Count -gt 0) { $events.PreToolUse = @([ordered]@{ matcher = '.*'; hooks = $beforeTool }) }
    $beforePrompt = @()
    foreach ($name in @('secret-output-guardrail', 'dev-rules-reminder', 'simplify-gate')) {
        if (Test-GuardrailHookEnabled $KitConfig $name) { $beforePrompt += & $entryFactory $name 'Applying kit-skills prompt guard' }
    }
    if ($beforePrompt.Count -gt 0) { $events.UserPromptSubmit = @([ordered]@{ matcher = '*'; hooks = $beforePrompt }) }
    $hooks = [ordered]@{ hooks = $events }
    Write-Utf8NoBom (Join-Path $Destination 'hooks.json') ($hooks | ConvertTo-Json -Depth 10)
}

function Test-GeneratedRuntimeArtifacts {
    param([ValidateSet('claude', 'codex')][string]$Runtime, [string]$Root, [string]$SkillsRoot = '')

    $agentDirectory = Join-Path $Root 'agents'
    foreach ($agent in Get-ChildItem -LiteralPath $agentDirectory -File) {
        $text = [System.IO.File]::ReadAllText($agent.FullName)
        if ($Runtime -eq 'codex') {
            if ($agent.Extension -ne '.toml' -or $text -notmatch '(?m)^name\s*=' -or $text -notmatch '(?m)^developer_instructions\s*=\s*"""') { throw "Invalid Codex agent manifest: $($agent.FullName)" }
            if ($text -match '(?-i:AskUserQuestion|\bTask(Get|List|Update|Create)?\b|SendMessage|CLAUDE_|\.claude)') { throw "Codex agent contains unsupported provider vocabulary: $($agent.FullName)" }
            if ($text -notmatch 'model_reasoning_effort = "(minimal|low|medium|high|xhigh)"') { throw "Codex agent has invalid reasoning effort: $($agent.FullName)" }
            if ($text -notmatch 'sandbox_mode = "(read-only|workspace-write|danger-full-access)"') { throw "Codex agent has invalid sandbox mode: $($agent.FullName)" }
        } elseif ($agent.Extension -ne '.md' -or $text -notmatch '(?s)\A---\s*\r?\n.*?\r?\n---') { throw "Invalid Claude agent manifest: $($agent.FullName)" }
    }
    if ([string]::IsNullOrWhiteSpace($SkillsRoot)) { $SkillsRoot = Join-Path $Root 'skills' }
    if (Test-Path -LiteralPath $SkillsRoot) {
        foreach ($skill in Get-ChildItem -LiteralPath $SkillsRoot -Recurse -File -Filter 'SKILL.md') {
            $text = [System.IO.File]::ReadAllText($skill.FullName)
            if ($text -notmatch '(?s)\A---\s*\r?\n(?=.*(?m)^name:\s*\S+)(?=.*(?m)^description:\s*\S+).*?\r?\n---') { throw "Invalid skill front matter: $($skill.FullName)" }
            if ($Runtime -eq 'codex' -and $text -match 'AskUserQuestion|TaskList|TaskUpdate|TaskCreate|SendMessage|CLAUDE_') { throw "Codex skill contains unsupported provider vocabulary: $($skill.FullName)" }
        }
        if ($Runtime -eq 'codex') {
            foreach ($payload in Get-ChildItem -LiteralPath $SkillsRoot -Recurse -File -Include '*.md','*.txt','*.py','*.cjs','*.js','*.sh','*.ps1','*.json','*.yaml','*.yml','*.csv','*.svg','*.html') {
                $text = [System.IO.File]::ReadAllText($payload.FullName)
                $isExecutable = $payload.Extension -in @('.py', '.cjs', '.js', '.sh', '.ps1')
                $isInstruction = $payload.Extension -in @('.md', '.txt')
                # CSV/SVG/HTML/JSON/YAML are often data or templates where words
                # such as "task" are content, not runtime instructions. Restrict
                # vocabulary linting to instruction files; executable files retain
                # the stricter provider-path/environment check.
                $pattern = if ($isExecutable) { '(?-i:CLAUDE_|\.claude)' } elseif ($isInstruction) { '(?-i:AskUserQuestion|\bTask(Get|List|Update|Create)?\b|SendMessage|CLAUDE_|\.claude)' } else { $null }
                if ($null -ne $pattern -and $text -match $pattern) {
                    throw "Codex skill payload contains unsupported provider vocabulary: $($payload.FullName)"
                }
            }
        }
    }
}

function Replace-GeneratedDirectory {
    param(
        [string]$StagedDirectory,
        [string]$TargetDirectory
    )

    $backup = "$TargetDirectory.backup-$([guid]::NewGuid().ToString('N'))"
    if (Test-Path -LiteralPath $TargetDirectory) {
        Move-Item -LiteralPath $TargetDirectory -Destination $backup
    }
    try {
        Move-Item -LiteralPath $StagedDirectory -Destination $TargetDirectory
        if (Test-Path -LiteralPath $backup) {
            Remove-Item -LiteralPath $backup -Recurse -Force
        }
    }
    catch {
        if ((Test-Path -LiteralPath $backup) -and -not (Test-Path -LiteralPath $TargetDirectory)) {
            Move-Item -LiteralPath $backup -Destination $TargetDirectory
        }
        throw
    }
}

try {
    $selectedTargets = Resolve-Targets $RequestedTargets
    $agents = Get-AgentSources
    $kitConfig = Read-RootKitConfig
    Assert-HooksConfig $kitConfig
    $mcpConfig = Read-McpConfig
    Install-RootKitConfig $selectedTargets
    Install-RootMcpConfig $selectedTargets
    Ensure-PlanGitIgnores $kitConfig
    $stagingRoot = Join-Path $DestinationRoot ".install-staging-$([guid]::NewGuid().ToString('N'))"
    New-Item -ItemType Directory -Path $stagingRoot | Out-Null

    try {
        foreach ($target in $selectedTargets) {
            if ($target -eq 'claude') {
                $claudeRoot = Join-Path $stagingRoot '.claude'
                $agentsDestination = Join-Path $claudeRoot 'agents'
                New-Item -ItemType Directory -Path $agentsDestination -Force | Out-Null
                foreach ($agent in $agents) { Write-ClaudeAgent $agent $AgentPolicies[$agent.Name] $agentsDestination }
                Copy-SourceDirectory 'skills' $claudeRoot
                Copy-SourceDirectory 'rules' $claudeRoot
                Copy-SourceDirectory 'scripts' $claudeRoot
                Copy-SourceDirectory 'output-styles' $claudeRoot
                Prune-InstalledPayload (Join-Path $claudeRoot 'skills')
                Prune-InstalledPayload (Join-Path $claudeRoot 'scripts')
                Copy-ClaudeHookScripts $claudeRoot
                Prune-InstalledPayload (Join-Path $claudeRoot 'hooks')
                Write-ClaudeHooksConfig $claudeRoot $kitConfig
                Install-TargetKitSchema $claudeRoot
                Write-SelfIgnoreFile $claudeRoot
                Test-GeneratedRuntimeArtifacts 'claude' $claudeRoot
            }
            elseif ($target -eq 'codex') {
                $codexRoot = Join-Path $stagingRoot '.codex'
                $agentsDestination = Join-Path $codexRoot 'agents'
                New-Item -ItemType Directory -Path $agentsDestination -Force | Out-Null
                foreach ($agent in $agents) { Write-CodexAgent $agent $AgentPolicies[$agent.Name] $agentsDestination }
                Write-CodexConfig $mcpConfig $codexRoot
                $codexAgentsRoot = Join-Path $stagingRoot '.agents'
                New-Item -ItemType Directory -Path $codexAgentsRoot -Force | Out-Null
                Copy-SourceDirectory 'skills' $codexAgentsRoot
                Copy-SourceDirectory 'rules' $codexAgentsRoot
                Copy-SourceDirectory 'scripts' $codexAgentsRoot
                Prune-InstalledPayload (Join-Path $codexAgentsRoot 'skills')
                Prune-InstalledPayload (Join-Path $codexAgentsRoot 'scripts')
                Normalize-CodexSkillMetadata $codexAgentsRoot
                Render-CodexSkillPayload $codexAgentsRoot
                Adapt-CodexRuntimeAssets $codexAgentsRoot
                Copy-CodexHookScripts $codexRoot
                Write-CodexHooksConfig $codexRoot $kitConfig
                Install-TargetKitSchema $codexRoot
                Write-SelfIgnoreFile $codexRoot
                Test-GeneratedRuntimeArtifacts 'codex' $codexRoot (Join-Path $codexAgentsRoot 'skills')
            }
        }

        foreach ($target in $selectedTargets) {
            $targetDirectory = Join-Path $DestinationRoot ".${target}"
            Replace-GeneratedDirectory (Join-Path $stagingRoot ".${target}") $targetDirectory
            Write-Host "Generated $targetDirectory"
        }
        if ($selectedTargets -contains 'codex') {
            Merge-CodexAgentsPayload (Join-Path $stagingRoot '.agents')
            Write-Host "Generated $(Join-Path $DestinationRoot '.agents')"
        }
    }
    finally {
        if (Test-Path -LiteralPath $stagingRoot) {
            Remove-Item -LiteralPath $stagingRoot -Recurse -Force
        }
    }
}
catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    Show-Usage
    exit 1
}
