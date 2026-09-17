import measurements from './character-framing.json';
import { PORTRAIT_LAYOUTS, type PortraitContext } from './portrait-layouts.js';

export interface SourceRect { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
export interface CharacterFraming {
  readonly source: string;
  /** Facial plane from forehead to jaw: excludes hair, ears, headwear and hanging beard. */
  readonly face: SourceRect;
  /** Optional atlas cell boundary; absent for standalone artwork. */
  readonly sourceRegion?: SourceRect;
  readonly generation: string;
}
export const CHARACTER_FRAMING: Readonly<Record<string, CharacterFraming>> = measurements;
export function characterFraming(id: string): CharacterFraming {
  return CHARACTER_FRAMING[id] ?? CHARACTER_FRAMING.npc_soldier!;
}
export function portraitCrop(width: number, height: number, id: string, context: PortraitContext = 'default') {
  const { face } = characterFraming(id);
  const layout = PORTRAIT_LAYOUTS[context];
  const side = Math.max(width * face.width / layout.faceWidth, height * face.height / layout.faceHeight);
  return { x: width * (face.x + face.width / 2) - side * layout.centerX, y: height * (face.y + face.height / 2) - side * layout.centerY, width: side, height: side };
}
/** Normalized output guide showing exactly what contributed to face scale. */
export function portraitFaceGuide(width: number, height: number, id: string, context: PortraitContext = 'default'): SourceRect {
  const crop=portraitCrop(width,height,id,context),{face}=characterFraming(id);
  return { x:(face.x*width-crop.x)/crop.width, y:(face.y*height-crop.y)/crop.height,
    width:face.width*width/crop.width, height:face.height*height/crop.height };
}
export function drawPortrait(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, id: string, context: PortraitContext = 'default'): void {
  const crop = portraitCrop(image.width, image.height, id, context);
  const size = 256;
  const scale = size / crop.width;
  ctx.canvas.width = size; ctx.canvas.height = size;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const region=characterFraming(id).sourceRegion;
  if (region) {
    // Keep shoulders from this actor's own atlas cell, never an adjacent frame.
    const sx=region.x*image.width,sy=region.y*image.height,sw=region.width*image.width,sh=region.height*image.height;
    ctx.drawImage(image,sx,sy,sw,sh,(sx-crop.x)*scale,(sy-crop.y)*scale,sw*scale,sh*scale);
  } else {
    // Canvas bounds crop the complete artwork, retaining shoulders and clothes.
    ctx.drawImage(image,-crop.x*scale,-crop.y*scale,image.width*scale,image.height*scale);
  }
}
