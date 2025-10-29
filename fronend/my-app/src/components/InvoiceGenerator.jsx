import React, { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';

function currency(n) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceGenerator() {
  const [form, setForm] = useState({
    invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().slice(0,10),
    company: 'Emirate Essentials',
    companyAddress: 'Dubai, UAE',
    billTo: 'Customer Name',
    billAddress: 'Address line, City, Country',
    phone: '+971-50-000-0000',
    warranty: '', // optional
    delivery: 'Free Delivery',
    note: 'Thank you for your business!',
  });
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState([
    { desc: 'Product A', qty: 2, price: 120 },
  ]);

  const previewRef = useRef(null);

  const filteredItems = useMemo(() => (
    items.filter(it => String(it.desc || '').trim() !== '' && Number(it.qty) > 0)
  ), [items]);

  const totals = useMemo(() => {
    const subtotal = filteredItems.reduce((s, it) => s + (Number(it.qty)||0) * (Number(it.price)||0), 0);
    const total = subtotal; // no tax
    return { subtotal, total };
  }, [filteredItems]);

  const setItem = (i, patch) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const addItem = () => setItems(prev => [...prev, { desc: '', qty: 1, price: 0 }]);
  const remItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const onLogo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setLogo(String(r.result));
    r.readAsDataURL(f);
  };

  const downloadPng = async () => {
    if (!previewRef.current) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.invoiceNo || 'invoice'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally { setBusy(false); }
  };

  return (
    <div className="profile-card" style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <div className="invoice-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Invoice Generator</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', background:'#e5e7eb' }}>
            Upload logo
            <input type="file" accept="image/*" onChange={onLogo} style={{ display: 'none' }} />
          </label>
          <button type="button" onClick={downloadPng} disabled={busy} style={{
            background: '#111827', color: '#fff', border: '1px solid #0f172a', padding: '8px 12px', borderRadius: 6,
            cursor: !busy ? 'pointer' : 'not-allowed', transition: 'none', boxShadow: 'none'
          }}>
            {busy ? 'Preparing…' : 'Download Image (PNG)'}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="invoice-form-grid" style={{ marginBottom: 12 }}>
        <div className="input-group"><label>Invoice No</label><input value={form.invoiceNo} onChange={e=>setForm({ ...form, invoiceNo: e.target.value })} /></div>
        <div className="input-group"><label>Date</label><input type="date" value={form.date} onChange={e=>setForm({ ...form, date: e.target.value })} /></div>
        <div className="input-group"><label>Your Company</label><input value={form.company} onChange={e=>setForm({ ...form, company: e.target.value })} /></div>
        <div className="input-group"><label>Company Address</label><input value={form.companyAddress} onChange={e=>setForm({ ...form, companyAddress: e.target.value })} /></div>
        <div className="input-group"><label>Bill To</label><input value={form.billTo} onChange={e=>setForm({ ...form, billTo: e.target.value })} /></div>
        <div className="input-group"><label>Bill Address</label><input value={form.billAddress} onChange={e=>setForm({ ...form, billAddress: e.target.value })} /></div>
        <div className="input-group"><label>Phone</label><input value={form.phone} onChange={e=>setForm({ ...form, phone: e.target.value })} /></div>
        <div className="input-group"><label>Warranty (optional)</label><input placeholder="e.g. 12 months replacement" value={form.warranty} onChange={e=>setForm({ ...form, warranty: e.target.value })} /></div>
      </div>

      {/* Items */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
          <strong>Items</strong>
          <button type="button" onClick={addItem} style={{ background:'#2563eb', color:'#fff', border:'1px solid #1e40af', padding:'6px 10px', borderRadius:6 }}>Add Item</button>
        </div>
        {items.map((it, i) => (
          <div key={i} className="invoice-item-row">
            <input placeholder="Description" value={it.desc} onChange={e=>setItem(i,{desc:e.target.value})} />
            <input type="number" placeholder="Qty" value={it.qty} onChange={e=>setItem(i,{qty:e.target.value})} />
            <input type="number" placeholder="Unit Price" value={it.price} onChange={e=>setItem(i,{price:e.target.value})} />
            <button type="button" onClick={()=>remItem(i)} style={{ background:'#ef4444', color:'#fff', border:'1px solid #dc2626', padding:'6px 10px', borderRadius:6 }}>×</button>
          </div>
        ))}
      </div>


      {/* Invoice Preview (Captured) */}
      <div ref={previewRef} className="invoice-preview" style={{ background:'#fff' }}>
        {/* Header */}
        <div className="invoice-header" style={{ background:'linear-gradient(135deg,#1e293b 0%,#334155 100%)', color:'#fff', padding:20, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {logo ? (
              <img src={logo} alt="logo" style={{ width:48, height:48, borderRadius:8, objectFit:'cover', background:'#fff' }} />
            ) : (
              <div style={{ width:48, height:48, borderRadius:8, background:'#0ea5e9', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>Logo</div>
            )}
            <div>
              <div style={{ fontSize:18, fontWeight:700 }}>{form.company}</div>
              <div style={{ opacity:0.85 }}>{form.companyAddress}</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:0.5 }}>INVOICE</div>
            <div>#{form.invoiceNo}</div>
            <div>{new Date(form.date).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Bill to */}
        <div className="invoice-billto" style={{ display:'flex', justifyContent:'space-between', padding:20, gap:20, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:12, color:'#6b7280' }}>BILL TO</div>
            <div style={{ fontWeight:700 }}>{form.billTo}</div>
            <div>{form.billAddress}</div>
            <div>{form.phone}</div>
          </div>
          <div className="invoice-totals" style={{ padding:12, border:'1px dashed #cbd5e1', borderRadius:8, minWidth:220, background:'#f8fafc' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', rowGap:6 }}>
              <div style={{ color:'#64748b' }}>Subtotal</div>
              <div style={{ fontWeight:600 }}>AED {currency(totals.subtotal)}</div>
              <div style={{ color:'#64748b' }}>Delivery</div>
              <div style={{ fontWeight:600 }}>AED {currency(0)}</div>
              <div style={{ color:'#64748b' }}>Total</div>
              <div style={{ fontWeight:800, color:'#0ea5e9' }}>AED {currency(totals.total)}</div>
            </div>
          </div>
        </div>

        {/* Items table */}
        <div style={{ padding:'0 20px 20px' }}>
          <table className="invoice-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
            <thead>
              <tr>
                <th style={{ textAlign:'left', padding:'10px', background:'#f1f5f9' }}>Description</th>
                <th style={{ textAlign:'right', padding:'10px', background:'#f1f5f9' }}>Qty</th>
                <th style={{ textAlign:'right', padding:'10px', background:'#f1f5f9' }}>Unit</th>
                <th style={{ textAlign:'right', padding:'10px', background:'#f1f5f9' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((it, i) => (
                <tr key={i}>
                  <td style={{ padding:'10px', borderBottom:'1px solid #eef2f7' }}>{it.desc || '-'}</td>
                  <td style={{ padding:'10px', borderBottom:'1px solid #eef2f7', textAlign:'right' }}>{Number(it.qty)||0}</td>
                  <td style={{ padding:'10px', borderBottom:'1px solid #eef2f7', textAlign:'right' }}>AED {currency(it.price)}</td>
                  <td style={{ padding:'10px', borderBottom:'1px solid #eef2f7', textAlign:'right' }}>AED {currency((Number(it.qty)||0)*(Number(it.price)||0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="invoice-footer" style={{ padding:20, background:'#f8fafc', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <div style={{ color:'#64748b' }}>Thank you for shopping with {form.company}!</div>
            <span style={{ background:'#e0f2fe', color:'#075985', border:'1px solid #0284c7', padding:'6px 10px', borderRadius:6, fontWeight:600 }}>
              Delivery: {form.delivery}
            </span>
            {String(form.warranty || '').trim() !== '' && (
              <span style={{ background:'#dcfce7', color:'#166534', border:'1px solid #16a34a', padding:'6px 10px', borderRadius:6, fontWeight:600 }}>
                Warranty: {form.warranty}
              </span>
            )}
          </div>
          <div style={{ fontWeight:700 }}>Total Due: AED {currency(totals.total)}</div>
        </div>
      </div>
    </div>
  );
}
