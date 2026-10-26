export const STOREFRONT_FONT_GROUPS = [
  { label: 'Clean sans serif', fonts: ['DM Sans', 'Inter', 'Manrope', 'Montserrat', 'Lato', 'Nunito Sans', 'Source Sans 3', 'System UI'] },
  { label: 'Editorial serif', fonts: ['Georgia', 'Playfair Display', 'Lora', 'Merriweather', 'Libre Baskerville'] },
] as const;

const FONT_STACKS: Record<string, string> = {
  'DM Sans': '"DM Sans", sans-serif',
  Inter: 'Inter, sans-serif',
  Manrope: 'Manrope, sans-serif',
  Montserrat: 'Montserrat, sans-serif',
  Lato: 'Lato, sans-serif',
  'Nunito Sans': '"Nunito Sans", sans-serif',
  'Source Sans 3': '"Source Sans 3", sans-serif',
  Georgia: 'Georgia, serif',
  'Playfair Display': '"Playfair Display", Georgia, serif',
  Lora: 'Lora, Georgia, serif',
  Merriweather: 'Merriweather, Georgia, serif',
  'Libre Baskerville': '"Libre Baskerville", Georgia, serif',
  Arial: 'Arial, sans-serif',
  'System UI': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

export function storefrontFontStack(font: unknown, fallback = 'inherit'): string {
  return typeof font === 'string' ? FONT_STACKS[font] || fallback : fallback;
}
