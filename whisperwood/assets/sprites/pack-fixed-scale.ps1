# Pack a sprite at the same pixels-per-body as -Ref, into CellW x CellH, feet at bottom.
param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$Ref,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$BodyH = 44,
  [int]$CellW = 80,
  [int]$CellH = 72
)
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class SpriteScale {
  public static bool IsKey(byte r, byte g, byte b, byte a) {
    if (a < 16) return true;
    return r >= 150 && b >= 130 && g <= 190 && (r - g) >= 20 && (b - g) >= 15;
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
        if (IsKey(buf[i+2], buf[i+1], buf[i], buf[i+3])) continue;
        any = true;
        if (x < minX) minX = x; if (y < minY) minY = y;
        if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      }
    }
    if (!any) throw new Exception("no content");
    return new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
  }
  public static Bitmap Crop(Bitmap src, Rectangle box) {
    var dst = new Bitmap(box.Width, box.Height, PixelFormat.Format32bppArgb);
    var sdata = src.LockBits(new Rectangle(0,0,src.Width,src.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    var ddata = dst.LockBits(new Rectangle(0,0,box.Width,box.Height), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    int ss = sdata.Stride, ds = ddata.Stride;
    byte[] sbuf = new byte[Math.Abs(ss)*src.Height];
    byte[] dbuf = new byte[Math.Abs(ds)*box.Height];
    Marshal.Copy(sdata.Scan0, sbuf, 0, sbuf.Length);
    src.UnlockBits(sdata);
    for (int y = 0; y < box.Height; y++) {
      int srow = (box.Y + y) * ss, drow = y * ds;
      for (int x = 0; x < box.Width; x++) {
        int si = srow + (box.X + x) * 4, di = drow + x * 4;
        byte b = sbuf[si], g = sbuf[si+1], r = sbuf[si+2], a = sbuf[si+3];
        if (IsKey(r,g,b,a)) { dbuf[di]=0; dbuf[di+1]=0; dbuf[di+2]=0; dbuf[di+3]=0; }
        else { dbuf[di]=b; dbuf[di+1]=g; dbuf[di+2]=r; dbuf[di+3]=255; }
      }
    }
    Marshal.Copy(dbuf, 0, ddata.Scan0, dbuf.Length);
    dst.UnlockBits(ddata);
    return dst;
  }

  public static int FeetX(Bitmap crop) {
    int y0 = (int)(crop.Height * 0.6);
    var data = crop.LockBits(new Rectangle(0,0,crop.Width,crop.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    int stride = data.Stride;
    byte[] buf = new byte[Math.Abs(stride) * crop.Height];
    Marshal.Copy(data.Scan0, buf, 0, buf.Length);
    crop.UnlockBits(data);
    long acc = 0; int n = 0;
    for (int y = y0; y < crop.Height; y++) {
      int row = y * stride;
      for (int x = 0; x < crop.Width; x++) {
        int i = row + x * 4;
        if (IsKey(buf[i+2], buf[i+1], buf[i], buf[i+3])) continue;
        acc += x; n++;
      }
    }
    return n > 0 ? (int)(acc / n) : crop.Width / 2;
  }
}
"@ -ReferencedAssemblies System.Drawing.dll

$refBmp = [System.Drawing.Bitmap]::FromFile($Ref)
$refBox = [SpriteScale]::Content($refBmp)
$scale = [double]$BodyH / [double]$refBox.Height
$refBmp.Dispose()

$src = [System.Drawing.Bitmap]::FromFile($In)
$crop = [SpriteScale]::Crop($src, [SpriteScale]::Content($src))
$src.Dispose()
$dw = [Math]::Max(1, [int][Math]::Round($crop.Width * $scale))
$dh = [Math]::Max(1, [int][Math]::Round($crop.Height * $scale))
$feetX = [SpriteScale]::FeetX($crop)
$feetXd = [int][Math]::Round($feetX * $scale)
$cell = New-Object System.Drawing.Bitmap $CellW, $CellH
$g = [System.Drawing.Graphics]::FromImage($cell)
$g.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$dx = [int]($CellW / 2) - $feetXd
$dy = $CellH - $dh
$g.DrawImage($crop, (New-Object System.Drawing.Rectangle $dx, $dy, $dw, $dh), (New-Object System.Drawing.Rectangle 0,0,$crop.Width,$crop.Height), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose(); $crop.Dispose()
$dir = Split-Path $Out
if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$cell.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
"{0} scale={1:N3} dest={2}x{3} in {4}x{5}" -f $Out, $scale, $dw, $dh, $CellW, $CellH
$cell.Dispose()
