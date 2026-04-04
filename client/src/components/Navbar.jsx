import { NavLink } from 'react-router-dom';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/collection', label: 'Collection' },
  { to: '/ebay', label: 'eBay Tracker' },
];

export default function Navbar() {
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

          {/* Nav links */}
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
          </nav>
        </div>
      </div>
    </header>
  );
}
