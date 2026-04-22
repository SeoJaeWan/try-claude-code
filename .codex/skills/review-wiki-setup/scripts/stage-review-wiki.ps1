param(
    [string]$WorkspaceRoot = (Get-Location).Path,
    [string]$SourceWikiRoot = (Join-Path $HOME ".codex\reviewWiki\wiki"),
    [string]$DestinationRoot = (Join-Path $WorkspaceRoot ".codex\review-wiki\sync\current"),
    [ValidateSet("Junction", "SymbolicLink")]
    [string]$LinkType = "Junction"
)

$ErrorActionPreference = "Stop"

$resolvedWorkspaceRoot = [System.IO.Path]::GetFullPath($WorkspaceRoot)
$resolvedSourceWikiRoot = [System.IO.Path]::GetFullPath($SourceWikiRoot)
$resolvedDestinationRoot = [System.IO.Path]::GetFullPath($DestinationRoot)
$destinationParent = [System.IO.Path]::GetDirectoryName($resolvedDestinationRoot)
$destinationName = [System.IO.Path]::GetFileName($resolvedDestinationRoot)
$manifestPath = Join-Path $destinationParent ($destinationName + ".manifest.json")

if (-not (Test-Path -LiteralPath $resolvedSourceWikiRoot -PathType Container)) {
    throw "Review wiki source root not found: $resolvedSourceWikiRoot"
}

# Refuse to delete or recreate a planning-root path outside the active workspace.
$workspacePrefix = $resolvedWorkspaceRoot.TrimEnd("\") + "\"
if (-not $resolvedDestinationRoot.StartsWith($workspacePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Destination root must stay inside the workspace: $resolvedDestinationRoot"
}

if ($resolvedSourceWikiRoot.Equals($resolvedDestinationRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Source root and destination root must differ: $resolvedDestinationRoot"
}

if (Test-Path -LiteralPath $resolvedDestinationRoot) {
    $existingDestination = Get-Item -LiteralPath $resolvedDestinationRoot -Force
    $isReparsePoint = ($existingDestination.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0
    if ($isReparsePoint) {
        $existingDestination.Delete()
    } else {
        Remove-Item -LiteralPath $resolvedDestinationRoot -Recurse -Force
    }
}

if (Test-Path -LiteralPath $manifestPath -PathType Leaf) {
    Remove-Item -LiteralPath $manifestPath -Force
}

New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
New-Item -ItemType $LinkType -Path $resolvedDestinationRoot -Target $resolvedSourceWikiRoot | Out-Null

$manifest = [ordered]@{
    source_root = $resolvedSourceWikiRoot
    destination_root = $resolvedDestinationRoot
    mode = "Link"
    link_type = $LinkType
    prepared_at_utc = [DateTime]::UtcNow.ToString("o")
}

$manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding UTF8

Write-Output "Prepared live review wiki planning link at $resolvedDestinationRoot"
