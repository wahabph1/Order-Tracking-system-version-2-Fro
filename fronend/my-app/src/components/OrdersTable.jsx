import React, { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

const currency = (n) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export default function OrdersTable({ orders = [], onDelete }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState(null);

  const askDelete = (order) => {
    setTarget(order);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (onDelete && target) onDelete(target);
    setConfirmOpen(false);
    setTarget(null);
  };

  return (
    <div className="table-card">
      <div className="table-toolbar">
        <div className="toolbar-left">
          <span className="kpi">
            <span className="kpi-label">Total Orders</span>
            <span className="kpi-value">{orders.length}</span>
          </span>
        </div>
        <div className="toolbar-right">
          <input className="search" placeholder="Search orders..." onChange={() => {}} />
          <button className="btn btn-primary" onClick={() => {}}>Export</button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Status</th>
              <th>Date</th>
              <th style={{ width: 90 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><span className="mono badge-id">{o.id}</span></td>
                <td>
                  <div className="cell-main">
                    <div className="avatar" aria-hidden>{o.customer?.slice(0,1)}</div>
                    <div>
                      <div className="cell-title">{o.customer}</div>
                      <div className="cell-sub">{o.customer?.toLowerCase().replace(/\s+/g,'')}@mail.com</div>
                    </div>
                  </div>
                </td>
                <td>{o.item}</td>
                <td>{o.qty}</td>
                <td>{currency(o.price)}</td>
                <td>
                  <span className={`status status--${o.status?.toLowerCase()}`}>
                    {o.status}
                  </span>
                </td>
                <td>{new Date(o.date).toLocaleDateString()}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="icon-btn" title="View">👁️</button>
                  <button className="icon-btn" title="Delete" onClick={() => askDelete(o)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span className="muted">Showing {orders.length} records</span>
        <div className="pagination">
          <button className="btn btn-light" disabled>{'\u2039'} Prev</button>
          <button className="btn btn-light">Next {'\u203A'}</button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this order?"
        description={target ? `Order ${target.id} (${target.customer}) will be permanently removed.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        danger
      />
    </div>
  );
}
