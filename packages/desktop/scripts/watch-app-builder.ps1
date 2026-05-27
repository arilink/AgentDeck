$watchDir = "F:\AI-Visualize\node_modules\app-builder-bin\win\x64"
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $watchDir
$watcher.Filter = "*"
$watcher.IncludeSubdirectories = $false
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName,LastWrite,Size'
$watcher.EnableRaisingEvents = $true

$log = "F:\AI-Visualize\packages\desktop\scripts\watch.log"
Set-Content -Path $log -Value "watcher started at $(Get-Date -Format 'HH:mm:ss.fff')"

Register-ObjectEvent $watcher Deleted -Action {
  Add-Content -Path "F:\AI-Visualize\packages\desktop\scripts\watch.log" -Value "[$(Get-Date -Format 'HH:mm:ss.fff')] DELETED: $($Event.SourceEventArgs.FullPath)"
} | Out-Null
Register-ObjectEvent $watcher Renamed -Action {
  Add-Content -Path "F:\AI-Visualize\packages\desktop\scripts\watch.log" -Value "[$(Get-Date -Format 'HH:mm:ss.fff')] RENAMED: $($Event.SourceEventArgs.OldFullPath) -> $($Event.SourceEventArgs.FullPath)"
} | Out-Null
Register-ObjectEvent $watcher Changed -Action {
  Add-Content -Path "F:\AI-Visualize\packages\desktop\scripts\watch.log" -Value "[$(Get-Date -Format 'HH:mm:ss.fff')] CHANGED: $($Event.SourceEventArgs.FullPath)"
} | Out-Null

Start-Sleep -Seconds 90
