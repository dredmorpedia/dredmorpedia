[CmdletBinding()]
param(
    [switch]$Json,
    [switch]$FailOnInvalidXml,
    [switch]$FailOnMissingGameData
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$legacyRoot = Join-Path $repoRoot 'legacy'

if (-not (Test-Path -LiteralPath $legacyRoot -PathType Container)) {
    throw "Legacy application directory not found: $legacyRoot"
}

function Get-RepoRelativePath {
    param([Parameter(Mandatory = $true)][string]$Path)

    return $Path.Substring($repoRoot.Length).TrimStart([char[]]@('\', '/'))
}

$allFiles = @(
    Get-ChildItem -LiteralPath $legacyRoot -Recurse -Force -File
)

$extensionSummary = @(
    $allFiles |
        Group-Object { if ($_.Extension) { $_.Extension.ToLowerInvariant() } else { '[none]' } } |
        Sort-Object Count -Descending |
        ForEach-Object {
            [pscustomobject]@{
                Extension = $_.Name
                Count = $_.Count
                Bytes = ($_.Group | Measure-Object Length -Sum).Sum
            }
        }
)

$legacyJavaScript = @(Get-ChildItem -LiteralPath (Join-Path $legacyRoot 'js') -File -Filter '*.js')
$legacyJavaScriptLines = 0
foreach ($file in $legacyJavaScript) {
    $legacyJavaScriptLines += @(Get-Content -LiteralPath $file.FullName).Count
}

$xmlFindings = [System.Collections.Generic.List[object]]::new()
foreach ($file in @(Get-ChildItem -LiteralPath $legacyRoot -Recurse -File -Filter '*.xml')) {
    try {
        $document = [System.Xml.XmlDocument]::new()
        $document.Load($file.FullName)
        $xmlFindings.Add([pscustomobject]@{
            Path = Get-RepoRelativePath $file.FullName
            Valid = $true
            Root = $document.DocumentElement.LocalName
            Error = $null
        })
    }
    catch {
        $xmlFindings.Add([pscustomobject]@{
            Path = Get-RepoRelativePath $file.FullName
            Valid = $false
            Root = $null
            Error = $_.Exception.Message.Split([Environment]::NewLine)[0]
        })
    }
}

$databaseTags = [ordered]@{
    'itemDB.xml' = @('item')
    'craftDB.xml' = @('craft')
    'encrustDB.xml' = @('encrust')
    'skillDB.xml' = @('skill', 'ability')
    'spellDB.xml' = @('spell')
    'monDB.xml' = @('monster')
    'manTemplateDB.xml' = @('template')
}

$modEntitySummary = [System.Collections.Generic.List[object]]::new()
foreach ($databaseName in $databaseTags.Keys) {
    $databaseFiles = @(
        Get-ChildItem -LiteralPath $legacyRoot -Recurse -File -Filter $databaseName |
            Where-Object { $_.FullName -match '[\\/]mod[\\/]' }
    )
    $validCount = 0
    $invalidCount = 0
    $entityCounts = [ordered]@{}

    foreach ($tag in $databaseTags[$databaseName]) {
        $entityCounts[$tag] = 0
    }

    foreach ($file in $databaseFiles) {
        try {
            $document = [System.Xml.XmlDocument]::new()
            $document.Load($file.FullName)
            $validCount++

            foreach ($tag in $databaseTags[$databaseName]) {
                $entityCounts[$tag] += $document.GetElementsByTagName($tag).Count
            }
        }
        catch {
            $invalidCount++
        }
    }

    $modEntitySummary.Add([pscustomobject]@{
        Database = $databaseName
        Files = $databaseFiles.Count
        Valid = $validCount
        Invalid = $invalidCount
        Entities = [pscustomobject]$entityCounts
    })
}

$officialSources = @('data', 'expansion', 'expansion2', 'expansion3')
$expectedOfficialDatabases = @(
    'itemDB.xml',
    'craftDB.xml',
    'encrustDB.xml',
    'skillDB.xml',
    'spellDB.xml',
    'monDB.xml',
    'manTemplateDB.xml'
)
$missingOfficialData = [System.Collections.Generic.List[string]]::new()

foreach ($source in $officialSources) {
    foreach ($databaseName in $expectedOfficialDatabases) {
        $path = Join-Path (Join-Path (Join-Path $legacyRoot $source) 'game') $databaseName
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            $missingOfficialData.Add((Get-RepoRelativePath $path))
        }
    }
}

$invalidXml = @($xmlFindings | Where-Object { -not $_.Valid })
$report = [pscustomobject]@{
    Legacy = [pscustomobject]@{
        Root = $legacyRoot
        Files = $allFiles.Count
        Bytes = ($allFiles | Measure-Object Length -Sum).Sum
        ByExtension = $extensionSummary
    }
    LegacyJavaScript = [pscustomobject]@{
        FirstPartyFiles = $legacyJavaScript.Count
        Lines = $legacyJavaScriptLines
    }
    Xml = [pscustomobject]@{
        Total = $xmlFindings.Count
        Valid = @($xmlFindings | Where-Object Valid).Count
        Invalid = $invalidXml
    }
    ModDatabases = $modEntitySummary
    OfficialData = [pscustomobject]@{
        MissingCount = $missingOfficialData.Count
        Missing = $missingOfficialData
    }
}

if ($Json) {
    $report | ConvertTo-Json -Depth 8
}
else {
    Write-Output 'Dredmorpedia legacy audit'
    Write-Output "Legacy files: $($report.Legacy.Files) ($($report.Legacy.Bytes) bytes)"
    Write-Output "First-party legacy JavaScript: $($report.LegacyJavaScript.FirstPartyFiles) files, $($report.LegacyJavaScript.Lines) lines"
    Write-Output "XML: $($report.Xml.Total) total, $($report.Xml.Valid) valid, $($report.Xml.Invalid.Count) invalid"
    Write-Output "Missing official game database files: $($report.OfficialData.MissingCount)"
    Write-Output ''
    Write-Output 'Committed mod database entities:'
    $report.ModDatabases | Format-Table -AutoSize | Out-String | Write-Output

    if ($invalidXml.Count -gt 0) {
        Write-Output 'Invalid XML:'
        $invalidXml | Format-Table -Wrap -AutoSize | Out-String | Write-Output
    }

    Write-Output 'Missing official data is expected in a clean checkout; see README.md and docs/data-and-assets-policy.md.'
}

if (($FailOnInvalidXml -and $invalidXml.Count -gt 0) -or
    ($FailOnMissingGameData -and $missingOfficialData.Count -gt 0)) {
    exit 1
}
