#!/usr/bin/env pwsh
# Dogfood installer for kit development. Installs the working tree into a
# disposable sandbox so the source checkout itself is never modified.
[CmdletBinding()]
param(
    [string]$Destination,

    [switch]$Claude,

    [switch]$Codex,

    [switch]$All,

    [switch]$Clean,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Targets
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# A leading-dash value (e.g. `--all`) is a target flag the caller meant to
# forward, not a destination — rebind it so it cannot become a directory name.
if ($Destination -and $Destination.StartsWith('-')) {
    $Targets = @($Destination) + @($Targets | Where-Object { $_ })
    $Destination = $null
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$sandbox = if ([string]::IsNullOrWhiteSpace($Destination)) {
    Join-Path $repoRoot 'temp'
}
else {
    [System.IO.Path]::GetFullPath($Destination)
}

if ($Clean -and (Test-Path -LiteralPath $sandbox)) {
    Remove-Item -LiteralPath $sandbox -Recurse -Force
}

$forwardedTargets = @()
if ($Claude) { $forwardedTargets += '--claude' }
if ($Codex) { $forwardedTargets += '--codex' }
if ($All) { $forwardedTargets += '--all' }
if ($Targets) {
    $forwardedTargets += @($Targets | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}
if ($forwardedTargets.Count -eq 0) {
    $forwardedTargets = @('--all')
}

# In-process invocation: installer failures propagate as a terminating error
# or as the installer's own exit code, so no explicit forwarding is needed.
Write-Host "Dogfood install: $($forwardedTargets -join ' ') -> $sandbox"
& (Join-Path $repoRoot 'install.ps1') @forwardedTargets -Destination $sandbox
