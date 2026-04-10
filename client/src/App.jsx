import { Routes, Route, Navigate } from 'react-router-dom';

function MobileAwareRedirect() {
  const isMobile = window.innerWidth < 640;
  return <Navigate to={isMobile ? '/collection' : '/dashboard'} replace />;
}
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Collection from './pages/Collection';
import Sealed from './pages/Sealed';
import Wishlist from './pages/Wishlist';
import EbayTracker from './pages/EbayTracker';
import Sold from './pages/Sold';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<MobileAwareRedirect />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="collection" element={<Collection />} />
        <Route path="sealed" element={<Sealed />} />
        <Route path="sold" element={<Sold />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="ebay" element={<EbayTracker />} />
      </Route>
    </Routes>
  );
}
