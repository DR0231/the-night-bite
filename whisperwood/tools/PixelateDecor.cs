using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class PixelateDecor {
  public static int Main(string[] args) {
    if (args.Length < 3) {
      Console.Error.WriteLine("usage: PixelateDecor.exe in out tinyMax");
      return 1;
    }
    string input = args[0], output = args[1];
    int tinyMax = int.Parse(args[2]);
    using (var src = (Bitmap)Image.FromFile(input)) {
      int sw = src.Width, sh = src.Height;
      float s = Math.Min((float)tinyMax / sw, (float)tinyMax / sh);
      int tw = Math.Max(8, (int)Math.Round(sw * s));
      int th = Math.Max(8, (int)Math.Round(sh * s));
      int ow = tw * 2, oh = th * 2;
      using (var tiny = new Bitmap(tw, th, PixelFormat.Format32bppArgb))
      using (var dst = new Bitmap(ow, oh, PixelFormat.Format32bppArgb)) {
        using (var g = Graphics.FromImage(tiny)) {
          g.InterpolationMode = InterpolationMode.HighQualityBicubic;
          g.PixelOffsetMode = PixelOffsetMode.HighQuality;
          g.CompositingMode = CompositingMode.SourceCopy;
          g.Clear(Color.Transparent);
          g.DrawImage(src, 0, 0, tw, th);
        }
        using (var g = Graphics.FromImage(dst)) {
          g.InterpolationMode = InterpolationMode.NearestNeighbor;
          g.PixelOffsetMode = PixelOffsetMode.Half;
          g.CompositingMode = CompositingMode.SourceCopy;
          g.Clear(Color.Transparent);
          g.DrawImage(tiny, 0, 0, ow, oh);
        }
        string tmp = output + ".tmp.png";
        dst.Save(tmp, ImageFormat.Png);
      }
    }
    Console.WriteLine(output);
    return 0;
  }
}
