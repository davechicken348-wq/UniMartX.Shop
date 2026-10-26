import { useEffect, useRef, useState } from 'react';

type BuilderImagePickerProps = {
  label: string;
  value?: string | null;
  onUpload: (file?: File) => void;
  onRemove?: () => void;
  onColorPick?: (color: string) => void;
  onCreateStyle?: (colors: string[]) => void;
};

function sampleImageColors(image: HTMLImageElement): string[] {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context || !image.naturalWidth || !image.naturalHeight) return [];
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  const counts = new Map<string, number>();
  for (let index = 0; index < pixels.length; index += 16) {
    if (pixels[index + 3] < 180) continue;
    const channels = [pixels[index], pixels[index + 1], pixels[index + 2]].map((channel) => Math.round(channel / 32) * 32);
    const hex = `#${channels.map((channel) => Math.min(255, channel).toString(16).padStart(2, '0')).join('')}`;
    counts.set(hex, (counts.get(hex) || 0) + 1);
  }
  return [...counts].sort((first, second) => second[1] - first[1]).map(([hex]) => hex).filter((hex, index, colors) => colors.indexOf(hex) === index).slice(0, 8);
}

export default function BuilderImagePicker({ label, value, onUpload, onRemove, onColorPick, onCreateStyle }: BuilderImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'upload' | 'image'>('upload');
  const [dragging, setDragging] = useState(false);
  const [colors, setColors] = useState<string[]>([]);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setColors([]);
    setImageError(false);
    if (!value) return;
    const image = new Image();
    if (!value.startsWith('data:') && !value.startsWith('blob:')) image.crossOrigin = 'anonymous';
    image.onload = () => {
      try { setColors(sampleImageColors(image)); } catch { setColors([]); }
    };
    image.onerror = () => setImageError(true);
    image.src = value;
    return () => { image.onload = null; image.onerror = null; };
  }, [value]);

  const acceptFile = (file?: File) => {
    if (!file) return;
    onUpload(file);
    setTab('image');
  };

  return <div className="seller-builder-image-picker">
    <div className="seller-builder-image-heading"><div><b>{label}</b><small>Choose an image and tune the section around it.</small></div><span aria-hidden="true">▧</span></div>
    <div className="seller-builder-image-tabs" role="tablist" aria-label={`${label} image options`}>
      <button type="button" role="tab" aria-selected={tab === 'upload'} className={tab === 'upload' ? 'is-active' : ''} onClick={() => setTab('upload')}>Upload</button>
      <button type="button" role="tab" aria-selected={tab === 'image'} className={tab === 'image' ? 'is-active' : ''} onClick={() => setTab('image')}>From image</button>
    </div>
    {tab === 'upload' ? <button type="button" className={`seller-builder-image-drop${dragging ? ' is-dragging' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files?.[0]); }}>
      <span className="seller-builder-image-drop-icon">↑</span><b>{value ? 'Replace this image' : 'Drop an image here'}</b><small>or browse your device · JPG, PNG, WebP</small><i>Choose image</i>
    </button> : <div className="seller-builder-image-from">
      {value && !imageError ? <img src={value} alt={`${label} preview`} onError={() => setImageError(true)}/> : <div className="seller-builder-image-empty"><span>▧</span><b>{imageError ? 'This image could not be previewed' : 'No image selected yet'}</b><small>Upload an image to see its preview and colors.</small></div>}
      <div className="seller-builder-image-colors"><span>Dominant colors</span>{colors.length ? <div>{colors.map((color) => onColorPick ? <button type="button" key={color} style={{ backgroundColor: color }} aria-label={`Apply ${color}`} title={`Use ${color}`} onClick={() => onColorPick(color)}/> : <i key={color} style={{ backgroundColor: color }} title={color}/>)}</div> : <small>Colors appear here after an image is selected.</small>}</div>
      {onCreateStyle && value && colors.length > 0 && <button type="button" className="seller-builder-image-style" onClick={() => onCreateStyle(colors)}><span>✦</span><b>Build storefront style</b><small>Use this image to inspire colors and fonts</small><i>→</i></button>}
      <button type="button" className="seller-builder-image-browse" onClick={() => inputRef.current?.click()}>{value ? 'Change image' : 'Choose image'}</button>
    </div>}
    <input ref={inputRef} className="seller-builder-image-input" type="file" accept="image/*" aria-label={`Upload ${label}`} onChange={(event) => { acceptFile(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }}/>
    {value && <div className="seller-builder-image-actions"><span><i/> Image ready for your storefront</span>{onRemove && <button type="button" onClick={onRemove}>Remove</button>}</div>}
  </div>;
}
