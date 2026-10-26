import { useEffect, useState, type CSSProperties } from 'react';

type Hsv = { h: number; s: number; v: number };
type BuilderColorPickerProps = { label: string; value: string; onChange: (value: string) => void };

const palette = ['#172033', '#ffffff', '#dbeafe', '#bfdbfe', '#60a5fa', '#2563eb', '#0f766e', '#14b8a6', '#84cc16', '#facc15', '#fb923c', '#f43f8b', '#a855f7', '#7c3aed'];

function normalizeHex(value: string): string | null {
  const trimmed = value.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(trimmed)) return `#${[...trimmed].map((character) => character + character).join('')}`.toLowerCase();
  return /^[0-9a-f]{6}$/i.test(trimmed) ? `#${trimmed}`.toLowerCase() : null;
}

function hexToHsv(value: string): Hsv {
  const hex = normalizeHex(value) || '#55764e';
  const red = parseInt(hex.slice(1, 3), 16) / 255;
  const green = parseInt(hex.slice(3, 5), 16) / 255;
  const blue = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: hue, s: max === 0 ? 0 : delta / max * 100, v: max * 100 };
}

function hsvToHex({ h, s, v }: Hsv): string {
  const saturation = s / 100;
  const brightness = v / 100;
  const chroma = brightness * saturation;
  const secondary = chroma * (1 - Math.abs((h / 60) % 2 - 1));
  const offset = brightness - chroma;
  const sector = Math.floor(h / 60) % 6;
  const triplet = [
    [chroma, secondary, 0], [secondary, chroma, 0], [0, chroma, secondary],
    [0, secondary, chroma], [secondary, 0, chroma], [chroma, 0, secondary],
  ][sector].map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, '0'));
  return `#${triplet.join('')}`;
}

export default function BuilderColorPicker({ label, value, onChange }: BuilderColorPickerProps) {
  const currentColor = normalizeHex(value) || '#55764e';
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(currentColor);
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(currentColor));

  useEffect(() => {
    setHexInput(currentColor);
    setHsv(hexToHsv(currentColor));
  }, [currentColor]);

  const applyHsv = (next: Hsv) => {
    setHsv(next);
    const nextHex = hsvToHex(next);
    setHexInput(nextHex);
    onChange(nextHex);
  };

  const hueColor = `hsl(${hsv.h}, 100%, 50%)`;
  const hueGradient = 'linear-gradient(90deg,#ff3131 0%,#ffef35 17%,#4ee94e 33%,#20e4d0 50%,#2672ff 67%,#c33bff 84%,#ff3131 100%)';
  const saturationGradient = `linear-gradient(90deg,hsl(${hsv.h},0%,${hsv.v}%),hsl(${hsv.h},100%,${hsv.v}%))`;
  const brightnessGradient = `linear-gradient(90deg,#000,${hsvToHex({ ...hsv, v: 100 })})`;

  return <div className="seller-color-picker">
    <div className="seller-color-picker-heading"><b>{label}</b><span>{currentColor.toUpperCase()}</span></div>
    <div className="seller-color-picker-current">
      <button type="button" className="seller-color-picker-chip" style={{ backgroundColor: currentColor }} aria-label={`${label}: ${currentColor}. Open color palette.`} aria-expanded={open} onClick={() => setOpen((isOpen) => !isOpen)}><span>✳</span></button>
      <input aria-label={`${label} HEX value`} value={hexInput} spellCheck={false} onChange={(event) => { const input = event.target.value; setHexInput(input); const valid = normalizeHex(input); if (valid) onChange(valid); }} onBlur={() => { const normalized = normalizeHex(hexInput); if (normalized) { setHexInput(normalized); onChange(normalized); } else setHexInput(currentColor); }}/>
      <button type="button" className={`seller-color-picker-toggle ${open ? 'is-open' : ''}`} onClick={() => setOpen((isOpen) => !isOpen)} aria-label={open ? 'Close color palette' : 'Open color palette'}>{open ? '−' : '+'}</button>
    </div>
    {open && <div className="seller-color-picker-panel">
      <div className="seller-color-swatches" aria-label={`${label} suggested colors`}>
        {palette.map((swatch) => <button key={swatch} type="button" className={currentColor === swatch ? 'is-selected' : ''} style={{ backgroundColor: swatch }} aria-label={`Use ${swatch}`} title={swatch} onClick={() => { setHexInput(swatch); setHsv(hexToHsv(swatch)); onChange(swatch); }}/>) }
        <label className="seller-color-custom" title="Choose any color">＋<input aria-label={`Choose custom ${label.toLowerCase()}`} type="color" value={currentColor} onChange={(event) => { const next = event.target.value; setHexInput(next); setHsv(hexToHsv(next)); onChange(next); }}/></label>
      </div>
      <label className="seller-color-channel"><span>Hue</span><input aria-label={`${label} hue`} type="range" min="0" max="359" value={Math.round(hsv.h)} style={{ background: hueGradient }} onChange={(event) => applyHsv({ ...hsv, h: Number(event.target.value) })}/></label>
      <label className="seller-color-channel"><span>Saturation</span><input aria-label={`${label} saturation`} type="range" min="0" max="100" value={Math.round(hsv.s)} style={{ background: saturationGradient, '--picker-thumb-color': hueColor } as CSSProperties} onChange={(event) => applyHsv({ ...hsv, s: Number(event.target.value) })}/></label>
      <label className="seller-color-channel"><span>Brightness</span><input aria-label={`${label} brightness`} type="range" min="0" max="100" value={Math.round(hsv.v)} style={{ background: brightnessGradient, '--picker-thumb-color': hueColor } as CSSProperties} onChange={(event) => applyHsv({ ...hsv, v: Number(event.target.value) })}/></label>
    </div>}
  </div>;
}
