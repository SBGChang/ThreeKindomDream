import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const runtime = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = require(join(runtime, 'playwright'));
const sharp = require(join(runtime, 'sharp'));
for (const name of ['confirm-frame-v1', 'return-gate-v1', 'confirm-buttons-v1']) {
  const img = sharp(`public/art/ui/system/${name}.png`);
  const metadata = await img.metadata();
  const stats = await img.stats();
  console.log(name, { width: metadata.width, height: metadata.height, alpha: metadata.hasAlpha, alphaRange: metadata.hasAlpha ? [stats.channels.at(-1).min, stats.channels.at(-1).max] : 'opaque' });
  if (name !== 'confirm-frame-v1') assert.equal(stats.channels.at(-1).min, 0);
}
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
try {
  await page.goto('http://127.0.0.1:5182/?art=layout');
  await page.getByRole('button', { name: '遊戲設定', exact: true }).click();
  await page.getByRole('button', { name: '返回主選單', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('.system-confirm-art')].every(img => img.complete && img.naturalWidth > 0));
  await page.waitForTimeout(400);
  assert.equal(await page.locator(':focus').textContent(), '取消');
  await page.screenshot({ path: 'artifacts/system-confirm/home-full.png' });
  await dialog.screenshot({ path: 'artifacts/system-confirm/home.png' });
  const confirm = dialog.getByRole('button', { name: '返回主選單', exact: true });
  const artPosition = await confirm.locator('.system-button-art').evaluate(el => getComputedStyle(el).backgroundPosition);
  await confirm.hover();
  assert.equal(await confirm.locator('.system-button-art').evaluate(el => getComputedStyle(el).backgroundPosition), artPosition);
  await dialog.screenshot({ path: 'artifacts/system-confirm/hover.png' });
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator(':focus').textContent(), '返回主選單');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').textContent(), '取消');
  for (const size of [{ width: 960, height: 640 }, { width: 1600, height: 1000 }]) {
    await page.setViewportSize(size);
    await dialog.screenshot({ path: `artifacts/system-confirm/home-${size.width}.png` });
    assert(await dialog.evaluate(el => {
      const box = el.getBoundingClientRect();
      return box.x >= 0 && box.right <= innerWidth && box.y >= 0 && box.bottom <= innerHeight && el.scrollHeight === el.clientHeight;
    }));
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '離開遊戲', exact: true }).click();
  await dialog.screenshot({ path: 'artifacts/system-confirm/quit.png' });
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '返回主選單', exact: true }).click();
  await dialog.getByRole('button', { name: '返回主選單', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: /繼續/ }).first().waitFor();
  assert.deepEqual(errors, []);
  console.log('Confirmed: painted assets, alpha, focus, hover, Tab loop, Escape, cancel, home return, viewport fit.');
} finally { await browser.close(); }
