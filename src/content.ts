/// <reference types="chrome" />

let opacity = 0.4;
let speed = 50;
let sat = 75;
let lit = 60;
let solidColor = '#3b82f6';

type Mode = 'rainbow' | 'solid';
let mode: Mode = 'rainbow';
let styleEl: HTMLStyleElement | null = null;
let loopId: ReturnType<typeof setTimeout> | null = null;

let pageBg = [255, 255, 255];

function updatePageBg() {
  const getBg = (el: Element | null) => el ? window.getComputedStyle(el).backgroundColor : '';
  let bg = getBg(document.body);
  if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
    bg = getBg(document.documentElement);
  }
  if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
    const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      pageBg = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
      return;
    }
  }
  pageBg = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? [24, 24, 24] : [255, 255, 255];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(r: number, g: number, b: number) {
  const c = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

function textColor(r: number, g: number, b: number, a: number): string | null {
  const mixedR = r * a + pageBg[0] * (1 - a);
  const mixedG = g * a + pageBg[1] * (1 - a);
  const mixedB = b * a + pageBg[2] * (1 - a);
  
  const bgLum = luminance(mixedR, mixedG, mixedB);
  const pageLum = luminance(pageBg[0], pageBg[1], pageBg[2]);
  const isDarkMode = pageLum < 0.179;
  
  const contrast = isDarkMode
    ? 1.05 / (bgLum + 0.05)
    : (bgLum + 0.05) / 0.05;
    
  if (contrast >= 7.0) {
    return null;
  }
  
  return bgLum < 0.179 ? '#ffffff' : '#000000';
}

function ensureStyle() {
  if (styleEl && document.head?.contains(styleEl)) return;
  styleEl = document.createElement('style');
  styleEl.id = 'polylight-sel';
  document.head?.appendChild(styleEl);
}

function writeCSS(bg: string, fg: string | null) {
  ensureStyle();
  if (!styleEl) return;
  const c = fg ? `color: ${fg} !important;` : '';
  styleEl.textContent = `
    ::selection { background-color: ${bg} !important; ${c} text-shadow: none !important; }
    ::-moz-selection { background-color: ${bg} !important; ${c} text-shadow: none !important; }
  `;
}

function tick() {
  const hue = (Date.now() / speed) % 360;
  const [r, g, b] = hslToRgb(hue, sat, lit);
  writeCSS(
    `hsla(${hue}, ${sat}%, ${lit}%, ${opacity})`,
    textColor(r, g, b, opacity)
  );
  loopId = setTimeout(tick, 40);
}

function stopLoop() {
  if (loopId !== null) { clearTimeout(loopId); loopId = null; }
}

function setSolid(hex: string) {
  stopLoop();
  const [r, g, b] = hexToRgb(hex);
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  writeCSS(`${hex}${alpha}`, textColor(r, g, b, opacity));
}

function apply(m: Mode) {
  mode = m;
  if (m === 'rainbow') {
    stopLoop();
    tick();
  } else {
    setSolid(solidColor);
  }
}

function init() {
  updatePageBg();
  ensureStyle();
  apply(mode);
}

if (document.head) init();
else {
  const iv = setInterval(() => {
    if (document.head) { clearInterval(iv); init(); }
  }, 10);
}
document.addEventListener('DOMContentLoaded', init);

chrome.storage.sync.get(
  ['mode', 'solidColor', 'opacity', 'cycleSpeed', 'saturation', 'lightness'],
  (r) => {
    if (typeof r.opacity === 'number') opacity = r.opacity;
    if (typeof r.cycleSpeed === 'number') speed = r.cycleSpeed;
    if (typeof r.saturation === 'number') sat = r.saturation;
    if (typeof r.lightness === 'number') lit = r.lightness;
    if (typeof r.solidColor === 'string') solidColor = r.solidColor;
    apply((r.mode as Mode) || 'rainbow');
  }
);

chrome.storage.onChanged.addListener((changes, ns) => {
  if (ns !== 'sync') return;
  let dirty = false;
  if (changes.opacity) { opacity = changes.opacity.newValue as number; dirty = true; }
  if (changes.cycleSpeed) { speed = changes.cycleSpeed.newValue as number; }
  if (changes.saturation) { sat = changes.saturation.newValue as number; dirty = true; }
  if (changes.lightness) { lit = changes.lightness.newValue as number; dirty = true; }
  if (changes.solidColor) { solidColor = changes.solidColor.newValue as string; dirty = true; }
  if (changes.mode || dirty) {
    apply((changes.mode?.newValue as Mode) ?? mode);
  }
});
