import { API_BASE_URL } from './auth';

export type CartSeller = {
  id: string;
  slug?: string | null;
  storeName: string;
  storeAvatar?: string | null;
  pickupAddress?: string | null;
  deliveryFee?: number | null;
  deliveryOptions?: string | null;
};

export type CartProduct = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  images?: string[];
  stock: number;
  isActive: boolean;
  seller: CartSeller;
};

export type CartItem = { id: string; quantity: number; subtotal: number; product: CartProduct | null };
export type CartData = { id: string; itemCount: number; subtotal: number; items: CartItem[] };
export type BuyerAddress = { id: string; label?: string | null; street: string; city: string; state: string; zipCode?: string; country: string; notes?: string | null; isDefault?: boolean };
export type BuyerProfile = { firstName: string; lastName: string; email: string; phone?: string; addresses: BuyerAddress[] };

type ApiResult<T> = { success?: boolean; data?: T; message?: string; error?: string | { message?: string } };

export async function cartRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('unimartxToken');
  if (!token) throw new Error('Sign in to continue with your shopping bag.');
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Could not reach UniMartX. Check your connection and try again.');
  }
  const body = await response.json().catch(() => ({})) as ApiResult<T>;
  const error = typeof body.error === 'string' ? body.error : body.error?.message;
  if (!response.ok || body.success === false) throw new Error(body.message || error || 'Something went wrong. Please try again.');
  return (body.data ?? body) as T;
}

export function money(value: number): string {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function getSellerOptions(seller: CartSeller): ('pickup' | 'delivery')[] {
  const raw = seller.deliveryOptions?.trim();
  let words = '';
  if (raw) {
    try { words = (JSON.parse(raw) as unknown[]).join(' ').toLowerCase(); }
    catch { words = raw.toLowerCase(); }
  }
  const options: ('pickup' | 'delivery')[] = [];
  if (!raw || /pickup|pick up|collect|collection|campus/.test(words) || seller.pickupAddress) options.push('pickup');
  if (/deliver|shipping|courier/.test(words) || seller.deliveryFee !== null && seller.deliveryFee !== undefined) options.push('delivery');
  return options.length ? Array.from(new Set(options)) : ['pickup'];
}
