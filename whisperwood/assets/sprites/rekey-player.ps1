# Punch leftover magenta/hot-pink fishing-line pixels out of player.png
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class PinkKey {
  public static bool IsPink(byte r, byte g, byte b) {
    if (r < 150 || g > 170) return false;
    int rg = r - g;
    int chroma = r + b - 2 * g;
    // Magenta, hot pink, and the baked fishing-line
    return rg >= 35 && b >= 70 && chroma >= 40;
  }

  public static int Punch(string path) {
    var src = new Bitmap(path);
    int w = src.Width, h = src.Height;
    var rect = new Rectangle(0, 0, w, h);
    var data = src.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    int stride = data.Stride;
    byte[] buf = new byte[Math.Abs(stride) * h];
    Marshal.Copy(data.Scan0, buf, 0, buf.Length);
    int n = 0;
    for (int y = 0; y < h; y++) {
      int row = y * stride;
      for (int x = 0; x < w; x++) {
        int i = row + x * 4;
        byte b = buf[i], g = buf[i+1], r = buf[i+2];
        if (IsPink(r, g, b)) { buf[i]=0; buf[i+1]=0; buf[i+2]=0; buf[i+3]=0; n++; }
      }
    }
    Marshal.Copy(buf, 0, data.Scan0, buf.Length);
    src.UnlockBits(data);
    string tmp = path + ".tmp.png";
    src.Save(tmp, ImageFormat.Png);
    src.Dispose();
    System.IO.File.Delete(path);
    System.IO.File.Move(tmp, path);
    return n;
  }
}
"@ -ReferencedAssemblies System.Drawing.dll

$p = Join-Path $PSScriptRoot "player.png"
$n = [PinkKey]::Punch($p)
"punched $n pink pixels from $p"
