import { setDisplayLanguage, type GameLanguage } from './display-language.js';
export interface SystemPreferences {
  sfx: number;
  music: number;
  language: GameLanguage;
}
const KEY = 'sgd.system.v1';
const defaults: SystemPreferences = { sfx: 70, music: 50, language: 'zh-TW' };
export function readSystemPreferences(): SystemPreferences {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<SystemPreferences>;
    const volume = (n: unknown, fallback: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
    return { sfx: volume(value.sfx, defaults.sfx), music: volume(value.music, defaults.music), language: value.language === 'zh-CN' ? 'zh-CN' : 'zh-TW' };
  } catch { return { ...defaults }; }
}
export function applySystemPreferences(prefs: SystemPreferences): void {
  delete document.documentElement.dataset.gameFont;
  setDisplayLanguage(prefs.language);
  document.querySelectorAll<HTMLMediaElement>('audio,video[data-audio-channel]').forEach(media => {
    media.volume = (media.dataset.audioChannel === 'sfx' ? prefs.sfx : prefs.music) / 100;
  });
  window.dispatchEvent(new CustomEvent('game-audio-preferences', { detail: prefs }));
}
export function saveSystemPreferences(prefs: SystemPreferences): void {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}
let audio: AudioContext | undefined;
/** Small UI feedback tone; independent of simulation state and random streams. */
export function playMenuSound(volume: number): void {
  if (volume <= 0) return;
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => {});
    const tone = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
    tone.type = 'sine';
    tone.frequency.setValueAtTime(660, now);
    tone.frequency.exponentialRampToValueAtTime(440, now + .075);
    gain.gain.setValueAtTime(volume / 100 * .08, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + .09);
    tone.connect(gain).connect(audio.destination);
    tone.start(now); tone.stop(now + .1);
    tone.onended = () => { tone.disconnect(); gain.disconnect(); };
  } catch { /* Audio restrictions must never interrupt menu actions. */ }
}
