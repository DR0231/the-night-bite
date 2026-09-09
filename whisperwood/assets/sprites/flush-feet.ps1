# Shift opaque pixels down so the lowest pixel sits on the last row.
param(
  [Parameter(Mandatory = $true)][string]$Path
)
Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile($Path)
$w = $bmp.Width; $h = $bmp.Height
$maxY = -1
for ($y = $h - 1; $y -ge 0; $y--) {
  for ($x = 0; $x -lt $w; $x++) {
    if ($bmp.GetPixel($x, $y).A -gt 20) { $maxY = $y; break }
  }
  if ($maxY -ge 0) { break }
}
if ($maxY -lt 0 -or $maxY -ge $h - 1) {
  $bmp.Dispose()
  return
}
$shift = ($h - 1) - $maxY
$out = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($out)
$g.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))
$g.DrawImage($bmp, 0, $shift)
$g.Dispose(); $bmp.Dispose()
$out.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
$out.Dispose()
"flushed $shift px $Path"
