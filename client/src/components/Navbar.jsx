import { NavLink } from 'react-router-dom';
import useDarkMode from '../hooks/useDarkMode';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/collection', label: 'Cards' },
  { to: '/sealed', label: 'Sealed' },
  { to: '/wishlist', label: 'Wishlist' },
  { to: '/ebay', label: 'eBay Tracker' },
];

export default function Navbar() {
  const [isDark, toggleDark] = useDarkMode();

  return (
    <header className="pokemon-header pokeball-bg relative overflow-hidden shadow-lg">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-inner">
              <svg viewBox="0 0 100 100" className="w-7 h-7">
                <circle cx="50" cy="50" r="46" fill="#CC0000"/>
                <rect x="4" y="46" width="92" height="8" fill="#333"/>
                <path d="M4 50 Q4 96 50 96 Q96 96 96 50 Z" fill="white"/>
                <circle cx="50" cy="50" r="14" fill="white" stroke="#333" strokeWidth="3"/>
                <circle cx="50" cy="50" r="7" fill="#CC0000" stroke="#333" strokeWidth="2"/>
                <circle cx="50" cy="50" r="46" fill="none" stroke="#333" strokeWidth="4"/>
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-none">PokeVault</h1>
              <p className="text-red-200 text-xs">Card Dashboard</p>
            </div>
          </div>

          {/* Nav links + dark mode toggle */}
          <nav className="flex items-center gap-1">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ` +
                  (isActive
                    ? 'bg-white text-pokemon-red shadow-sm'
                    : 'text-red-100 hover:bg-white/10 hover:text-white')
                }
              >
                {label}
              </NavLink>
            ))}

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="ml-2 w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 flex-shrink-0"
              style={{ backgroundColor: isDark ? '#4B5563' : 'rgba(255,255,255,0.25)' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 flex items-center justify-center text-xs"
                style={{ transform: isDark ? 'translateX(24px)' : 'translateX(0)' }}
              >
                {isDark ? '🌙' : '☀️'}
              </span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
