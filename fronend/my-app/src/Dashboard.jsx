import React from 'react';
import './styles/Dashboard.css';
import OrderTable from './OrderTable';

// Simple dashboard: just the orders table
export default function Dashboard() {

  return (
    <div className="dashboard-container">
      <OrderTable />
    </div>
  );
}
