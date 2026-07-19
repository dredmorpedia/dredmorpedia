[CmdletBinding()]
param(
    [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$safeRepoRoot = $repoRoot.Replace('\', '/')
$gitDirectory = Join-Path $repoRoot '.git'

if (-not (Test-Path -LiteralPath $gitDirectory -PathType Container)) {
    throw "Git repository metadata not found: $gitDirectory"
}

$status = @(& git -c "safe.directory=$safeRepoRoot" -C $repoRoot status --porcelain=v1 --untracked-files=all)
if ($LASTEXITCODE -ne 0) {
    throw 'Unable to inspect the Git working tree.'
}
if ($status.Count -gt 0) {
    throw "The working tree must be clean before packaging. Commit or remove these changes:`n$($status -join [Environment]::NewLine)"
}

$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmssZ')
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path (Split-Path -Parent $repoRoot) "dredmorpedia-transfer-$timestamp.zip"
}
elseif (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath = Join-Path (Get-Location).Path $OutputPath
}

$outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
if ([System.IO.Path]::GetExtension($outputFullPath) -ne '.zip') {
    throw 'OutputPath must end in .zip.'
}

$repoPrefix = $repoRoot.TrimEnd([char[]]@('\', '/')) + [System.IO.Path]::DirectorySeparatorChar
if ($outputFullPath.StartsWith($repoPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'The transfer package must be written outside the repository.'
}

$outputParent = Split-Path -Parent $outputFullPath
if (-not (Test-Path -LiteralPath $outputParent -PathType Container)) {
    throw "Output directory does not exist: $outputParent"
}
if (Test-Path -LiteralPath $outputFullPath) {
    throw "Refusing to overwrite an existing transfer package: $outputFullPath"
}

$tempBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd([char[]]@('\', '/')) + [System.IO.Path]::DirectorySeparatorChar
$tempRoot = Join-Path $tempBase ("dredmorpedia-transfer-" + [guid]::NewGuid().ToString('N'))
$tempFullPath = [System.IO.Path]::GetFullPath($tempRoot)
if (-not $tempFullPath.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Refusing to use a temporary directory outside the system temporary root.'
}

$bundlePath = Join-Path $tempFullPath 'dredmorpedia.bundle'
$restorePath = Join-Path $tempFullPath 'RESTORE.md'
$manifestPath = Join-Path $tempFullPath 'MANIFEST.txt'
$handoffPath = Join-Path $repoRoot 'docs\handoff\new-pc-and-codex.md'

try {
    New-Item -ItemType Directory -Path $tempFullPath | Out-Null

    & git -c "safe.directory=$safeRepoRoot" -C $repoRoot bundle create $bundlePath --all
    if ($LASTEXITCODE -ne 0) {
        throw 'Git bundle creation failed.'
    }

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $bundleVerification = @(& git -c "safe.directory=$safeRepoRoot" -C $repoRoot bundle verify $bundlePath 2>&1)
        $bundleVerificationExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($bundleVerificationExitCode -ne 0) {
        throw "Git bundle verification failed:`n$($bundleVerification -join [Environment]::NewLine)"
    }

    Copy-Item -LiteralPath $handoffPath -Destination $restorePath

    $head = (& git -c "safe.directory=$safeRepoRoot" -C $repoRoot rev-parse HEAD).Trim()
    $branch = (& git -c "safe.directory=$safeRepoRoot" -C $repoRoot branch --show-current).Trim()
    $remote = (& git -c "safe.directory=$safeRepoRoot" -C $repoRoot remote get-url origin 2>$null).Trim()
    if ($LASTEXITCODE -ne 0) {
        $remote = '[no origin configured]'
    }
    $bundleHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $bundlePath).Hash.ToLowerInvariant()
    $restoreHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $restorePath).Hash.ToLowerInvariant()

    $manifest = @(
        'Dredmorpedia transfer package'
        "CreatedUtc: $((Get-Date).ToUniversalTime().ToString('o'))"
        "SourceBranch: $branch"
        "SourceCommit: $head"
        "CanonicalRemote: $remote"
        "BundleSha256: $bundleHash"
        "RestoreSha256: $restoreHash"
        'ExcludedByDesign: uncommitted files, ignored files, local Git configuration, credentials, dependency caches, and game installations'
    ) -join [Environment]::NewLine
    [System.IO.File]::WriteAllText($manifestPath, $manifest + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

    Compress-Archive -Path (Join-Path $tempFullPath '*') -DestinationPath $outputFullPath -CompressionLevel Optimal

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($outputFullPath)
    try {
        $actualEntries = @($archive.Entries | ForEach-Object FullName | Sort-Object)
        $expectedEntries = @('MANIFEST.txt', 'RESTORE.md', 'dredmorpedia.bundle') | Sort-Object
        if (@(Compare-Object -ReferenceObject $expectedEntries -DifferenceObject $actualEntries).Count -gt 0) {
            throw "Unexpected ZIP contents: $($actualEntries -join ', ')"
        }
    }
    finally {
        $archive.Dispose()
    }

    $zipHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $outputFullPath).Hash.ToLowerInvariant()
    [pscustomobject]@{
        Package = $outputFullPath
        Bytes = (Get-Item -LiteralPath $outputFullPath).Length
        Sha256 = $zipHash
        SourceBranch = $branch
        SourceCommit = $head
        Contents = 'dredmorpedia.bundle, RESTORE.md, MANIFEST.txt'
    }
}
finally {
    if (Test-Path -LiteralPath $tempFullPath) {
        $resolvedTemp = [System.IO.Path]::GetFullPath($tempFullPath)
        if (-not $resolvedTemp.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw 'Refusing to clean a temporary directory outside the system temporary root.'
        }
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
    }
}
