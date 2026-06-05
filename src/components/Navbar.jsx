import { Sun, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import HoneycombLogo from './HoneycombLogo';

export default function Navbar() {
  const { darkMode, toggleDarkMode } = useApp();

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <div className="navbar__brand">
          <span className="navbar__logo">
            <HoneycombLogo size={40} color={darkMode ? "#F4AE52" : "#222222"} />
          </span>
          <span 
            className="navbar__title"
            style={{ color: darkMode ? "#F4AE52" : "#222222" }}
          >
            HiveGuard
          </span>
        </div>
        <div className="navbar__actions">
          <button
            className="theme-toggle"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            id="theme-toggle"
          >
            {darkMode ? (
              <Sun size={26} strokeWidth={2} />
            ) : (
              <Moon size={26} strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
