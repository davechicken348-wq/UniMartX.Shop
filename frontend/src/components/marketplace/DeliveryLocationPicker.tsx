import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

const STORAGE_KEY = 'unimartxDeliveryLocation';
const defaultLocation = 'Accra, Ghana';
const popularLocations = ['Accra, Ghana', 'Tema, Ghana', 'Kumasi, Ghana', 'Cape Coast, Ghana', 'Takoradi, Ghana', 'Tamale, Ghana', 'Sunyani, Ghana', 'Ho, Ghana'];

function readLocation() {
  try { return localStorage.getItem(STORAGE_KEY) || defaultLocation; } catch { return defaultLocation; }
}

export default function DeliveryLocationPicker() {
  const [location, setLocation] = useState(readLocation);
  const [draft, setDraft] = useState(readLocation);
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = popularLocations.filter((item) => item.toLowerCase().includes(draft.trim().toLowerCase()));

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function choose(next: string) {
    const formatted = next.includes(',') ? next.trim() : `${next.trim()}, Ghana`;
    if (!formatted || formatted === ', Ghana') return;
    try { localStorage.setItem(STORAGE_KEY, formatted); } catch { /* Keep the in-memory choice if storage is unavailable. */ }
    setLocation(formatted);
    setDraft(formatted);
    setOpen(false);
    window.dispatchEvent(new CustomEvent('unimartx:delivery-location-change', { detail: { location: formatted } }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    choose(draft);
  }

  const [city, country] = location.split(/,\s*/, 2);

  return <div className="market-location-picker" ref={pickerRef}>
    <button className="market-location" type="button" aria-expanded={open} aria-haspopup="dialog" onClick={() => { setDraft(location); setOpen(!open); }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
      <span><small>Delivering around</small><b>{city}{country ? `, ${country}` : ''}</b></span><span className={`market-chevron ${open ? 'is-open' : ''}`}>⌄</span>
    </button>
    {open && <section className="market-location-popover" role="dialog" aria-label="Choose delivery location">
      <div className="market-location-popover-heading"><div><b>Set your delivery area</b><small>See what’s available near you.</small></div><button type="button" onClick={() => setOpen(false)} aria-label="Close location picker">×</button></div>
      <form className="market-location-form" onSubmit={submit}><label htmlFor="delivery-location-search">City or town</label><div><input id="delivery-location-search" ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a city or town"/><button type="submit">Set location</button></div></form>
      <div className="market-location-suggestions"><span>POPULAR IN GHANA</span>{matches.length ? matches.map((item) => <button type="button" key={item} className={location === item ? 'is-current' : ''} onClick={() => choose(item)}><span className="market-location-pin">⌖</span><span>{item}</span>{location === item && <b>Current</b>}</button>) : <p>Press “Set location” to use {draft || 'your location'}.</p>}</div>
      <p className="market-location-current">Current area: <b>{location}</b></p>
    </section>}
  </div>;
}
