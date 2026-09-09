# Key magenta, crop to content, fit into a cell. No 1:2 character crop.
param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$Out,
  [Parameter(Mandatory = $true)][int]$CellW,
  [Parameter(Mandatory = $true)][int]$CellH,
  [ValidateSet("feet", "center")][string]$Anchor = "feet",
  [switch]$Biggest
)

Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class CellKey {
  public static bool IsKey(byte r, byte g, byte b) {
    return r >= 150 && b >= 130 && g <= 200 && (r - g) >= 18 && (b - g) >= 12;
  }

  public static Bitmap Extract(Bitmap src, int cellW, int cellH, bool feet, bool biggest) {
    int w = src.Width, h = src.Height;
    var rect = new Rectangle(0, 0, w, h);
    var data = src.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    int stride = data.Stride;
    int bytes = Math.Abs(stride) * h;
    byte[] buf = new byte[bytes];
    Marshal.Copy(data.Scan0, buf, 0, bytes);
    src.UnlockBits(data);

    // Flood-key from the border so interior purples (hair, cloth) stay.
    bool[] keyed = new bool[w * h];
    int[] qx = new int[w * h];
    int[] qy = new int[w * h];
    int qh = 0;
    System.Action<int,int> enq = (int x, int y) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      int idx = y * w + x;
      if (keyed[idx]) return;
      int i = y * stride + x * 4;
      if (!IsKey(buf[i+2], buf[i+1], buf[i])) return;
      keyed[idx] = true;
      qx[qh] = x; qy[qh] = y; qh++;
    };
    for (int x = 0; x < w; x++) { enq(x, 0); enq(x, h - 1); }
    for (int y = 0; y < h; y++) { enq(0, y); enq(w - 1, y); }
    for (int qi = 0; qi < qh; qi++) {
      int x = qx[qi], y = qy[qi];
      enq(x - 1, y); enq(x + 1, y); enq(x, y - 1); enq(x, y + 1);
    }

    if (biggest) {
      int[] seen = new int[w * h];
      int best = 0, bestX = 0, bestY = 0, mark = 0;
      for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
        int idx = y * w + x;
        if (keyed[idx] || seen[idx] != 0) continue;
        mark++;
        int n = 0, head = 0, tail = 0;
        qx[tail] = x; qy[tail] = y; tail++;
        seen[idx] = mark;
        while (head < tail) {
          int cx = qx[head], cy = qy[head]; head++; n++;
          int[] dxs = { -1, 1, 0, 0 }; int[] dys = { 0, 0, -1, 1 };
          for (int k = 0; k < 4; k++) {
            int nx = cx + dxs[k], ny = cy + dys[k];
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            int ni = ny * w + nx;
            if (keyed[ni] || seen[ni] != 0) continue;
            seen[ni] = mark; qx[tail] = nx; qy[tail] = ny; tail++;
          }
        }
        if (n > best) { best = n; bestX = x; bestY = y; }
      }
      int keep = seen[bestY * w + bestX];
      for (int i = 0; i < seen.Length; i++) {
        if (!keyed[i] && seen[i] != keep) keyed[i] = true;
      }
    }

    int minX = w, minY = h, maxX = 0, maxY = 0;
    bool any = false;
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        if (keyed[y * w + x]) continue;
        any = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (!any) throw new Exception("no non-key pixels");

    int pad = Math.Max(2, (int)(Math.Max(maxX - minX, maxY - minY) * 0.03));
    minX = Math.Max(0, minX - pad);
    minY = Math.Max(0, minY - pad);
    maxX = Math.Min(w - 1, maxX + pad);
    maxY = Math.Min(h - 1, maxY + pad);
    int cw = maxX - minX + 1;
    int ch = maxY - minY + 1;

    var crop = new Bitmap(cw, ch, PixelFormat.Format32bppArgb);
    var crect = new Rectangle(0, 0, cw, ch);
    var cdata = crop.LockBits(crect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    int cstride = cdata.Stride;
    byte[] cbuf = new byte[Math.Abs(cstride) * ch];
    for (int y = 0; y < ch; y++) {
      int srow = (minY + y) * stride;
      int drow = y * cstride;
      for (int x = 0; x < cw; x++) {
        int si = srow + (minX + x) * 4;
        int di = drow + x * 4;
        byte b = buf[si], g = buf[si+1], r = buf[si+2];
        if (keyed[(minY + y) * w + (minX + x)]) { cbuf[di]=0; cbuf[di+1]=0; cbuf[di+2]=0; cbuf[di+3]=0; }
        else { cbuf[di]=b; cbuf[di+1]=g; cbuf[di+2]=r; cbuf[di+3]=255; }
      }
    }
    Marshal.Copy(cbuf, 0, cdata.Scan0, cbuf.Length);
    crop.UnlockBits(cdata);

    var dst = new Bitmap(cellW, cellH, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(dst)) {
      g.Clear(Color.FromArgb(0, 0, 0, 0));
      g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
      g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;
      g.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceCopy;
      float scale = Math.Min((float)cellW / cw, (float)cellH / ch);
      int dw = Math.Max(1, (int)Math.Round(cw * scale));
      int dh = Math.Max(1, (int)Math.Round(ch * scale));
      if (dw > cellW) dw = cellW;
      if (dh > cellH) dh = cellH;
      int dx = (cellW - dw) / 2;
      int dy = feet ? (cellH - dh) : (cellH - dh) / 2;
      g.DrawImage(crop, new Rectangle(dx, dy, dw, dh), new Rectangle(0, 0, cw, ch), GraphicsUnit.Pixel);
    }
    crop.Dispose();
    return dst;
  }
}
"@ -ReferencedAssemblies System.Drawing.dll

$src = [System.Drawing.Bitmap]::FromFile($In)
$keyed = [CellKey]::Extract($src, $CellW, $CellH, ($Anchor -eq "feet"), [bool]$Biggest)
$src.Dispose()
$dir = Split-Path $Out
if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$keyed.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
"{0} {1}x{2}" -f $Out, $keyed.Width, $keyed.Height
$keyed.Dispose()
