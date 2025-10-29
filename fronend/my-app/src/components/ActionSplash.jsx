import React, { useEffect, useState } from 'react';
import './ActionSplash.css';

export default function ActionSplash({ open, label = 'Actions' }) {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) setVisible(true);
    else setTimeout(() => setVisible(false), 200);
  }, [open]);

  if (!open && !visible) return null;

  return (
    <div className={`as-overlay ${open ? 'as-open' : 'as-close'}`}>
      <div className="as-card">
        <div className="as-logo-wrap">
          <div className="as-glow" />
          <div className="as-ring" />
          <div className="as-logo">⚡</div>
        </div>
        <div className="as-title">Opening {label}</div>
        <div className="as-sub">Please wait…</div>
      </div>
    </div>
  );
}
