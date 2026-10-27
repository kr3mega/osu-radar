using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;

public static class IcoWriter {
    public static void SaveIco(Bitmap masterBmp, string outputPath) {
        int[] sizes = new int[] { 256, 128, 64, 48, 32, 24, 16 };
        
        using (var ms = new MemoryStream())
        using (var bw = new BinaryWriter(ms)) {
            // ICONDIR header
            bw.Write((ushort)0); // idReserved
            bw.Write((ushort)1); // idType: 1 = icon
            bw.Write((ushort)sizes.Length); // idCount

            byte[][] imageBuffers = new byte[sizes.Length][];

            // Render each size
            for (int i = 0; i < sizes.Length; i++) {
                int sz = sizes[i];
                using (var resized = new Bitmap(sz, sz, PixelFormat.Format32bppArgb)) {
                    using (var g = Graphics.FromImage(resized)) {
                        g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                        g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;
                        g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                        g.Clear(Color.Transparent);
                        g.DrawImage(masterBmp, 0, 0, sz, sz);
                    }

                    if (sz == 256) {
                        // 256x256 is stored as PNG (standard Windows Vista+ format)
                        using (var pngMs = new MemoryStream()) {
                            resized.Save(pngMs, ImageFormat.Png);
                            imageBuffers[i] = pngMs.ToArray();
                        }
                    } else {
                        // All smaller sizes (128, 64, 48, 32, 24, 16) are stored as standard uncompressed DIB
                        imageBuffers[i] = CreateDibData(resized);
                    }
                }
            }

            int offset = 6 + (16 * sizes.Length);

            // Write directory entries
            for (int i = 0; i < sizes.Length; i++) {
                int sz = sizes[i];
                byte w = (byte)(sz >= 256 ? 0 : sz);
                byte h = (byte)(sz >= 256 ? 0 : sz);

                bw.Write(w); // bWidth
                bw.Write(h); // bHeight
                bw.Write((byte)0); // bColorCount
                bw.Write((byte)0); // bReserved
                bw.Write((ushort)1); // wPlanes
                bw.Write((ushort)32); // wBitCount
                bw.Write((uint)imageBuffers[i].Length); // dwBytesInRes
                bw.Write((uint)offset); // dwImageOffset

                offset += imageBuffers[i].Length;
            }

            // Write image buffers
            for (int i = 0; i < sizes.Length; i++) {
                bw.Write(imageBuffers[i]);
            }

            bw.Flush();
            File.WriteAllBytes(outputPath, ms.ToArray());
        }
    }

    private static byte[] CreateDibData(Bitmap bmp) {
        int width = bmp.Width;
        int height = bmp.Height;

        // BitmapInfoHeader: 40 bytes
        int headerSize = 40;
        int pixelDataSize = width * height * 4;
        
        // AND mask: 1 bit per pixel, aligned to 4 bytes (32-bit DWORD) per row
        int andRowBytes = ((width + 31) / 32) * 4;
        int andMaskSize = andRowBytes * height;

        int totalSize = headerSize + pixelDataSize + andMaskSize;
        byte[] buffer = new byte[totalSize];

        using (var ms = new MemoryStream(buffer))
        using (var bw = new BinaryWriter(ms)) {
            // BITMAPINFOHEADER
            bw.Write((uint)headerSize); // biSize
            bw.Write((int)width);       // biWidth
            bw.Write((int)(height * 2)); // biHeight (doubled for XOR + AND mask)
            bw.Write((ushort)1);        // biPlanes
            bw.Write((ushort)32);       // biBitCount
            bw.Write((uint)0);          // biCompression = BI_RGB
            bw.Write((uint)(pixelDataSize + andMaskSize)); // biSizeImage
            bw.Write((int)0);           // biXPelsPerMeter
            bw.Write((int)0);           // biYPelsPerMeter
            bw.Write((uint)0);          // biClrUsed
            bw.Write((uint)0);          // biClrImportant

            // Raw BGRA pixels bottom-to-top
            for (int y = height - 1; y >= 0; y--) {
                for (int x = 0; x < width; x++) {
                    Color c = bmp.GetPixel(x, y);
                    bw.Write((byte)c.B);
                    bw.Write((byte)c.G);
                    bw.Write((byte)c.R);
                    bw.Write((byte)c.A);
                }
            }

            // AND mask (all zeroes for 32bpp alpha icons)
            for (int i = 0; i < andMaskSize; i++) {
                bw.Write((byte)0);
            }

            bw.Flush();
        }

        return buffer;
    }
}
