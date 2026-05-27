$detections = Get-MpThreatDetection | Where-Object { $_.Resources -like '*app-builder*' -or $_.Resources -like '*AI-Visualize*' }
if ($detections) {
  $detections | Select-Object -First 5 InitialDetectionTime, Resources, ThreatID | Format-List
} else {
  Write-Host "no defender detections on app-builder / AI-Visualize"
}
$exclusions = (Get-MpPreference).ExclusionPath
Write-Host "---current exclusions---"
$exclusions | ForEach-Object { Write-Host "  $_" }
