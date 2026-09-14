export interface DesktopApi {
  setFullscreen: (enabled: boolean) => Promise<boolean>;
  isFullscreen: () => Promise<boolean>;
  quit: () => Promise<void>;
}
declare global { interface Window { gameDesktop?: DesktopApi } }
