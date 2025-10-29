import React, { useState } from 'react';

// Professional, responsive navbar with improved layout and visuals
function Navbar({ onNavClick, currentView }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const projectName = 'TrackMate UAE';

  const toggleMenu = () => setIsMenuOpen((v) => !v);

  const handleNavClick = (view) => {
    onNavClick(view);
    setIsMenuOpen(false);
  };

  return (
    <header className="header" role="banner">
      <div className="navbar-container">
        {/* Brand */}
        <button
          type="button"
          className="brand"
          onClick={() => handleNavClick('dashboard')}
          aria-label={`${projectName} home`}
        >
          <span className="brand-logo-wrap">
            <span className="brand-logo nav-logo-pop" aria-hidden>TM</span>
            <span className="logo-shine" aria-hidden></span>
            <span className="logo-halo" aria-hidden></span>
          </span>
          <span className="brand-name">{projectName}</span>
        </button>

        {/* Mobile menu toggle */}
        <button
          className="menu-toggle"
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          type="button"
        >
          {isMenuOpen ? (
            <span className="close-icon" aria-hidden>&times;</span>
          ) : (
            <span className="hamburger-icon" aria-hidden>&#9776;</span>
          )}
        </button>

        {/* Primary nav */}
        <nav
          id="primary-navigation"
          className={`nav-links ${isMenuOpen ? 'open' : ''}`}
          aria-label="Primary"
        >
          <button
            type="button"
            className={currentView === 'dashboard' ? 'nav-link active' : 'nav-link'}
            onClick={() => handleNavClick('dashboard')}
          >
            <span className="nav-shine" aria-hidden></span>
            Dashboard
          </button>

          <button
            type="button"
            className={currentView === 'reports' ? 'nav-link active' : 'nav-link'}
            onClick={() => handleNavClick('reports')}
          >
            <span className="nav-shine" aria-hidden></span>
            Reports
          </button>

          <button
            type="button"
            className={currentView === 'wahabOrders' ? 'nav-link active' : 'nav-link'}
            onClick={() => handleNavClick('wahabOrders')}
          >
            <span className="nav-shine" aria-hidden></span>
            Wahab Orders
          </button>

          <button
            type="button"
            className={currentView === 'profitCalculator' ? 'nav-link active' : 'nav-link'}
            onClick={() => handleNavClick('profitCalculator')}
          >
            <span className="nav-shine" aria-hidden></span>
            Profit Calculator
          </button>

          <button
            type="button"
            className={currentView === 'autoDetect' ? 'nav-link active' : 'nav-link'}
            onClick={() => handleNavClick('autoDetect')}
            title="Upload invoice and auto-detect serial"
          >
            <span className="nav-shine" aria-hidden></span>
            Auto Detect
          </button>

          <button
            type="button"
            className={currentView === 'profile' ? 'nav-link active' : 'nav-link'}
            onClick={() => handleNavClick('profile')}
          >
            <span className="nav-shine" aria-hidden></span>
            Profile
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
