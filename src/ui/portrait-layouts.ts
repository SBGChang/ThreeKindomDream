/** One rule for every character and surface. The facial rectangle is always centered.
 * Only the facial plane counts toward size, never hair/helmet/beard extensions.
 * Preserve aspect ratio: fit the facial width AND height within 50% of canvas.
 */
export const PORTRAIT_RULE = { centerX: .50, centerY: .50, faceWidth: .50, faceHeight: .50 } as const;
export const PORTRAIT_LAYOUTS = {
  default: { label: '通用頭像', ...PORTRAIT_RULE },
  dialogue: { label: '對話', ...PORTRAIT_RULE },
  commander: { label: '指揮選擇', ...PORTRAIT_RULE },
  participants: { label: '參與人物', ...PORTRAIT_RULE },
  campaign: { label: '出征敵將', ...PORTRAIT_RULE },
  battle: { label: '戰場', ...PORTRAIT_RULE },
  codex: { label: '風雲錄', ...PORTRAIT_RULE },
  duel: { label: '單挑', ...PORTRAIT_RULE },
  duelHint: { label: '單挑提示', ...PORTRAIT_RULE },
} as const;
export type PortraitContext = keyof typeof PORTRAIT_LAYOUTS;
