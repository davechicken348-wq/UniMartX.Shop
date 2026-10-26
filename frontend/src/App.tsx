import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import SellerRegisterPage from './pages/auth/SellerRegisterPage';
import HomePage from './pages/marketing/HomePage';
import AboutPage from './pages/marketing/AboutPage';
import ContactPage from './pages/marketing/ContactPage';
import FAQPage from './pages/marketing/FAQPage';
import MarketplacePage from './pages/marketplace/MarketplacePage';
import ProductDetailsPage from './pages/marketplace/ProductDetailsPage';
import SellerStorefrontPage from './pages/marketplace/SellerStorefrontPage';
import BuyerAccountPage from './pages/marketplace/BuyerAccountPage';
import CartPage from './pages/marketplace/CartPage';
import CheckoutPage from './pages/marketplace/CheckoutPage';
import BuyerCollectionPage from './pages/marketplace/BuyerCollectionPage';
import BuyerOrderDetailsPage from './pages/marketplace/BuyerOrderDetailsPage';
import SellerWorkspace from './pages/seller/SellerWorkspace';
import { MarketplaceLiveProvider } from './lib/marketplace-live';

export default function App() {
  return (
    <MarketplaceLiveProvider><Routes>
      <Route path="/" element={<Navigate to="/marketing" replace />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/seller/register" element={<SellerRegisterPage />} />
      <Route path="/seller" element={<Navigate to="/seller/overview" replace />} />
      <Route path="/seller/products/new" element={<SellerWorkspace />} />
      <Route path="/seller/products/:id/edit" element={<SellerWorkspace />} />
      <Route path="/seller/orders/:id" element={<SellerWorkspace />} />
      <Route path="/seller/settings/:settingsSection" element={<SellerWorkspace />} />
      <Route path="/seller/:section" element={<SellerWorkspace />} />
      <Route path="/marketing" element={<HomePage />} />
      <Route path="/marketing/about" element={<AboutPage />} />
      <Route path="/marketing/contact" element={<ContactPage />} />
      <Route path="/marketing/faq" element={<FAQPage />} />
      <Route path="/shop" element={<MarketplacePage />} />
      <Route path="/shop/category/:slug" element={<MarketplacePage />} />
      <Route path="/shop/stores" element={<MarketplacePage storesView />} />
      <Route path="/shop/store/:slug/:page" element={<SellerStorefrontPage />} />
      <Route path="/shop/store/:slug" element={<SellerStorefrontPage />} />
      <Route path="/shop/account" element={<BuyerAccountPage />} />
      <Route path="/shop/settings" element={<BuyerAccountPage settings />} />
      <Route path="/shop/saved" element={<BuyerCollectionPage page="saved" />} />
      <Route path="/shop/orders/:id" element={<BuyerOrderDetailsPage />} />
      <Route path="/shop/orders" element={<BuyerCollectionPage page="orders" />} />
      <Route path="/shop/cart" element={<CartPage />} />
      <Route path="/shop/checkout" element={<CheckoutPage />} />
      <Route path="/shop/product/:id" element={<ProductDetailsPage />} />
      <Route path="/public/shop/shop.html" element={<Navigate to="/shop" replace />} />
      <Route path="/public/stores/stores.html" element={<Navigate to="/shop/stores" replace />} />
      <Route path="/public/marketing/" element={<Navigate to="/marketing" replace />} />
      <Route path="/public/marketing/about.html" element={<Navigate to="/marketing/about" replace />} />
      <Route path="/public/marketing/contact.html" element={<Navigate to="/marketing/contact" replace />} />
      <Route path="/public/marketing/faq.html" element={<Navigate to="/marketing/faq" replace />} />
      <Route path="*" element={<Navigate to="/marketing" replace />} />
    </Routes></MarketplaceLiveProvider>
  );
}
