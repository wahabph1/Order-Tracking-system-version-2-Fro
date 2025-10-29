import React, { useEffect, useRef } from 'react';
import './ConfirmDialog.css';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  description = '',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = true,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') onConfirm?.();
    };
    document.addEventListener('keydown', onKey);
    // focus cancel by default for safety
    const t = setTimeout(() => cancelRef.current?.focus(), 0);
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div className="cd-overlay" role="presentation" onMouseDown={(e) => {
      // close when clicking backdrop only (ignore clicks inside dialog)
      if (e.target === e.currentTarget) onCancel?.();
    }}>
      <div className="cd-dialog" role="dialog" aria-modal="true">
        <div className="cd-icon" aria-hidden>⚠️</div>
        <h3 className="cd-title" id="cd-title">{title}</h3>
        {description ? <p className="cd-desc">{description}</p> : null}
        <div className="cd-actions">
          <button ref={cancelRef} className="cd-btn" onClick={onCancel}>{cancelText}</button>
          <button className={`cd-btn ${danger ? 'cd-danger' : 'cd-primary'}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
