import React from 'react';
import DeletedOrdersReport from './components/DeletedOrdersReport';
import InvoiceGenerator from './components/InvoiceGenerator';
import './styles/Profile.css';

export default function Profile() {
  return (
    <div className="profile-container profile-page" style={{ padding: 24 }}>
      <div className="profile-hero">
        <div className="profile-hero-inner">
          <div className="profile-avatar">AW</div>
          <div>
            <h2 className="profile-title">Your Profile</h2>
            <p className="profile-subtle">Manage reports, exports and invoices — polished and fast.</p>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <DeletedOrdersReport />
        <InvoiceGenerator />
      </div>
    </div>
  );
}
