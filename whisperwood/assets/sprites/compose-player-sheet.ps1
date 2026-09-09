# Build assets/sprites/player.png — 4 rows (down,left,right,up) x 6 cols (idle,walk1-4,fish), 32x48 cells.
Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
if ((Split-Path $PSScriptRoot -Leaf) -eq "sprites") { $root = Split-Path (Split-Path $PSScriptRoot -Parent) }
# This script lives in assets/sprites
$srcDir = Join-Path $PSScriptRoot "src"
$outPath = Join-Path $PSScriptRoot "player.png"

$cw = 80; $ch = 72
$cols = 6; $rows = 4
$sheet = New-Object System.Drawing.Bitmap ($cw * $cols), ($ch * $rows)
$g = [System.Drawing.Graphics]::FromImage($sheet)
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver

function Get-CellPng([string]$path) {
  if (Test-Path $path) { return [System.Drawing.Bitmap]::FromFile($path) }
  return $null
}

# Row = dir: 0 down/front, 1 left, 2 right, 3 up/back
$dirs = @("front", "left", "right", "back")
foreach ($r in 0..3) {
  $d = $dirs[$r]
  $names = @(
    @("idle-$d-80x72.png", "idle-$d-48x64.png", "idle-$d-32x48.png"),
    @("walk-$d-1-80x72.png", "walk-$d-1-48x64.png", "walk-$d-1-32x48.png"),
    @("walk-$d-2-80x72.png", "walk-$d-2-48x64.png", "walk-$d-2-32x48.png"),
    @("walk-$d-3-80x72.png", "walk-$d-3-48x64.png", "walk-$d-3-32x48.png"),
    @("walk-$d-4-80x72.png", "walk-$d-4-48x64.png", "walk-$d-4-32x48.png"),
    @("fish-$d-80x72.png", "fish-$d-48x64.png", "fish-$d-32x48.png")
  )
  foreach ($c in 0..5) {
    $bmp = $null
    foreach ($n in $names[$c]) {
      $bmp = Get-CellPng (Join-Path $srcDir $n)
      if ($bmp) { break }
    }
    if (-not $bmp -and $c -ge 1 -and $c -le 4) {
      $bmp = Get-CellPng (Join-Path $srcDir "idle-$d-32x48.png")
    }
    if (-not $bmp) { continue }
    $dx = $c * $cw + [int](($cw - $bmp.Width) / 2)
    $dy = $r * $ch + ($ch - $bmp.Height)
    $g.DrawImage($bmp, $dx, $dy, $bmp.Width, $bmp.Height)
    $bmp.Dispose()
  }
}

$g.Dispose()
$sheet.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
"{0} {1}x{2}" -f $outPath, $sheet.Width, $sheet.Height
$sheet.Dispose()
