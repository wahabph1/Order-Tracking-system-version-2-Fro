import React from 'react';
import './LoadingPopup.css';

export default function LoadingPopup({ open = false, label = 'Fetching orders' }) {
  if (!open) return null;
  return (
    <div className="lp-overlay" role="status" aria-live="polite">
      <div className="lp-box">
        <span className="lp-shine" aria-hidden></span>
        <div className="lp-visual">
          <span className="lp-halo" aria-hidden></span>
          <div className="lp-spinner">
            <span className="lp-ring"></span>
            <span className="lp-ring2"></span>
            <span className="lp-dot"></span>
            <span className="lp-orb o1" aria-hidden></span>
            <span className="lp-orb o2" aria-hidden></span>
          </div>
        </div>
        {label ? (
          <div className="lp-text">
            {label}
            <span className="lp-ellipsis" aria-hidden></span>
          </div>
        ) : null}
        <div className="lp-bar" aria-hidden><span></span></div>
      </div>
    </div>
  );
}
