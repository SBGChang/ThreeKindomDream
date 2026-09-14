param([Parameter(Mandatory=$true)][string]$SourceDirectory)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$sequenceOutput = Join-Path $PSScriptRoot '../public/art/units/sequences'
New-Item -ItemType Directory -Force $sequenceOutput | Out-Null
# Asset import only: decode the authored chroma-key, preserve pose pixels, and pack equal cells.
Add-Type -ReferencedAssemblies @('System.Drawing.Common','System.Drawing.Primitives','System.Runtime','System.Runtime.InteropServices','System.Console','System.Private.Windows.GdiPlus','System.Private.Windows.Core') -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.IO;
public static class SequenceImport {
  public static void Run(string input, string output, string clip) {
    using(var source=new Bitmap(input)) using(var rgba=new Bitmap(source.Width,source.Height,PixelFormat.Format32bppArgb)) {
      using(var g=Graphics.FromImage(rgba)) g.DrawImageUnscaled(source,0,0);
      var locked=rgba.LockBits(new Rectangle(0,0,rgba.Width,rgba.Height),ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
      byte[] pixels=new byte[locked.Stride*locked.Height]; Marshal.Copy(locked.Scan0,pixels,0,pixels.Length);
      for(int i=0;i<pixels.Length;i+=4) {
        int b=pixels[i], green=pixels[i+1], r=pixels[i+2], high=Math.Max(r,b), spill=green-high;
        if(spill>200) { pixels[i+3]=0; continue; }
        if(spill>3 && green>15) {
          int alpha=Math.Max(1,255-spill);
          pixels[i+3]=(byte)(pixels[i+3]*alpha/255);
          pixels[i]=(byte)Math.Min(255,b*255/alpha);
          pixels[i+1]=(byte)Math.Min(255,Math.Min(green,high)*255/alpha);
          pixels[i+2]=(byte)Math.Min(255,r*255/alpha);
        }
      }
      Marshal.Copy(pixels,0,locked.Scan0,pixels.Length); rgba.UnlockBits(locked);
      Directory.CreateDirectory(Path.Combine(output,clip));
      using(var atlas=new Bitmap(1728,1152,PixelFormat.Format32bppArgb)) using(var atlasG=Graphics.FromImage(atlas)) {
        int anchorX=0, anchorY=0;
        for(int frame=0;frame<6;frame++) {
          int col=frame%3,row=frame/3, localX=0,width=512;
          // The release streak extends into the otherwise empty gutter. Preserve it without
          // importing its tip as a detached speck in the following character's cell.
          if(clip=="volley" && frame==3) width=544;
          if(clip=="volley" && frame==4) { localX=32; width=480; }
          using(var cell=new Bitmap(576,576,PixelFormat.Format32bppArgb)) using(var cg=Graphics.FromImage(cell)) {
            int dx=0,dy=0;
            if(clip=="charge") {
              int top=512; for(int y=0;y<200;y++) for(int x=120;x<390;x++) if(rgba.GetPixel(col*512+x,row*512+y).A>180) top=Math.Min(top,y);
              int[] bob={0,3,0,-5,-7,-3}; if(frame==0) anchorY=top; dy=anchorY-top+bob[frame];
            } else {
              int bottom=0; int endX=clip=="ignite"?360:470;
              for(int y=380;y<512;y++) for(int x=35;x<endX;x++) if(rgba.GetPixel(col*512+x,row*512+y).A>180) bottom=Math.Max(bottom,y);
              int left=512,right=0;
              // Keep the front boot in place for kneeling; use both boots for the archer.
              int startX=clip=="ignite"?200:35;
              for(int y=bottom-10;y<=bottom;y++) for(int x=startX;x<endX;x++) if(rgba.GetPixel(col*512+x,row*512+y).A>180) { left=Math.Min(left,x);right=Math.Max(right,x); }
              int center=(left+right)/2;
              if(frame==0) { anchorX=center;anchorY=bottom; }
              dx=anchorX-center;dy=anchorY-bottom;
            }
            cg.DrawImage(rgba,new Rectangle(32+localX+dx,32+dy,width,512),new Rectangle(col*512+localX,row*512,width,512),GraphicsUnit.Pixel);
            cell.Save(Path.Combine(output,clip,(frame+1).ToString("00")+".png"),ImageFormat.Png);
            atlasG.DrawImageUnscaled(cell,col*576,row*576);
            Console.WriteLine(clip+" frame "+(frame+1)+": offset "+dx+","+dy);
          }
        }
        atlas.Save(Path.Combine(output,clip+"-six-v1.png"),ImageFormat.Png);
      }
    }
  }
}
'@
foreach($sequenceClip in @('charge','ignite','volley')) {
  [SequenceImport]::Run((Join-Path $SourceDirectory ($sequenceClip+'-key.png')), [IO.Path]::GetFullPath($sequenceOutput), $sequenceClip)
}
