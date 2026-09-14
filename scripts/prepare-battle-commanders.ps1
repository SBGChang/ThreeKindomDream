$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$battleOutput=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/art/units/battle-demo/commanders'))
New-Item -ItemType Directory -Force $battleOutput | Out-Null
Add-Type -ReferencedAssemblies @('System.Drawing.Common','System.Drawing.Primitives','System.Runtime','System.Runtime.InteropServices','System.Console','System.Private.Windows.GdiPlus','System.Private.Windows.Core') -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.IO;
public static class CommanderArtImport {
 public static void Run(string input,string output,string clip,int rows) {
  using(var src=new Bitmap(input))using(var rgba=new Bitmap(src.Width,src.Height,PixelFormat.Format32bppArgb)) {
   using(var g=Graphics.FromImage(rgba))g.DrawImageUnscaled(src,0,0);
   // Blue source artwork already has alpha; preserve it. Red artwork uses a keyed source.
   if(src.GetPixel(0,0).A>0){
    var bits=rgba.LockBits(new Rectangle(0,0,rgba.Width,rgba.Height),ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
    byte[] p=new byte[bits.Stride*bits.Height];Marshal.Copy(bits.Scan0,p,0,p.Length);
    for(int i=0;i<p.Length;i+=4){int b=p[i],g=p[i+1],r=p[i+2],spill=g-Math.Max(r,b);if(spill>200){p[i+3]=0;continue;}if(spill>3){int a=Math.Max(1,255-spill);p[i+3]=(byte)(p[i+3]*a/255);p[i]=(byte)Math.Min(255,b*255/a);p[i+1]=(byte)Math.Min(255,Math.Min(g,Math.Max(r,b))*255/a);p[i+2]=(byte)Math.Min(255,r*255/a);}}
    Marshal.Copy(p,0,bits.Scan0,p.Length);rgba.UnlockBits(bits);
   }
   using(var atlas=new Bitmap(1024,256*rows,PixelFormat.Format32bppArgb))using(var ag=Graphics.FromImage(atlas)){
    for(int f=0;f<rows*4;f++){
     int col=f%4,row=f/4,x0=(int)Math.Round(col*src.Width/4.0),y0=(int)Math.Round(row*src.Height/(double)rows);
     int w=(int)Math.Round((col+1)*src.Width/4.0)-x0,h=(int)Math.Round((row+1)*src.Height/(double)rows)-y0;
     // One uniform scale per cell; feet remain on the ground even in the prone poses.
     int bottom=0;
     for(int y=(int)(h*.6);y<h;y++)for(int x=(int)(w*.1);x<(int)(w*.96);x++)if(rgba.GetPixel(x0+x,y0+y).A>180)bottom=Math.Max(bottom,y);
     float dy=(float)(220*.89-bottom*220.0/h);
     dy=0; // Preserve per-frame gait height; the whole sheet shares one cell transform.
     using(var cell=new Bitmap(256,256,PixelFormat.Format32bppArgb))using(var cg=Graphics.FromImage(cell)){
      cg.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
      cg.DrawImage(rgba,new RectangleF(18,18+dy,220,220),new RectangleF(x0,y0,w,h),GraphicsUnit.Pixel);
      for(int k=0;k<256;k++)if(cell.GetPixel(k,0).A>0||cell.GetPixel(k,255).A>0||cell.GetPixel(0,k).A>0||cell.GetPixel(255,k).A>0)throw new Exception("Sprite clipped: "+clip+f);
      ag.DrawImageUnscaled(cell,col*256,row*256);
     }
    }
    atlas.Save(Path.Combine(output,clip+"-atlas.png"),ImageFormat.Png);
    Console.WriteLine(clip+": "+rows*4+" frames, alpha and safe margins checked.");
   }
  }
 }
}
'@
foreach($battleClip in @('lord','xiahoudun','guojia','yujin','enemy')){
 [CommanderArtImport]::Run([IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../docs/art/sources/battle-commanders/$battleClip.png")),$battleOutput,$battleClip,8)
}