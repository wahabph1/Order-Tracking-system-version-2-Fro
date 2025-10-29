import React, { useEffect } from 'react';
import './Modal.css';

export default function Modal({ open, title, onClose, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="m-overlay" role="presentation" onMouseDown={(e)=>{ if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`m-dialog m-${size}`} role="dialog" aria-modal="true">
        <div className="m-header">
          <h2 className="m-title">{title}</h2>
          <button className="m-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="m-body">
          {children}
        </div>
      </div>
    </div>
  );
}
