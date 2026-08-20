[CmdletBinding()]
param()

$port = 3001

function Get-ListeningProcessId {
    param([int]$LocalPort)

    return @(
        netstat.exe -ano -p TCP |
            ForEach-Object {
                if ($_ -match "^\s*TCP\s+\S+:$LocalPort\s+\S+\s+LISTENING\s+(\d+)\s*$") {
                    [int]$Matches[1]
                }
            } |
            Sort-Object -Unique
    )
}

$processIds = @(Get-ListeningProcessId -LocalPort $port)

if ($processIds.Count -eq 0) {
    Write-Host "No process is listening on port $port."
    exit 0
}

foreach ($processId in $processIds) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        continue
    }

    Write-Host "Stopping $($process.ProcessName) (PID $processId) on port $port..."
    Stop-Process -Id $processId -Force -ErrorAction Stop
}

$deadline = (Get-Date).AddSeconds(5)
do {
    Start-Sleep -Milliseconds 100
    $remainingProcessIds = @(Get-ListeningProcessId -LocalPort $port)
} while ($remainingProcessIds.Count -gt 0 -and (Get-Date) -lt $deadline)

if ($remainingProcessIds.Count -gt 0) {
    throw "Port $port is still in use after attempting to stop its listener."
}

Write-Host "Port $port is free."
