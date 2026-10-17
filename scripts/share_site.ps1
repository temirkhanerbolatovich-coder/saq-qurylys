param([ValidateSet('Start', 'Status', 'Stop')][string]$Action = 'Status')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$folder = Join-Path $root '.local/tunnel'
New-Item -ItemType Directory -Force -Path $folder | Out-Null
$statePath = Join-Path $folder 'process.json'
$urlPath = Join-Path $folder 'url.txt'
$overridePath = Join-Path $folder 'compose.json'
$running = $null
if (Test-Path -LiteralPath $statePath) {
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    $candidate = Get-Process -Id $state.processId -ErrorAction SilentlyContinue
    # A recycled PID must never stop an unrelated process.
    if ($candidate -and $candidate.ProcessName -eq 'cloudflared' -and
        $candidate.StartTime.ToUniversalTime().ToString('o') -eq $state.startedAt) {
        $running = $candidate
    }
}
Push-Location $root
try {
    if ($Action -eq 'Status' -or ($Action -eq 'Start' -and $running)) {
        if ($running) {
            Write-Output "Tunnel process: $($running.Id)"
            if (Test-Path -LiteralPath $urlPath) { Get-Content -LiteralPath $urlPath }
            Write-Output 'Process status only; public availability must be checked separately.'
        } else { Write-Output 'Tunnel is not running.' }
        return
    }
    if ($Action -eq 'Stop') {
        if ($running) { Stop-Process -Id $running.Id }
        # Restore the established local API configuration without touching DB/worker.
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --no-deps --wait api
        if ($LASTEXITCODE -ne 0) { throw 'Tunnel stopped, but restoring the local API failed.' }
        Write-Output 'Public tunnel stopped. Use http://localhost:3000 again.'
        return
    }
    $binary = (Get-Command cloudflared -ErrorAction Stop).Source
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $logPath = Join-Path $folder "$stamp.stderr.log"
    $tunnelProcess = Start-Process -FilePath $binary -ArgumentList @(
        'tunnel', '--url', 'http://127.0.0.1:3000', '--no-autoupdate', '--protocol', 'http2'
    ) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $folder "$stamp.stdout.log") -RedirectStandardError $logPath -PassThru
    @{ processId = $tunnelProcess.Id; startedAt = $tunnelProcess.StartTime.ToUniversalTime().ToString('o') } |
        ConvertTo-Json | Set-Content -LiteralPath $statePath
    try {
        $publicUrl = ''
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            if ($tunnelProcess.HasExited) { throw "Tunnel exited. See $logPath" }
            if (Test-Path -LiteralPath $logPath) {
                $logContent = Get-Content -LiteralPath $logPath -Raw
                if ($logContent) {
                    $publicUrl = [regex]::Match($logContent, 'https://[a-z0-9-]+\.trycloudflare\.com').Value
                }
            }
            if ($publicUrl) { break }
            Start-Sleep -Seconds 2
        }
        if (-not $publicUrl) { throw "No public URL received. See $logPath" }
        $publicUrl | Set-Content -LiteralPath $urlPath
        @{ services = @{ api = @{ environment = @{ APP_ORIGIN = $publicUrl; SESSION_COOKIE_SECURE = 'true' } } } } |
            ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $overridePath
        docker compose -f docker-compose.yml -f docker-compose.dev.yml -f $overridePath up -d --no-deps --wait api
        if ($LASTEXITCODE -ne 0) { throw 'Applying the HTTPS origin failed.' }
        Write-Output $publicUrl
        Write-Output 'Use this HTTPS address for login and edits while sharing. Check /login before distributing.'
    } catch {
        if (-not $tunnelProcess.HasExited) { Stop-Process -Id $tunnelProcess.Id }
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --no-deps --wait api
        throw
    }
} finally { Pop-Location }
