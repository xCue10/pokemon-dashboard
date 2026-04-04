import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
        PokeVault &copy; {new Date().getFullYear()} — Powered by the Pokémon TCG API
      </footer>
    </div>
  );
}
