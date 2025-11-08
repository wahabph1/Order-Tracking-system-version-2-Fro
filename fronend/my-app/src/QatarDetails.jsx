import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from './components/Modal';

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

  const fetchRecent = async () => {
    try {
      const res = await axios.get(`${PROFIT_API}/calculations/${STORE_ID}?limit=5`);
      setRecent(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setRecent([]);
    }
  };

  useEffect(() => { fetchRecent(); }, []);

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
    if (!Number.isFinite(amt) || amt < 0) {
      setError('Please enter a valid non-negative amount');
      return;
    }
    try {
      setSaving(true);
      // Ensure store exists (ignore error if already exists)
      try {
        await axios.post(`${PROFIT_API}/stores`, { id: STORE_ID, name: STORE_NAME });
      } catch {}

      // Save an investment-like calculation record
      await axios.post(`${PROFIT_API}/calculations`, {
        storeId: STORE_ID,
        storeName: STORE_NAME,
        itemName: note ? `Investment — ${note}` : 'Investment',
        realPrice: amt,
        deliveryCharges: 0,
        deliveredOrders: 1,
        profitPerOrder: amt,
        totalProfit: amt,
        // Map date if provided
        timestamp: date || undefined,
      });
      setSaving(false);
      setOpen(false);
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
          onClick={() => setOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
            color: '#fff', border: 'none', padding: '10px 16px',
            borderRadius: 10, cursor: 'pointer', boxShadow: '0 8px 22px rgba(37,99,235,.35)'
          }}
        >
          + Investment Record
        </button>
      </div>

      {recent.length > 0 && (
        <div style={{
          marginTop: 10, border: '1px solid #e5e7eb', borderRadius: 12, padding: 12,
          background: '#fff'
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Recent Investments</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {recent.map((r) => (
              <li key={r._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
                <span>{new Date(r.timestamp || r.createdAt).toLocaleString()}</span>
                <span style={{ fontWeight: 600 }}>{(r.totalProfit || 0).toLocaleString()} PKR</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); resetForm(); }} title="Add Investment" size="sm">
        <form onSubmit={onSubmit}>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
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
    </div>
  );
}
