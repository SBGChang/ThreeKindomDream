param([Parameter(Mandatory=$true)][string]$SourceDirectory)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$sequenceOutput = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/art/units/sequences-v2'))
New-Item -ItemType Directory -Force $sequenceOutput | Out-Null
# Import authored green-screen artwork, align feet, and pack equal transparent cells.
Add-Type -ReferencedAssemblies @('System.Drawing.Common','System.Drawing.Primitives','System.Runtime','System.Runtime.InteropServices','System.Console','System.Private.Windows.GdiPlus','System.Private.Windows.Core') -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.IO;
public static class SequenceImportV2 {
 public static void Run(string input,string output,string clip,int rows) {
  using(var src=new Bitmap(input)) using(var rgba=new Bitmap(src.Width,src.Height,PixelFormat.Format32bppArgb)) {
   using(var g=Graphics.FromImage(rgba)) g.DrawImageUnscaled(src,0,0);
   var bits=rgba.LockBits(new Rectangle(0,0,rgba.Width,rgba.Height),ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
   byte[] p=new byte[bits.Stride*bits.Height]; Marshal.Copy(bits.Scan0,p,0,p.Length);
   for(int i=0;i<p.Length;i+=4) {
    int b=p[i],green=p[i+1],r=p[i+2],hi=Math.Max(r,b),spill=green-hi;
    if(spill>200){p[i+3]=0;continue;}
    if(spill>3 && green>15){int a=Math.Max(1,255-spill);p[i+3]=(byte)(p[i+3]*a/255);p[i]=(byte)Math.Min(255,b*255/a);p[i+1]=(byte)Math.Min(255,Math.Min(green,hi)*255/a);p[i+2]=(byte)Math.Min(255,r*255/a);}
   }
   Marshal.Copy(p,0,bits.Scan0,p.Length);rgba.UnlockBits(bits);
   Directory.CreateDirectory(Path.Combine(output,clip));
   using(var atlas=new Bitmap(1536,384*rows,PixelFormat.Format32bppArgb)) using(var ag=Graphics.FromImage(atlas)) {
    for(int f=0;f<rows*4;f++) {
     int col=f%4,row=f/4,x0=(int)Math.Round(col*src.Width/4.0),y0=(int)Math.Round(row*src.Height/(double)rows);
     int w=(int)Math.Round((col+1)*src.Width/4.0)-x0,h=(int)Math.Round((row+1)*src.Height/(double)rows)-y0;
     float dx=0,dy=0;
     if(clip!="charge") {
      int bottom=0,left=w,right=0;
      int start=(int)(w*(clip=="ignite"?.43:.12)),end=(int)(w*(clip=="ignite"?.65:.83));
      for(int y=(int)(h*.7);y<h;y++)for(int x=start;x<end;x++)if(rgba.GetPixel(x0+x,y0+y).A>180)bottom=Math.Max(bottom,y);
      for(int y=Math.Max(0,bottom-7);y<=bottom;y++)for(int x=start;x<end;x++)if(rgba.GetPixel(x0+x,y0+y).A>180){left=Math.Min(left,x);right=Math.Max(right,x);}
      dx=(float)((clip=="ignite"?.53:.49)*320-(left+right)*.5*320/w);dy=(float)(.86*320-bottom*320.0/h);
     }
     using(var cell=new Bitmap(384,384,PixelFormat.Format32bppArgb)) using(var cg=Graphics.FromImage(cell)) {
      cg.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
      cg.DrawImage(rgba,new RectangleF(32+dx,32+dy,320,320),new RectangleF(x0,y0,w,h),GraphicsUnit.Pixel);
      cell.Save(Path.Combine(output,clip,(f+1).ToString("00")+".png"),ImageFormat.Png);
      ag.DrawImageUnscaled(cell,col*384,row*384);
      for(int k=0;k<384;k++) if(cell.GetPixel(k,0).A>0||cell.GetPixel(k,383).A>0||cell.GetPixel(0,k).A>0||cell.GetPixel(383,k).A>0)throw new Exception("Sprite touches border: "+clip+f);
     }
    }
    atlas.Save(Path.Combine(output,clip+"-atlas.png"),ImageFormat.Png);
    Console.WriteLine(clip+": "+rows*4+" frames, transparent 384x384 cells; border check passed.");
   }
  }
 }
}
'@
foreach($sequenceClip in @('charge','ignite','volley')) {
 $sequenceRows=if($sequenceClip -eq 'charge'){4}else{2}
 [SequenceImportV2]::Run((Join-Path $SourceDirectory ($sequenceClip+'-key.png')),$sequenceOutput,$sequenceClip,$sequenceRows)
}
