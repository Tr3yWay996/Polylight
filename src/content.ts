/// <reference types="chrome" />

let opacity = 0.4;
let speed = 50;
let sat = 75;
let lit = 60;
let solidColor = '#3b82f6';

type Mode = 'rainbow' | 'solid';
let mode: Mode = 'rainbow';
let styleEl: HTMLStyleElement | null = null;
let raf: number | null = null;

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

// pick a text color that smoothly tracks the bg luminance
// instead of snapping black/white which causes flicker
function textColor(r: number, g: number, b: number, a: number): string {
  const mix = (fg: number) => Math.round(fg * a + 128 * (1 - a));
  const lum = luminance(mix(r), mix(g), mix(b));
  const inv = 1 - lum;
  const srgb = inv <= 0.0031308
    ? 12.92 * inv
    : 1.055 * Math.pow(inv, 1 / 2.4) - 0.055;
  const v = Math.round(255 * srgb);
  return `rgb(${v},${v},${v})`;
}

function ensureStyle() {
  if (styleEl && document.head?.contains(styleEl)) return;
  styleEl = document.createElement('style');
  styleEl.id = 'polylight-sel';
  document.head?.appendChild(styleEl);
}

function writeCSS(bg: string, fg: string) {
  ensureStyle();
  if (!styleEl) return;
  styleEl.textContent = `
    ::selection { background-color: ${bg} !important; color: ${fg} !important; text-shadow: none !important; }
    ::-moz-selection { background-color: ${bg} !important; color: ${fg} !important; text-shadow: none !important; }
  `;
}

function tick() {
  if (mode === 'rainbow') {
    const hue = (Date.now() / speed) % 360;
    const [r, g, b] = hslToRgb(hue, sat, lit);
    writeCSS(
      `hsla(${hue}, ${sat}%, ${lit}%, ${opacity})`,
      textColor(r, g, b, opacity)
    );
  }
  raf = requestAnimationFrame(tick);
}

function setSolid(hex: string) {
  if (raf) { cancelAnimationFrame(raf); raf = null; }
  const [r, g, b] = hexToRgb(hex);
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  writeCSS(`${hex}${alpha}`, textColor(r, g, b, opacity));
}

function apply(m: Mode) {
  mode = m;
  if (m === 'rainbow') {
    if (!raf) tick();
  } else {
    setSolid(solidColor);
  }
}

// init
function init() {
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

// storage
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
