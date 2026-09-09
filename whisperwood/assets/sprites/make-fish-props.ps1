# Pack fish strip + props sheet from Imagine jpgs. Uses pack-cell (not 1:2 character crop).
$pack = Join-Path $PSScriptRoot "pack-cell.ps1"
$img = "C:\Users\D'Angelo R\.grok\sessions\C%3A%5CUsers%5CD%27Angelo%20R%5C.grok%5Cbin\01a08238-a2cc-7e92-a82f-a75f9d247e2e\images"
$out = Join-Path $PSScriptRoot "src"
New-Item -ItemType Directory -Force -Path $out | Out-Null

function Pack($file, $name, $w, $h, $anchor) {
  $dest = Join-Path $out "$name.png"
  $in = Join-Path $img $file
  if (-not (Test-Path -LiteralPath $in)) { throw "missing $in" }
  & powershell -NoProfile -ExecutionPolicy Bypass -File $pack -In $in -Out $dest -CellW $w -CellH $h -Anchor $anchor
}

# FISH order matches js/config.js FISH[]
$fish = @(
  @{ f="45.jpg"; n="sunperch" },
  @{ f="52.jpg"; n="lilykoi" },
  @{ f="47.jpg"; n="padskipper" },
  @{ f="49.jpg"; n="rainpearl" },
  @{ f="53.jpg"; n="stonetrout" },
  @{ f="50.jpg"; n="swiftdarter" },
  @{ f="51.jpg"; n="amberdace" },
  @{ f="48.jpg"; n="mistbass" },
  @{ f="61.jpg"; n="moonfin" },
  @{ f="57.jpg"; n="nighteel" },
  @{ f="59.jpg"; n="glowminnow" },
  @{ f="60.jpg"; n="crystalfin" },
  @{ f="55.jpg"; n="fogperch" },
  @{ f="58.jpg"; n="bogwhisker" },
  @{ f="56.jpg"; n="millfin" },
  @{ f="54.jpg"; n="pearlcarp" }
)
foreach ($it in $fish) { Pack $it.f ("fish-" + $it.n) 32 20 "center" }

Add-Type -AssemblyName System.Drawing
$strip = New-Object System.Drawing.Bitmap (32 * $fish.Count), 20
$g = [System.Drawing.Graphics]::FromImage($strip)
$g.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
for ($i=0; $i -lt $fish.Count; $i++) {
  $p = Join-Path $out ("fish-" + $fish[$i].n + ".png")
  $b = [System.Drawing.Bitmap]::FromFile($p)
  $g.DrawImage($b, $i*32, 0, 32, 20)
  $b.Dispose()
}
$g.Dispose()
$fishPath = Join-Path $PSScriptRoot "fish.png"
$strip.Save($fishPath, [System.Drawing.Imaging.ImageFormat]::Png)
$strip.Dispose()
"fish $fishPath"

# Props: name, file, w, h. Tank is emptied 66.jpg; bench is packing table 40.jpg.
$props = @(
  @{ n="treeOak";  f="46.jpg"; w=48; h=72 },
  @{ n="treePine"; f="41.jpg"; w=32; h=72 },
  @{ n="cottage";  f="42.jpg"; w=80; h=72 },
  @{ n="tank";     f="66.jpg"; w=48; h=40 },
  @{ n="bed";      f="43.jpg"; w=32; h=28 },
  @{ n="bench";    f="40.jpg"; w=40; h=28 },
  @{ n="crate";    f="39.jpg"; w=20; h=16 },
  @{ n="rock";     f="65.jpg"; w=20; h=16 },
  @{ n="fence";    f="62.jpg"; w=24; h=20 },
  @{ n="sign";     f="63.jpg"; w=16; h=24 },
  @{ n="stump";    f="64.jpg"; w=20; h=16 }
)
foreach ($it in $props) { Pack $it.f ("prop-" + $it.n) $it.w $it.h "feet" }

$sheetW = 256
$sheetH = 160
$sheet = New-Object System.Drawing.Bitmap $sheetW, $sheetH
$gs = [System.Drawing.Graphics]::FromImage($sheet)
$gs.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))
$gs.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$gs.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$gs.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$x=0; $y=0; $rowH=0
$layout = [ordered]@{}
foreach ($it in $props) {
  $b = [System.Drawing.Bitmap]::FromFile((Join-Path $out ("prop-" + $it.n + ".png")))
  if ($x + $it.w -gt $sheetW) { $x = 0; $y += $rowH; $rowH = 0 }
  $gs.DrawImage($b, $x, $y, $it.w, $it.h)
  $ax = [int]($it.w / 2)
  $ay = $it.h
  $layout[$it.n] = @{ sx=$x; sy=$y; w=$it.w; h=$it.h; ax=$ax; ay=$ay }
  $x += $it.w
  if ($it.h -gt $rowH) { $rowH = $it.h }
  $b.Dispose()
}
$gs.Dispose()
$propPath = Join-Path $PSScriptRoot "props.png"
$sheet.Save($propPath, [System.Drawing.Imaging.ImageFormat]::Png)
$sheet.Dispose()
$layout | ConvertTo-Json | Set-Content (Join-Path $PSScriptRoot "props.json")
"props $propPath"
$layout.GetEnumerator() | ForEach-Object { "{0} {1},{2} {3}x{4} ax={5} ay={6}" -f $_.Key, $_.Value.sx, $_.Value.sy, $_.Value.w, $_.Value.h, $_.Value.ax, $_.Value.ay }
