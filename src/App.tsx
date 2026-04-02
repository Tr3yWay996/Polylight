/// <reference types="chrome" />
import { useState, useEffect, useCallback } from 'react'
import './App.css'

type Tab = 'rainbow' | 'colors';
type Mode = 'rainbow' | 'solid';

interface RainbowCfg {
  opacity: number;
  cycleSpeed: number;
  saturation: number;
  lightness: number;
}

interface Preset { id: string; name: string; color: string; }

const defaults: RainbowCfg = {
  opacity: 0.4, cycleSpeed: 50, saturation: 75, lightness: 60,
};

const builtinPresets: Preset[] = [
  { id: 'neon-pink',  name: 'Pink',  color: '#ec4899' },
  { id: 'ocean-blue', name: 'Ocean', color: '#3b82f6' },
  { id: 'emerald',    name: 'Jade',  color: '#10b981' },
  { id: 'crimson',    name: 'Ruby',  color: '#ef4444' },
  { id: 'amber',      name: 'Amber', color: '#f59e0b' },
  { id: 'violet',     name: 'Iris',  color: '#8b5cf6' },
];

function speedLabel(v: number) {
  if (v <= 20) return 'Very Fast';
  if (v <= 60) return 'Fast';
  if (v <= 100) return 'Normal';
  if (v <= 150) return 'Chill';
  return 'Slow';
}

function store() {
  return typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.sync : null;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return `#${[f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}


export default function App() {
  const [tab, setTab] = useState<Tab>('rainbow');
  const [mode, setModeRaw] = useState<Mode>('rainbow');
  const [cfg, setCfg] = useState<RainbowCfg>(defaults);
  const [solidColor, setSolidColor] = useState('#3b82f6');
  const [custom, setCustom] = useState<Preset[]>([]);
  const [newName, setNewName] = useState('');

  // inline color picker
  const [pH, setPH] = useState(217);
  const [pS, setPS] = useState(91);
  const [pL, setPL] = useState(60);
  const [hex, setHex] = useState('#3b82f6');

  const pickedColor = hslToHex(pH, pS, pL);

  const syncPicker = (h: number, s: number, l: number) => {
    setPH(h); setPS(s); setPL(l);
    setHex(hslToHex(h, s, l));
  };

  const onHexType = (val: string) => {
    setHex(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      const [h, s, l] = hexToHsl(val);
      setPH(h); setPS(s); setPL(l);
    }
  };

  useEffect(() => {
    const s = store();
    if (!s) return;
    s.get(['mode', 'solidColor', 'opacity', 'cycleSpeed', 'saturation', 'lightness', 'customPresets'], (r) => {
      if (r.mode) setModeRaw(r.mode as Mode);
      if (r.solidColor) setSolidColor(r.solidColor as string);
      if (r.customPresets) setCustom(JSON.parse(r.customPresets as string));
      setCfg({
        opacity: typeof r.opacity === 'number' ? r.opacity : defaults.opacity,
        cycleSpeed: typeof r.cycleSpeed === 'number' ? r.cycleSpeed : defaults.cycleSpeed,
        saturation: typeof r.saturation === 'number' ? r.saturation : defaults.saturation,
        lightness: typeof r.lightness === 'number' ? r.lightness : defaults.lightness,
      });
      if (r.solidColor) {
        const [h, s, l] = hexToHsl(r.solidColor as string);
        setPH(h); setPS(s); setPL(l);
        setHex(r.solidColor as string);
      }
    });
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeRaw(m);
    store()?.set({ mode: m });
  }, []);

  const pickColor = useCallback((c: string) => {
    setSolidColor(c);
    setMode('solid');
    store()?.set({ solidColor: c, mode: 'solid' });
  }, [setMode]);

  const patch = useCallback((p: Partial<RainbowCfg>) => {
    setCfg(prev => {
      const next = { ...prev, ...p };
      store()?.set(p);
      return next;
    });
  }, []);

  const savePreset = useCallback(() => {
    const name = newName.trim() || pickedColor;
    const p: Preset = { id: crypto.randomUUID(), name, color: pickedColor };
    setCustom(prev => {
      const next = [...prev, p];
      store()?.set({ customPresets: JSON.stringify(next) });
      return next;
    });
    setNewName('');
  }, [pickedColor, newName]);

  const deletePreset = useCallback((id: string) => {
    setCustom(prev => {
      const next = prev.filter(p => p.id !== id);
      store()?.set({ customPresets: JSON.stringify(next) });
      return next;
    });
  }, []);

  return (
    <div className="popup">
      <div className="header">
        <div className="logo" />
        <div>
          <h1 className="title">Polylight</h1>
          <div className="subtitle">Selection highlighter</div>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button id="tab-rainbow" role="tab"
          className={`tab ${tab === 'rainbow' ? 'active' : ''}`}
          onClick={() => setTab('rainbow')}>Rainbow</button>
        <button id="tab-colors" role="tab"
          className={`tab ${tab === 'colors' ? 'active' : ''}`}
          onClick={() => setTab('colors')}>Colors</button>
      </div>

      {tab === 'rainbow' && (
        <div className="panel">
          <div className="toggle-row">
            <span>Rainbow mode</span>
            <button id="toggle-rainbow"
              className={`toggle ${mode === 'rainbow' ? 'on' : ''}`}
              onClick={() => setMode(mode === 'rainbow' ? 'solid' : 'rainbow')}
              aria-pressed={mode === 'rainbow'}>
              <span className="knob" />
            </button>
          </div>

          <div className={`sliders ${mode !== 'rainbow' ? 'off' : ''}`}>
            <RangeRow id="opacity" label="Opacity" display={`${Math.round(cfg.opacity * 100)}%`}
              min={0} max={1} step={0.05} value={cfg.opacity}
              onChange={v => patch({ opacity: v })} disabled={mode !== 'rainbow'} />
            <RangeRow id="speed" label="Speed" display={speedLabel(cfg.cycleSpeed)}
              min={10} max={200} step={5} value={cfg.cycleSpeed}
              onChange={v => patch({ cycleSpeed: v })} disabled={mode !== 'rainbow'} />
            <RangeRow id="saturation" label="Saturation" display={`${cfg.saturation}%`}
              min={0} max={100} step={5} value={cfg.saturation}
              onChange={v => patch({ saturation: v })} disabled={mode !== 'rainbow'} />
            <RangeRow id="lightness" label="Lightness" display={`${cfg.lightness}%`}
              min={20} max={90} step={5} value={cfg.lightness}
              onChange={v => patch({ lightness: v })} disabled={mode !== 'rainbow'} />
          </div>

          <button id="btn-reset" className="reset-btn"
            onClick={() => patch(defaults)}>Reset to defaults</button>
        </div>
      )}

      {tab === 'colors' && (
        <div className="panel">
          <div className="label">Presets</div>
          <div className="presets">
            {builtinPresets.map(p => (
              <button key={p.id} id={`preset-${p.id}`}
                className={`preset ${mode === 'solid' && solidColor === p.color ? 'active' : ''}`}
                onClick={() => pickColor(p.color)}
                style={{ '--c': p.color } as React.CSSProperties}>
                <span className="dot" style={{ background: p.color }} />
                {p.name}
              </button>
            ))}
          </div>

          <div className="label mt">Custom</div>
          <div className="picker">
            <div className="swatch" style={{ background: pickedColor }} />

            <label className="picker-row">
              <span>Hue</span>
              <input id="picker-hue" type="range" min={0} max={359} step={1}
                value={pH} className="hue-range"
                onChange={e => syncPicker(parseInt(e.target.value), pS, pL)} />
            </label>
            <label className="picker-row">
              <span>Saturation</span>
              <input id="picker-sat" type="range" min={0} max={100} step={1}
                value={pS} className="sat-range"
                style={{
                  '--sl': hslToHex(pH, 0, pL),
                  '--sr': hslToHex(pH, 100, pL),
                } as React.CSSProperties}
                onChange={e => syncPicker(pH, parseInt(e.target.value), pL)} />
            </label>
            <label className="picker-row">
              <span>Lightness</span>
              <input id="picker-lit" type="range" min={10} max={90} step={1}
                value={pL} className="lit-range"
                style={{ '--lm': hslToHex(pH, pS, 50) } as React.CSSProperties}
                onChange={e => syncPicker(pH, pS, parseInt(e.target.value))} />
            </label>

            <div className="hex-row">
              <span className="hex-tag">HEX</span>
              <input id="picker-hex" type="text" className="hex-field"
                value={hex} maxLength={7}
                onChange={e => onHexType(e.target.value)}
                onBlur={() => { if (!/^#[0-9a-fA-F]{6}$/.test(hex)) setHex(pickedColor); }}
                spellCheck={false} />
            </div>

            <div className="actions">
              <input id="preset-name" type="text" className="name-field"
                placeholder="Name (optional)" value={newName} maxLength={20}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && savePreset()} />
              <button id="btn-save" className="add-btn" onClick={savePreset} title="Save">+</button>
            </div>
            <button id="btn-apply" className="apply-btn" onClick={() => pickColor(pickedColor)}>
              Apply colour
            </button>
          </div>

          {custom.length > 0 && (
            <>
              <div className="label mt">Saved</div>
              <div className="saved-list">
                {custom.map(p => (
                  <div key={p.id}
                    className={`saved ${mode === 'solid' && solidColor === p.color ? 'active' : ''}`}
                    style={{ '--c': p.color } as React.CSSProperties}>
                    <button id={`saved-${p.id}`} className="saved-btn"
                      onClick={() => pickColor(p.color)}>
                      <span className="dot" style={{ background: p.color, width: 14, height: 14 }} />
                      <span className="saved-name">{p.name}</span>
                      <span className="saved-hex">{p.color}</span>
                    </button>
                    <button id={`del-${p.id}`} className="del"
                      onClick={() => deletePreset(p.id)} title="Delete">✕</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}


function RangeRow({ id, label, display, min, max, step, value, onChange, disabled }: {
  id: string; label: string; display: string;
  min: number; max: number; step: number; value: number;
  onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <label className="range-row">
      <span>{label}<b>{display}</b></span>
      <input id={`range-${id}`} type="range"
        min={min} max={max} step={step} value={value}
        disabled={disabled}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))} />
    </label>
  );
}
