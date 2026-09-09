# Pack new cottage props, pickups, NPCs, sleep pose; rebuild props.png + npc.png
$pack = Join-Path $PSScriptRoot "pack-cell.ps1"
$img = "C:\Users\D'Angelo R\.grok\sessions\C%3A%5CUsers%5CD%27Angelo%20R%5C.grok%5Cbin\01a08238-a2cc-7e92-a82f-a75f9d247e2e\images"
$out = Join-Path $PSScriptRoot "src"
New-Item -ItemType Directory -Force -Path $out | Out-Null

function Pack($file, $name, $w, $h, $anchor, $biggest) {
  $dest = Join-Path $out "$name.png"
  $in = Join-Path $img $file
  $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $pack, "-In", $in, "-Out", $dest, "-CellW", $w, "-CellH", $h, "-Anchor", $anchor)
  if ($biggest) { $args += "-Biggest" }
  & powershell @args
}

Pack "75.jpg" "prop-bed" 72 32 "feet" $false
Pack "77.jpg" "prop-playerSleep" 40 18 "feet" $false
Pack "81.jpg" "prop-pickupCrystal" 16 20 "center" $false
Pack "78.jpg" "npc-wren" 32 48 "feet" $false
Pack "79.jpg" "npc-bramble" 32 48 "feet" $false
Pack "80.jpg" "npc-lark" 32 48 "feet" $false

Add-Type -AssemblyName System.Drawing

$props = @(
  @{ n="treeOak"; w=48; h=72 },
  @{ n="treePine"; w=32; h=72 },
  @{ n="cottage"; w=80; h=72 },
  @{ n="tank"; w=48; h=40 },
  @{ n="bed"; w=72; h=32 },
  @{ n="bench"; w=40; h=28 },
  @{ n="crate"; w=20; h=16 },
  @{ n="rock"; w=20; h=16 },
  @{ n="fence"; w=24; h=20 },
  @{ n="sign"; w=16; h=24 },
  @{ n="stump"; w=20; h=16 },
  @{ n="certificate"; w=24; h=28 },
  @{ n="trophyWall"; w=32; h=32 },
  @{ n="mailtray"; w=24; h=16 },
  @{ n="calendar"; w=24; h=32 },
  @{ n="playerSleep"; w=40; h=18 },
  @{ n="pickupGlow"; w=16; h=20 },
  @{ n="pickupWorms"; w=20; h=16 },
  @{ n="pickupBerries"; w=16; h=20 },
  @{ n="pickupCrickets"; w=20; h=16 },
  @{ n="pickupCrystal"; w=16; h=20 }
)

$sheetW = 256; $sheetH = 256
$sheet = New-Object System.Drawing.Bitmap $sheetW, $sheetH
$gs = [System.Drawing.Graphics]::FromImage($sheet)
$gs.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))
$gs.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$gs.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$gs.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$x=0; $y=0; $rowH=0
$layout = [ordered]@{}
foreach ($it in $props) {
  $p = Join-Path $out ("prop-" + $it.n + ".png")
  if (-not (Test-Path -LiteralPath $p)) { throw "missing $p" }
  $b = [System.Drawing.Bitmap]::FromFile($p)
  if ($x + $it.w -gt $sheetW) { $x = 0; $y += $rowH; $rowH = 0 }
  $gs.DrawImage($b, $x, $y, $it.w, $it.h)
  $layout[$it.n] = @{ sx=$x; sy=$y; w=$it.w; h=$it.h; ax=[int]($it.w / 2); ay=$it.h }
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
$layout.GetEnumerator() | ForEach-Object { "{0} {1},{2} {3}x{4}" -f $_.Key, $_.Value.sx, $_.Value.sy, $_.Value.w, $_.Value.h }

$npc = New-Object System.Drawing.Bitmap (32*3), 48
$gn = [System.Drawing.Graphics]::FromImage($npc)
$gn.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))
$gn.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$gn.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$gn.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$i = 0
foreach ($name in @("wren","bramble","lark")) {
  $b = [System.Drawing.Bitmap]::FromFile((Join-Path $out ("npc-" + $name + ".png")))
  $gn.DrawImage($b, $i*32, 0, 32, 48)
  $b.Dispose()
  $i++
}
$gn.Dispose()
$npcPath = Join-Path $PSScriptRoot "npc.png"
$npc.Save($npcPath, [System.Drawing.Imaging.ImageFormat]::Png)
$npc.Dispose()
"npc $npcPath"
