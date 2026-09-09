# Key magenta, crop, pad to 1:2, feet at bottom. Optional nearest-neighbor size.
param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$CellW = 0,
  [int]$CellH = 0
)

Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class SpriteKey {
  public static bool IsKey(byte r, byte g, byte b) {
    return r > 150 && b > 150 && g < 165 && r > g + 30 && b > g + 30;
  }

  public static Bitmap Extract(Bitmap src) {
    int w = src.Width, h = src.Height;
    var rect = new Rectangle(0, 0, w, h);
    var data = src.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    int stride = data.Stride;
    int bytes = Math.Abs(stride) * h;
    byte[] buf = new byte[bytes];
    Marshal.Copy(data.Scan0, buf, 0, bytes);
    src.UnlockBits(data);

    int minX = w, minY = h, maxX = 0, maxY = 0;
    bool any = false;
    for (int y = 0; y < h; y++) {
      int row = y * stride;
      for (int x = 0; x < w; x++) {
        int i = row + x * 4;
        byte b = buf[i], g = buf[i+1], r = buf[i+2];
        if (!IsKey(r, g, b)) {
          any = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!any) throw new Exception("no non-key pixels");

    int pad = Math.Max(2, (int)(Math.Max(maxX-minX, maxY-minY) * 0.04));
    minX = Math.Max(0, minX - pad);
    minY = Math.Max(0, minY - pad);
    maxX = Math.Min(w-1, maxX + pad);
    maxY = Math.Min(h-1, maxY + pad);
    int cw = maxX - minX + 1;
    int ch = maxY - minY + 1;
    // Rods and JPEG fringe make a wide box; keep a 1:2 window on the body.
    if (cw > ch) {
      long acc = 0, cnt = 0;
      for (int y = minY; y <= maxY; y++) {
        int row = y * stride;
        for (int x = minX; x <= maxX; x++) {
          int i = row + x * 4;
          byte b = buf[i], g = buf[i+1], r = buf[i+2];
          if (!IsKey(r, g, b)) { acc += x; cnt++; }
        }
      }
      int cx = cnt > 0 ? (int)(acc / cnt) : (minX + maxX) / 2;
      int wantW = Math.Max(8, ch / 2 + pad);
      minX = Math.Max(0, cx - wantW / 2);
      maxX = Math.Min(w - 1, minX + wantW);
      minX = Math.Max(0, maxX - wantW);
      cw = maxX - minX + 1;
    }

    int cellH = Math.Max(ch, cw * 2);
    int cellW = (int)Math.Ceiling(cellH / 2.0);
    var dst = new Bitmap(cellW, cellH, PixelFormat.Format32bppArgb);
    var drect = new Rectangle(0, 0, cellW, cellH);
    var ddata = dst.LockBits(drect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    int dstride = ddata.Stride;
    byte[] dbuf = new byte[Math.Abs(dstride) * cellH];
    int dx0 = (cellW - cw) / 2;
    int dy0 = cellH - ch;
    for (int y = 0; y < ch; y++) {
      int srow = (minY + y) * stride;
      int drow = (dy0 + y) * dstride;
      for (int x = 0; x < cw; x++) {
        int si = srow + (minX + x) * 4;
        byte b = buf[si], g = buf[si+1], r = buf[si+2], a = buf[si+3];
        int di = drow + (dx0 + x) * 4;
        if (IsKey(r, g, b)) { dbuf[di]=0; dbuf[di+1]=0; dbuf[di+2]=0; dbuf[di+3]=0; }
        else { dbuf[di]=b; dbuf[di+1]=g; dbuf[di+2]=r; dbuf[di+3]=255; }
      }
    }
    Marshal.Copy(dbuf, 0, ddata.Scan0, dbuf.Length);
    dst.UnlockBits(ddata);
    return dst;
  }
}
"@ -ReferencedAssemblies System.Drawing.dll

$src = [System.Drawing.Bitmap]::FromFile($In)
$keyed = [SpriteKey]::Extract($src)
$src.Dispose()

if ($CellW -gt 0 -and $CellH -gt 0) {
  $small = New-Object System.Drawing.Bitmap $CellW, $CellH
  $g = [System.Drawing.Graphics]::FromImage($small)
  $g.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.DrawImage($keyed, (New-Object System.Drawing.Rectangle 0,0,$CellW,$CellH), (New-Object System.Drawing.Rectangle 0,0,$keyed.Width,$keyed.Height), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $keyed.Dispose()
  $keyed = $small
}

$dir = Split-Path $Out
if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$keyed.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
"{0} {1}x{2}" -f $Out, $keyed.Width, $keyed.Height
$keyed.Dispose()
