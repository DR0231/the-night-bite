# Downsample seamless textures to 16x16 fills + N-edge / NW-corner overlays.
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class TileMake {
  public static Bitmap NnResize(Bitmap src, int w, int h) {
    var dst = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(dst)) {
      g.InterpolationMode = InterpolationMode.NearestNeighbor;
      g.PixelOffsetMode = PixelOffsetMode.Half;
      g.CompositingMode = CompositingMode.SourceCopy;
      g.DrawImage(src, new Rectangle(0,0,w,h), new Rectangle(0,0,src.Width,src.Height), GraphicsUnit.Pixel);
    }
    return dst;
  }

  public static Bitmap Crop16(Bitmap src, int ox, int oy) {
    var dst = new Bitmap(16, 16, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(dst)) {
      g.InterpolationMode = InterpolationMode.NearestNeighbor;
      g.PixelOffsetMode = PixelOffsetMode.Half;
      g.DrawImage(src, new Rectangle(0,0,16,16), new Rectangle(ox, oy, 16, 16), GraphicsUnit.Pixel);
    }
    return dst;
  }

  static Color Mix(Color a, Color b, int num, int den) {
    return Color.FromArgb(255,
      (a.R * (den-num) + b.R * num) / den,
      (a.G * (den-num) + b.G * num) / den,
      (a.B * (den-num) + b.B * num) / den);
  }

  public static Bitmap EdgeN(Bitmap fill, Color lip) {
    var dst = new Bitmap(16, 16, PixelFormat.Format32bppArgb);
    for (int y = 0; y < 16; y++)
      for (int x = 0; x < 16; x++) {
        if (y > 4) { dst.SetPixel(x,y, Color.FromArgb(0,0,0,0)); continue; }
        Color c = fill.GetPixel(x, y % 16);
        int t = 4 - y;
        dst.SetPixel(x, y, Mix(c, lip, t + 1, 6));
      }
    return dst;
  }

  public static Bitmap CornerNW(Bitmap fill, Color lip) {
    var dst = new Bitmap(16, 16, PixelFormat.Format32bppArgb);
    for (int y = 0; y < 16; y++)
      for (int x = 0; x < 16; x++) {
        if (y > 4 || x > 4) { dst.SetPixel(x,y, Color.FromArgb(0,0,0,0)); continue; }
        Color c = fill.GetPixel(x, y);
        int t = Math.Max(4 - y, 4 - x);
        dst.SetPixel(x, y, Mix(c, lip, t + 1, 6));
      }
    return dst;
  }
}
"@ -ReferencedAssemblies System.Drawing.dll

$imgDir = "C:\Users\D'Angelo R\.grok\sessions\C%3A%5CUsers%5CD%27Angelo%20R%5C.grok%5Cbin\01a08238-a2cc-7e92-a82f-a75f9d247e2e\images"
$outDir = "C:\Whisperwoodfishing\assets\sprites\src\tiles"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Load-Nn($file, $size) {
  $src = [System.Drawing.Bitmap]::FromFile((Join-Path $imgDir $file))
  $r = [TileMake]::NnResize($src, $size, $size)
  $src.Dispose()
  return $r
}

# 48x48 then three 16x16 crops = variants
function Save-Fills($file, $stem) {
  $big = Load-Nn $file 48
  $a = [TileMake]::Crop16($big, 0, 0)
  $b = [TileMake]::Crop16($big, 16, 16)
  $c = [TileMake]::Crop16($big, 32, 8)
  $a.Save((Join-Path $outDir "$stem-0.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $b.Save((Join-Path $outDir "$stem-1.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $c.Save((Join-Path $outDir "$stem-2.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $a.Dispose(); $b.Dispose(); $c.Dispose(); $big.Dispose()
}

Save-Fills "34.jpg" "grass"
Save-Fills "38.jpg" "grassb"
Save-Fills "32.jpg" "dirt"
Save-Fills "31.jpg" "shore"
Save-Fills "35.jpg" "stone"
Save-Fills "33.jpg" "wood"
Save-Fills "30.jpg" "pond"
Save-Fills "36.jpg" "river"
Save-Fills "37.jpg" "cavew"

# Extra grass variants from denser edit
Copy-Item (Join-Path $outDir "grassb-0.png") (Join-Path $outDir "grass-3.png") -Force
Copy-Item (Join-Path $outDir "grassb-1.png") (Join-Path $outDir "grass-4.png") -Force

# 2x2 seam check for grass-0
$g0 = [System.Drawing.Bitmap]::FromFile((Join-Path $outDir "grass-0.png"))
$chk = New-Object System.Drawing.Bitmap 64, 64
$gc = [System.Drawing.Graphics]::FromImage($chk)
$gc.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$gc.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
foreach ($yy in 0,1) { foreach ($xx in 0,1) {
  $gc.DrawImage($g0, $xx*32, $yy*32, 32, 32)
}}
$chk.Save((Join-Path $outDir "grass-0-2x2.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$gc.Dispose(); $chk.Dispose(); $g0.Dispose()

# Build sheet: 8 cols x 12 rows of 16px
# cols: fill0 fill1 fill2 edgeN cornerNW (rest empty)
# rows: grass dirt shore stone wood caveFloor caveWall pond river lake marsh caveWater
$rows = @(
  @{ name="grass"; fill="grass"; lip=[System.Drawing.Color]::FromArgb(90,70,40) },
  @{ name="dirt"; fill="dirt"; lip=[System.Drawing.Color]::FromArgb(70,50,30) },
  @{ name="shore"; fill="shore"; lip=[System.Drawing.Color]::FromArgb(60,80,70) },
  @{ name="stone"; fill="stone"; lip=[System.Drawing.Color]::FromArgb(40,40,48) },
  @{ name="wood"; fill="wood"; lip=[System.Drawing.Color]::FromArgb(50,30,16) },
  @{ name="caveFloor"; fill="stone"; lip=[System.Drawing.Color]::FromArgb(20,24,32) },
  @{ name="caveWall"; fill="stone"; lip=[System.Drawing.Color]::FromArgb(18,18,22) },
  @{ name="pond"; fill="pond"; lip=[System.Drawing.Color]::FromArgb(180,200,180) },
  @{ name="river"; fill="river"; lip=[System.Drawing.Color]::FromArgb(180,210,220) },
  @{ name="lake"; fill="pond"; lip=[System.Drawing.Color]::FromArgb(160,180,210) },
  @{ name="marsh"; fill="pond"; lip=[System.Drawing.Color]::FromArgb(140,160,120) },
  @{ name="caveWater"; fill="cavew"; lip=[System.Drawing.Color]::FromArgb(200,240,255) }
)

$sheet = New-Object System.Drawing.Bitmap (8*16), (12*16)
$gs = [System.Drawing.Graphics]::FromImage($sheet)
$gs.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))
$gs.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$gs.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

for ($ri=0; $ri -lt $rows.Count; $ri++) {
  $row = $rows[$ri]
  $f0 = [System.Drawing.Bitmap]::FromFile((Join-Path $outDir ($row.fill + "-0.png")))
  $f1path = Join-Path $outDir ($row.fill + "-1.png")
  $f2path = Join-Path $outDir ($row.fill + "-2.png")
  $f1 = if (Test-Path $f1path) { [System.Drawing.Bitmap]::FromFile($f1path) } else { $f0 }
  $f2 = if (Test-Path $f2path) { [System.Drawing.Bitmap]::FromFile($f2path) } else { $f0 }
  $edge = [TileMake]::EdgeN($f0, $row.lip)
  $corn = [TileMake]::CornerNW($f0, $row.lip)
  $gs.DrawImage($f0, 0, $ri*16, 16, 16)
  $gs.DrawImage($f1, 16, $ri*16, 16, 16)
  $gs.DrawImage($f2, 32, $ri*16, 16, 16)
  $gs.DrawImage($edge, 48, $ri*16, 16, 16)
  $gs.DrawImage($corn, 64, $ri*16, 16, 16)
  if ($f1 -ne $f0) { $f1.Dispose() }
  if ($f2 -ne $f0) { $f2.Dispose() }
  $f0.Dispose(); $edge.Dispose(); $corn.Dispose()
}
$gs.Dispose()
$sheetPath = "C:\Whisperwoodfishing\assets\sprites\tiles-ground.png"
$sheet.Save($sheetPath, [System.Drawing.Imaging.ImageFormat]::Png)
"wrote $sheetPath $($sheet.Width)x$($sheet.Height)"
$sheet.Dispose()
