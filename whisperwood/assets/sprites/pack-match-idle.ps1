# Pack a sprite into CellW x CellH using the same body height as -Ref (idle).
# Feet at the bottom, horizontally centered. Wide strides may clip left/right.
param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$Ref,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$CellW = 32,
  [int]$CellH = 48
)

Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class SpriteFit {
  public static bool IsKey(byte r, byte g, byte b, byte a) {
    if (a < 16) return true;
    return r > 150 && b > 150 && g < 165 && r > g + 30 && b > g + 30;
  }

  public static Rectangle Content(Bitmap src) {
    int w = src.Width, h = src.Height;
    var data = src.LockBits(new Rectangle(0,0,w,h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    int stride = data.Stride;
    byte[] buf = new byte[Math.Abs(stride) * h];
    Marshal.Copy(data.Scan0, buf, 0, buf.Length);
    src.UnlockBits(data);
    int minX = w, minY = h, maxX = 0, maxY = 0;
    bool any = false;
    for (int y = 0; y < h; y++) {
      int row = y * stride;
      for (int x = 0; x < w; x++) {
        int i = row + x * 4;
        byte b = buf[i], g = buf[i+1], r = buf[i+2], a = buf[i+3];
        if (!IsKey(r,g,b,a)) {
          any = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!any) throw new Exception("no content in " + src.Width + "x" + src.Height);
    return new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
  }

  public static Bitmap KeyedCrop(Bitmap src) {
    var box = Content(src);
    var dst = new Bitmap(box.Width, box.Height, PixelFormat.Format32bppArgb);
    var sdata = src.LockBits(new Rectangle(0,0,src.Width,src.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    var ddata = dst.LockBits(new Rectangle(0,0,box.Width,box.Height), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    int ss = sdata.Stride, ds = ddata.Stride;
    byte[] sbuf = new byte[Math.Abs(ss) * src.Height];
    byte[] dbuf = new byte[Math.Abs(ds) * box.Height];
    Marshal.Copy(sdata.Scan0, sbuf, 0, sbuf.Length);
    src.UnlockBits(sdata);
    for (int y = 0; y < box.Height; y++) {
      int srow = (box.Y + y) * ss;
      int drow = y * ds;
      for (int x = 0; x < box.Width; x++) {
        int si = srow + (box.X + x) * 4;
        int di = drow + x * 4;
        byte b = sbuf[si], g = sbuf[si+1], r = sbuf[si+2], a = sbuf[si+3];
        if (IsKey(r,g,b,a)) { dbuf[di]=0; dbuf[di+1]=0; dbuf[di+2]=0; dbuf[di+3]=0; }
        else { dbuf[di]=b; dbuf[di+1]=g; dbuf[di+2]=r; dbuf[di+3]=255; }
      }
    }
    Marshal.Copy(dbuf, 0, ddata.Scan0, dbuf.Length);
    dst.UnlockBits(ddata);
    return dst;
  }

  public static Bitmap Fit(Bitmap src, int refH, int cellW, int cellH) {
    var crop = KeyedCrop(src);
    float scale = (float)refH / (float)crop.Height;
    int dw = Math.Max(1, (int)Math.Round(crop.Width * scale));
    int dh = Math.Max(1, (int)Math.Round(crop.Height * scale));
    var cell = new Bitmap(cellW, cellH, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(cell)) {
      g.Clear(Color.FromArgb(0,0,0,0));
      g.InterpolationMode = InterpolationMode.NearestNeighbor;
      g.PixelOffsetMode = PixelOffsetMode.Half;
      g.CompositingMode = CompositingMode.SourceOver;
      int dx = (cellW - dw) / 2;
      int dy = cellH - dh;
      g.DrawImage(crop, new Rectangle(dx, dy, dw, dh), new Rectangle(0,0,crop.Width,crop.Height), GraphicsUnit.Pixel);
    }
    crop.Dispose();
    return cell;
  }
}
"@ -ReferencedAssemblies System.Drawing.dll

$refBmp = [System.Drawing.Bitmap]::FromFile($Ref)
$refBox = [SpriteFit]::Content($refBmp)
$refH = $refBox.Height
$refBmp.Dispose()

$src = [System.Drawing.Bitmap]::FromFile($In)
$outBmp = [SpriteFit]::Fit($src, $refH, $CellW, $CellH)
$src.Dispose()
$dir = Split-Path $Out
if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$outBmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
"{0} matchedH={1} -> {2}x{3}" -f $Out, $refH, $outBmp.Width, $outBmp.Height
$outBmp.Dispose()
