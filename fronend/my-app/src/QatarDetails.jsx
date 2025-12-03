import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from './components/Modal';
import ConfirmDialog from './components/ConfirmDialog';

// Use existing profit endpoints to persist investment-like records under a dedicated store
const PROFIT_API = 'https://order-tracking-system-version-2-bac.vercel.app/api/profit';
const STORE_ID = 'qatar';
const STORE_NAME = 'Qatar';

export default function QatarDetails() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState([]);
  const [rate, setRate] = useState('75'); // 1 AED = X PKR
  const [currency, setCurrency] = useState('AED');
  const [editingId, setEditingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateInfo, setRateInfo] = useState('');

  const fetchRecent = async () => {
    try {
      const res = await axios.get(`${PROFIT_API}/calculations/${STORE_ID}?limit=5`);
      setRecent(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setRecent([]);
    }
  };

  useEffect(() => { fetchRecent(); }, []);

  // Load/save conversion rate
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aedToPkrRate');
      if (saved) setRate(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('aedToPkrRate', String(rate || '')); } catch {}
  }, [rate]);

  const fetchLiveRate = async () => {
    setRateInfo('');
    setRateLoading(true);
    try {
      // Try exchangerate.host (no key)
      let v;
      try {
        const res = await axios.get('https://api.exchangerate.host/latest?base=AED&symbols=PKR');
        v = res?.data?.rates?.PKR;
      } catch {}
      // Fallback: open.er-api.com
      if (!v) {
        const res2 = await axios.get('https://open.er-api.com/v6/latest/AED');
        v = res2?.data?.rates?.PKR;
      }
      if (!v || !Number.isFinite(Number(v))) throw new Error('No rate received');
      const val = Number(v);
      setRate(String(val.toFixed(2)));
      setRateInfo('Live rate updated');
    } catch (e) {
      setRateInfo('Failed to fetch live rate');
    } finally {
      setRateLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setNote('');
    setDate('');
    setError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const amt = Number(amount);
    const r = Number(rate);
    if (!Number.isFinite(amt) || amt < 0) {
      setError('Please enter a valid non-negative amount');
      return;
    }
    if (!Number.isFinite(r) || r <= 0) {
      setError('Please enter a valid AED→PKR rate');
      return;
    }
    try {
      setSaving(true);
      // Ensure store exists (ignore error if already exists)
      try { await axios.post(`${PROFIT_API}/stores`, { id: STORE_ID, name: STORE_NAME }); } catch {}

      const AED = currency === 'AED' ? amt : +(amt / r).toFixed(2);
      const PKR = currency === 'PKR' ? amt : +(amt * r).toFixed(2);

      // If editing: delete old, then create new with same timestamp (if provided)
      if (editingId) {
        try { await axios.delete(`${PROFIT_API}/calculations/${editingId}`); } catch {}
      }

      await axios.post(`${PROFIT_API}/calculations`, {
        storeId: STORE_ID,
        storeName: STORE_NAME,
        itemName: note ? `Investment — ${note}` : 'Investment',
        // Store AED in realPrice; PKR in profit fields
        realPrice: AED,
        deliveryCharges: 0,
        deliveredOrders: 1,
        profitPerOrder: PKR,
        totalProfit: PKR,
        timestamp: date || undefined,
      });

      setSaving(false);
      setOpen(false);
      setEditingId(null);
      resetForm();
      fetchRecent();
    } catch (e) {
      setSaving(false);
      setError(e?.response?.data?.message || 'Failed to save record');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: '12px' }}>Qatar Details</h2>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => { setEditingId(null); setCurrency('AED'); setOpen(true); }}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
            color: '#fff', border: 'none', padding: '10px 16px',
            borderRadius: 10, cursor: 'pointer', boxShadow: '0 8px 22px rgba(37,99,235,.35)'
          }}
> 
          + Investment Record
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#334155' }}>
          <span style={{ fontSize: 13 }}>1 AED =</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            title="AED to PKR rate"
            style={{ width: 90, padding: '6px 8px', borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <span style={{ fontSize: 13 }}>PKR</span>
          <button type="button" onClick={fetchLiveRate} disabled={rateLoading} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', cursor: 'pointer' }}>
            {rateLoading ? 'Fetching…' : 'Fetch live rate'}
          </button>
          {rateInfo && <span style={{ fontSize: 12, color: '#059669' }}>{rateInfo}</span>}
        </div>
      </div>

      {recent.length > 0 && (
        <div style={{
          marginTop: 10, border: '1px solid #e5e7eb', borderRadius: 12, padding: 12,
          background: '#fff'
        }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Recent Investments</div>
          {/* Clean table layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr 140px 140px 180px', gap: 8, alignItems: 'center' }}>
            {/* Header */}
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Date & Time</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Note</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textAlign: 'right' }}>AED</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textAlign: 'right' }}>PKR</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textAlign: 'right' }}>Actions</div>
            <div style={{ gridColumn: '1 / -1', height: 1, background: '#e2e8f0', margin: '6px 0 2px' }} />
            {/* Rows */}
            {recent.map((r) => {
              const conv = Number(rate) > 0 ? Number(rate) : 1;
              const aed = r?.realPrice ? Number(r.realPrice) : ((Number(r.totalProfit) || 0) / conv);
              const pkr = r?.totalProfit ? Number(r.totalProfit) : ((Number(r.realPrice) || 0) * conv);
              const item = String(r.itemName || 'Investment');
              const noteText = item.startsWith('Investment — ') ? item.slice('Investment — '.length) : '';
              return (
                <React.Fragment key={r._id}>
                  <div style={{ color: '#0f172a' }}>{new Date(r.timestamp || r.createdAt).toLocaleString()}</div>
                  <div style={{ color: '#334155', fontSize: 13 }}>{noteText || '—'}</div>
                  <div style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right' }}>
                    {aed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right' }}>
                    {pkr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => {
                      // Prefill form for edit
                      setEditingId(r._id);
                      const defaultCurrency = r?.realPrice ? 'AED' : 'PKR';
                      setCurrency(defaultCurrency);
                      setAmount(String(defaultCurrency === 'AED' ? (r.realPrice || 0) : (r.totalProfit || 0)));
                      setNote(noteText);
                      try { setDate((r.timestamp || r.createdAt) ? new Date(r.timestamp || r.createdAt).toISOString().slice(0,16) : ''); } catch { setDate(''); }
                      setOpen(true);
                    }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', cursor: 'pointer' }}>Edit</button>
                    <button type="button" onClick={() => { setDeleteId(r._id); setConfirmOpen(true); }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #fee2e2', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer' }}>Delete</button>
                  </div>
                  <div style={{ gridColumn: '1 / -1', height: 1, background: '#f1f5f9' }} />
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setEditingId(null); resetForm(); }} title={editingId ? 'Edit Investment' : 'Add Investment'} size="sm">
        <form onSubmit={onSubmit}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ flex: 1, display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Amount</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}
                    required
                  />
                </label>
                <label style={{ width: 120, display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>Currency</span>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <option value="AED">AED</option>
                    <option value="PKR">PKR</option>
                  </select>
                </label>
              </div>
              {/* Live conversion hint */}
              <div style={{ color: '#475569', fontSize: 12 }}>
                {(() => {
                  const amt = Number(amount);
                  const r = Number(rate);
                  if (!Number.isFinite(amt) || !Number.isFinite(r) || r <= 0) return null;
                  const AED = currency === 'AED' ? amt : +(amt / r).toFixed(2);
                  const PKR = currency === 'PKR' ? amt : +(amt * r).toFixed(2);
                  return `Will save as: AED ${AED.toLocaleString(undefined,{maximumFractionDigits:2})} | PKR ${PKR.toLocaleString(undefined,{maximumFractionDigits:2})}`;
                })()}
              </div>
            </div>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Note (optional)</span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Short description"
                maxLength={500}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Date (optional)</span>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            </label>

            {error && (
              <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
              <button type="button" onClick={() => { setOpen(false); resetForm(); }} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={{ padding: '10px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this record?"
        description="This action cannot be undone."
        confirmText="Delete"
        onConfirm={async () => {
          try { if (deleteId) await axios.delete(`${PROFIT_API}/calculations/${deleteId}`); } catch {}
          setConfirmOpen(false);
          setDeleteId(null);
          fetchRecent();
        }}
        onCancel={() => { setConfirmOpen(false); setDeleteId(null); }}
      />
    </div>
  );
}
