import React, { useEffect } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onAnimationEnd }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onAnimationEnd();
    }, 3000); // total splash duration

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  return (
    <div className="splash-screen" role="dialog" aria-label="Loading">
      <div className="aurora" aria-hidden></div>
      <div className="vignette" aria-hidden></div>
      <div className="particles" aria-hidden>
        <span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
      <div className="splash-content">
        <div className="splash-card">
          <div className="splash-brand">
            <div className="logo-wrap">
              <div className="brand-logo splash-logo-pop" aria-hidden>TM</div>
              <div className="logo-shine" aria-hidden></div>
              <div className="logo-halo" aria-hidden></div>
            </div>
            <div className="brand-name splash-brand-name">TrackMate UAE</div>
          </div>

          <div className="splash-tagline">Fast • Simple • Reliable</div>

          <div className="loading-bar" aria-hidden>
            <div className="loading-progress"></div>
          </div>

          <div className="loading-dots" aria-live="polite">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
