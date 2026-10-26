import { Link, useNavigate } from 'react-router-dom';
import DeliveryLocationPicker from './DeliveryLocationPicker';
import MarketplaceAccountNav from './MarketplaceAccountNav';
import MarketIcon from './MarketIcon';

export default function MarketplaceHeader() {
  const navigate = useNavigate();
  return <header className="market-topbar">
    <button className="market-mobile-toggle" type="button" onClick={() => navigate('/shop')} aria-label="Back to marketplace"><MarketIcon name="arrow"/></button>
    <Link className="market-logo" to="/shop" aria-label="UniMartX marketplace"><span className="market-logo-mark"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 17h28l-2.5 25h-23L10 17Z"/><path d="M17 18v-5a7 7 0 0 1 14 0v5"/></svg></span><span>unimart<span>x</span></span></Link>
    <form className="market-search" role="search" onSubmit={(event) => { event.preventDefault(); navigate('/shop'); }}><button className="market-search-submit" type="submit" aria-label="Search marketplace"><MarketIcon name="search" size={18}/></button><input aria-label="Search marketplace" placeholder="Search products and stores"/></form>
    <DeliveryLocationPicker/><MarketplaceAccountNav/>
  </header>;
}
