param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$address = 'http://127.0.0.1:4310'
# Start local AI if it is not already running.
try { Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2 | Out-Null } catch {
    $ollamaCommand = Get-Command ollama.exe -ErrorAction SilentlyContinue
    $ollamaPath = if ($ollamaCommand) { $ollamaCommand.Source } else { Join-Path $env:LOCALAPPDATA 'OllamaPortable\ollama.exe' }
    if (Test-Path -LiteralPath $ollamaPath) {
        $env:OLLAMA_HOST = '127.0.0.1:11434'
        Start-Process -FilePath $ollamaPath -ArgumentList 'serve' -WindowStyle Hidden | Out-Null
    }
}
try {
    $health = Invoke-RestMethod -Uri "$address/api/health" -TimeoutSec 2
    if ($health.app -eq 'funalearn') { if (-not $NoBrowser) { Start-Process $address }; exit }
} catch {}
try {
    $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist\index.html'))) {
        throw 'The website build is missing. Run npm run build in the FunaLearn folder.'
    }
    New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot 'data') | Out-Null
    $env:PORT = '4310'
    $serverPath = Join-Path $projectRoot 'server\index.mjs'
    $serverProcess = Start-Process -FilePath $nodePath -ArgumentList ('"' + $serverPath + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot 'data\server.log') -RedirectStandardError (Join-Path $projectRoot 'data\server-errors.log')
    Set-Content -LiteralPath (Join-Path $projectRoot 'data\server.pid') -Value $serverProcess.Id
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 250
        try {
            $health = Invoke-RestMethod -Uri "$address/api/health" -TimeoutSec 1
            if ($health.app -eq 'funalearn') { if (-not $NoBrowser) { Start-Process $address }; exit }
        } catch {}
    }
    throw 'FunaLearn could not start. Check data\server-errors.log or whether port 4310 is in use.'
} catch {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($_.Exception.Message, 'FunaLearn') | Out-Null
    exit 1
}
