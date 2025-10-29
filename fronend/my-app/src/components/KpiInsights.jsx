import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './KpiInsights.css';

const API_URL = process.env.REACT_APP_API_BASE_URL || '/api/orders';

function BarChart({ data = [], height = 80 }) {
  // data: array of numbers for last N days
  const max = Math.max(1, ...data);
  return (
    <div className="kpi-bars" style={{ height }}>
      {data.map((v, i) => (
        <span
          key={i}
          className="kpi-bar"
          style={{
            height: `${(v / max) * 100}%`,
            animationDelay: `${i * 20}ms`
          }}
          title={`${v} orders`}
        />
      ))}
    </div>
  );
}

function Ring({ percent = 0, size = 80, stroke = 8, color = '#16a34a', track = '#e5e7eb' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const len = (Math.min(100, Math.max(0, percent)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="kpi-ring">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${len} ${c}`} strokeDashoffset={0} style={{ transition: 'stroke-dasharray .8s ease' }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="kpi-ring-text">{Math.round(percent)}%</text>
    </svg>
  );
}

export default function KpiInsights() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(API_URL);
        setOrders(Array.isArray(res.data) ? res.data : []);
      } catch {
        setOrders([]);
      } finally { setLoading(false); }
    })();
  }, []);

  const last30 = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    const buckets = Array.from({ length: 30 }, () => 0);
    (orders || []).forEach(o => {
      const d = new Date(o.orderDate || o.createdAt);
      if (isNaN(d)) return;
      if (d < start) return;
      const daysDiff = Math.floor((d - start) / (1000*60*60*24));
      if (daysDiff >= 0 && daysDiff < 30) buckets[daysDiff] += 1;
    });
    return buckets;
  }, [orders]);

  const counts = useMemo(() => {
    const c = { delivered: 0, cancelled: 0, total: 0 };
    (orders || []).forEach(o => {
      const s = String(o.deliveryStatus || '').toLowerCase();
      if (s === 'delivered') c.delivered += 1;
      if (s === 'cancelled') c.cancelled += 1;
    });
    c.total = (orders || []).length;
    return c;
  }, [orders]);

  const ownerSplit = useMemo(() => {
    const map = {};
    (orders || []).forEach(o => {
      const key = o.owner || o.vendor || 'Unknown';
      map[key] = (map[key] || 0) + 1;
    });
    const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]);
    const top = entries.slice(0, 5);
    const total = (orders || []).length || 1;
    return top.map(([owner, n]) => ({ owner, n, p: Math.round((n/total)*100) }));
  }, [orders]);

  const topProducts = useMemo(() => {
    // Try multiple field names to be resilient
    const getName = (o) => o.product || o.productName || o.item || null;
    const map = {};
    (orders || []).forEach(o => {
      const name = getName(o);
      if (!name) return;
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
  }, [orders]);

  const topCustomers = useMemo(() => {
    const getName = (o) => o.customer || o.customerName || null;
    const map = {};
    (orders || []).forEach(o => {
      const name = getName(o);
      if (!name) return;
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
  }, [orders]);

  const deliveredRate = counts.total ? (counts.delivered / counts.total) * 100 : 0;
  const cancelRate = counts.total ? (counts.cancelled / counts.total) * 100 : 0;

  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-head">Last 30 days</div>
        {loading ? <div className="kpi-skel" /> : <BarChart data={last30} height={90} />}
        <div className="kpi-foot">Total: <strong>{last30.reduce((s,n)=>s+n,0)}</strong></div>
      </div>

      <div className="kpi-card ring-card">
        <div className="kpi-head">Delivery Rate</div>
        <Ring percent={deliveredRate} color="#22c55e" />
      </div>

      <div className="kpi-card ring-card">
        <div className="kpi-head">Cancel Rate</div>
        <Ring percent={cancelRate} color="#ef4444" />
      </div>

      <div className="kpi-card">
        <div className="kpi-head">Owner-wise split</div>
        <div className="owner-list">
          {ownerSplit.map(x => (
            <div key={x.owner} className="owner-row">
              <span className="owner-name">{x.owner}</span>
              <span className="owner-count">{x.n}</span>
              <span className="owner-bar"><i style={{ width: `${x.p}%` }} /></span>
            </div>
          ))}
          {!ownerSplit.length && <div className="muted">No data</div>}
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-head">Top Products</div>
        <ul className="list">
          {topProducts.length ? topProducts.map(([name, n]) => (
            <li key={name}><span className="dot" />{name}<b>{n}</b></li>
          )) : <li className="muted">Not tracked</li>}
        </ul>
      </div>

      <div className="kpi-card">
        <div className="kpi-head">Top Customers</div>
        <ul className="list">
          {topCustomers.length ? topCustomers.map(([name, n]) => (
            <li key={name}><span className="dot" />{name}<b>{n}</b></li>
          )) : <li className="muted">Not tracked</li>}
        </ul>
      </div>
    </div>
  );
}
