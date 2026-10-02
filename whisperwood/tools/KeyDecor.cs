using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class KeyDecor {
  public static int Main(string[] args) {
    if (args.Length < 4) {
      Console.Error.WriteLine("usage: KeyDecor.exe in out maxW maxH [magenta]");
      return 1;
    }
    string input = args[0], output = args[1];
    int maxW = int.Parse(args[2]), maxH = int.Parse(args[3]);
    bool magenta = args.Length > 4 && args[4] == "magenta";
    using (var src = (Bitmap)Image.FromFile(input)) {
      Color c0 = src.GetPixel(2, 2);
      Color c1 = src.GetPixel(src.Width - 3, 2);
      int minX = src.Width, minY = src.Height, maxX = 0, maxY = 0;
      var data = src.LockBits(new Rectangle(0, 0, src.Width, src.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      int[] px = new int[src.Width * src.Height];
      Marshal.Copy(data.Scan0, px, 0, px.Length);
      src.UnlockBits(data);
      for (int y = 0; y < src.Height; y++) {
        for (int x = 0; x < src.Width; x++) {
          int argb = px[y * src.Width + x];
          int a = (argb >> 24) & 255, r = (argb >> 16) & 255, g = (argb >> 8) & 255, b = argb & 255;
          if (IsBg(r, g, b, a, c0, c1, magenta)) continue;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX <= minX) { Console.Error.WriteLine("no subject " + input); return 2; }
      int pad = Math.Max(4, (maxX - minX) / 20);
      minX = Math.Max(0, minX - pad);
      minY = Math.Max(0, minY - pad);
      maxX = Math.Min(src.Width - 1, maxX + pad);
      maxY = Math.Min(src.Height - 1, maxY + pad);
      int cw = maxX - minX + 1, ch = maxY - minY + 1;
      using (var crop = src.Clone(new Rectangle(minX, minY, cw, ch), PixelFormat.Format32bppArgb)) {
        Punch(crop, c0, c1, magenta);
        float scale = Math.Min((float)maxW / cw, (float)maxH / ch);
        int dw = Math.Max(8, (int)Math.Round(cw * scale));
        int dh = Math.Max(8, (int)Math.Round(ch * scale));
        using (var dst = new Bitmap(dw, dh, PixelFormat.Format32bppArgb))
        using (var g = Graphics.FromImage(dst)) {
          g.InterpolationMode = InterpolationMode.HighQualityBicubic;
          g.PixelOffsetMode = PixelOffsetMode.HighQuality;
          g.CompositingMode = CompositingMode.SourceCopy;
          g.Clear(Color.Transparent);
          g.DrawImage(crop, 0, 0, dw, dh);
          Punch(dst, c0, c1, magenta);
          dst.Save(output, ImageFormat.Png);
        }
      }
    }
    Console.WriteLine(output);
    return 0;
  }

  static bool IsBg(int r, int g, int b, int a, Color c0, Color c1, bool magenta) {
    if (a < 16) return true;
    if (magenta) {
      int m = Math.Abs(r - 255) + Math.Abs(g) + Math.Abs(b - 255);
      if (m < 90) return true;
    }
    int d0 = Math.Abs(r - c0.R) + Math.Abs(g - c0.G) + Math.Abs(b - c0.B);
    int d1 = Math.Abs(r - c1.R) + Math.Abs(g - c1.G) + Math.Abs(b - c1.B);
    if (d0 < 28 || d1 < 28) return true;
    int mx = Math.Max(r, Math.Max(g, b)), mn = Math.Min(r, Math.Min(g, b));
    if (mx - mn < 18 && mx > 210) return true;
    if (mx - mn < 14 && mx > 170 && mx < 230) return true;
    return false;
  }

  static void Punch(Bitmap bmp, Color c0, Color c1, bool magenta) {
    var data = bmp.LockBits(new Rectangle(0, 0, bmp.Width, bmp.Height), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    int[] px = new int[bmp.Width * bmp.Height];
    Marshal.Copy(data.Scan0, px, 0, px.Length);
    for (int i = 0; i < px.Length; i++) {
      int argb = px[i];
      int a = (argb >> 24) & 255, r = (argb >> 16) & 255, g = (argb >> 8) & 255, b = argb & 255;
      if (IsBg(r, g, b, a, c0, c1, magenta)) px[i] = 0;
    }
    Marshal.Copy(px, 0, data.Scan0, px.Length);
    bmp.UnlockBits(data);
  }
}
