import { useEffect, useId, useRef, useState } from 'react';

export interface SelectOption { value: string; label: string; }
interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
}

export default function CustomSelect({ value, options, onChange, ariaLabel, className = '', disabled = false }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return <div className={`custom-select ${className}`} ref={rootRef}>
    <button type="button" className="custom-select-trigger" role="combobox" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} disabled={disabled} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); } }}>
      <span>{selected?.label || ''}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
    </button>
    {open && <div className="custom-select-menu" id={listId} role="listbox" aria-label={ariaLabel}>
      {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={value === option.value} className={`custom-select-option ${value === option.value ? 'is-selected' : ''}`} onClick={() => { onChange(option.value); setOpen(false); }}>
        <span>{option.label}</span>{value === option.value && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>}
      </button>)}
    </div>}
  </div>;
}
