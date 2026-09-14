/** Source-relative [face center X, eye line Y, temple-to-temple width].
 * Measure the face rather than hats, plumes or beards. Native portraits and
 * half-body art share the same destination scale; artwork is never stretched.
 */
export const PORTRAIT_FRAMING: Readonly<Record<string, readonly [number, number, number]>> = {
  liubei: [.55,.30,.38], guanyu: [.58,.31,.38], zhangfei: [.55,.31,.37],
  zhaoyun: [.58,.38,.32], zhugeliang: [.53,.32,.36], jiangwan: [.55,.31,.36],
  pangtong: [.55,.30,.37], huangzhong: [.54,.33,.37], lusu: [.54,.30,.37],
  "caocao": [
    0.54,
    0.33,
    0.34
  ],
  "zhangliao": [
    0.55,
    0.39,
    0.35
  ],
  "yujin": [
    0.53,
    0.34,
    0.36
  ],
  "xiahoudun": [
    0.48,
    0.33,
    0.36
  ],
  "dianwei": [
    0.55,
    0.33,
    0.36
  ],
  "lejin": [
    0.47,
    0.37,
    0.35
  ],
  "guojia": [
    0.57,
    0.36,
    0.35
  ],
  "jiaxu": [
    0.52,
    0.34,
    0.36
  ],
  "chengyu": [
    0.52,
    0.31,
    0.36
  ],
  "xunyu": [
    0.52,
    0.32,
    0.36
  ],
  "chenqun": [
    0.52,
    0.32,
    0.36
  ],
  "maojie": [
    0.5,
    0.31,
    0.36
  ],
  "huangfusong": [
    0.5,
    0.33,
    0.35
  ],
  "simayi": [
    0.53,
    0.32,
    0.35
  ],
  "bocai": [
    0.5,
    0.33,
    0.36
  ],
  "zhangliang": [
    0.48,
    0.34,
    0.36
  ],
  "zhangjiao": [
    0.5,
    0.35,
    0.34
  ],
  "huaxiong": [
    0.53,
    0.4,
    0.35
  ],
  "lijue": [
    0.53,
    0.37,
    0.35
  ],
  "lvbu": [
    0.57,
    0.38,
    0.3
  ],
  "yanliang": [
    0.51,
    0.35,
    0.34
  ],
  "guotu": [
    0.52,
    0.32,
    0.36
  ],
  "yuanshao": [
    0.54,
    0.34,
    0.34
  ],
  "yuantan": [
    0.55,
    0.33,
    0.34
  ],
  "shenpei": [
    0.51,
    0.33,
    0.35
  ],
  "tadun": [
    0.51,
    0.33,
    0.35
  ],
  "lord": [
    0.51,
    0.34,
    0.36
  ],
  "npc_soldier": [
    0.54,
    0.34,
    0.35
  ]
};

export function drawPortrait(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, id: string): void {
  const [centerX, eyeY, faceWidth] = PORTRAIT_FRAMING[id] ?? PORTRAIT_FRAMING.npc_soldier!;
  const size = 256;
  const scale = size * .60 / (image.width * faceWidth);
  ctx.canvas.width = size;
  ctx.canvas.height = size;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image,
    size * .50 - image.width * centerX * scale,
    size * .53 - image.height * eyeY * scale,
    image.width * scale, image.height * scale);
}
