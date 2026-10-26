import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useMarketplaceLive } from '../../lib/marketplace-live';
import { cartRequest } from '../../lib/cart';
import MarketIcon from './MarketIcon';

type Props = { productId: string; productName: string; stock?: number; className?: string };

export default function MarketplaceQuickAdd({ productId, productName, stock, className = '' }: Props) {
  const [state, setState] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');
  const { refresh } = useMarketplaceLive();

  async function add(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (state === 'adding' || stock === 0) return;
    setState('adding');
    try {
      await cartRequest('/cart/add', { method: 'POST', body: JSON.stringify({ productId, quantity: 1 }) });
      setState('added');
      refresh();
      window.setTimeout(() => setState('idle'), 1400);
    } catch {
      setState('error');
      window.setTimeout(() => setState('idle'), 2200);
    }
  }

  const label = stock === 0 ? `${productName} is sold out` : state === 'adding' ? `Adding ${productName} to your bag` : state === 'added' ? `${productName} added to your bag` : state === 'error' ? `Could not add ${productName}. Sign in and try again.` : `Add ${productName} to your bag`;
  return <button type="button" className={`market-quick-add ${state === 'added' ? 'is-added' : ''} ${state === 'error' ? 'has-error' : ''} ${className}`} aria-label={label} title={label} disabled={stock === 0 || state === 'adding'} onClick={(event) => void add(event)}><MarketIcon name={state === 'added' ? 'check' : 'plus'} size={18}/></button>;
}
