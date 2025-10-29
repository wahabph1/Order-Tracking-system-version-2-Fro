import React, { useState } from 'react';
import axios from 'axios';
import { readActivity, clearActivity, logActivity } from '../utils/activity';
import './ActivityIntegrations.css';

const API_URL = process.env.REACT_APP_API_BASE_URL || '/api/orders';

function Timeline() {
  const [items, setItems] = useState(() => readActivity());
  const clear = () => { clearActivity(); setItems([]); };
  const icon = (t) => t === 'delete' ? '🗑️' : t === 'status' ? '🔄' : t === 'create' ? '➕' : '📄';
  return (
    <div className="ai-card">
      <div className="ai-head">
        <h4>Activity timeline</h4>
        {items.length > 0 && <button className="ai-link" onClick={clear}>Clear</button>}
      </div>
      <div className="ai-timeline">
        {items.length ? items.map(x => (
          <div key={x.id} className="ai-item">
            <div className="ai-icn" aria-hidden>{icon(x.type)}</div>
            <div className="ai-body">
              <div className="ai-title">{x.title || x.type}</div>
              {x.detail && <div className="ai-sub">{x.detail}</div>}
            </div>
            <div className="ai-time">{new Date(x.time).toLocaleString()}</div>
          </div>
        )) : <div className="muted">No recent activity</div>}
      </div>
    </div>
  );
}

function KeysManager() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ot_api_key_v1') || '');
  const [whKey, setWhKey] = useState(() => localStorage.getItem('ot_webhook_key_v1') || '');
  const gen = () => Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
  const rotateApi = () => { const k = gen(); localStorage.setItem('ot_api_key_v1', k); setApiKey(k); };
  const rotateWh = () => { const k = gen(); localStorage.setItem('ot_webhook_key_v1', k); setWhKey(k); };
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); } catch {} };
  return (
    <div className="ai-card">
      <div className="ai-head"><h4>API & Webhook keys</h4></div>
      <div className="ai-keys">
        <div className="ai-row"><label>API Key</label><input value={apiKey} readOnly placeholder="Not set" /><div className="ai-actions"><button onClick={rotateApi}>Generate</button><button onClick={()=>copy(apiKey)} disabled={!apiKey}>Copy</button></div></div>
        <div className="ai-row"><label>Webhook Secret</label><input value={whKey} readOnly placeholder="Not set" /><div className="ai-actions"><button onClick={rotateWh}>Generate</button><button onClick={()=>copy(whKey)} disabled={!whKey}>Copy</button></div></div>
      </div>
    </div>
  );
}

function SheetsSync() {
  const [sheetId, setSheetId] = useState(() => localStorage.getItem('ot_sheet_id_v1') || '');
  const [tab, setTab] = useState(() => localStorage.getItem('ot_sheet_tab_v1') || 'Orders');
  const [busy, setBusy] = useState(false);
  const save = () => { localStorage.setItem('ot_sheet_id_v1', sheetId); localStorage.setItem('ot_sheet_tab_v1', tab); };

  const exportCsv = async () => {
    setBusy(true);
    try {
      const res = await axios.get(API_URL);
      const rows = Array.isArray(res.data) ? res.data : [];
      const headers = ['serialNumber','owner','orderDate','deliveryStatus'];
      const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'orders_export.csv'; a.click(); URL.revokeObjectURL(url);
      logActivity({ type: 'export', title: 'Exported CSV', detail: `${rows.length} orders` });
    } catch {}
    setBusy(false);
  };

  return (
    <div className="ai-card">
      <div className="ai-head"><h4>Google Sheets sync</h4></div>
      <div className="ai-rows">
        <div className="ai-row"><label>Sheet ID</label><input value={sheetId} onChange={e=>setSheetId(e.target.value)} placeholder="1AbC..." /></div>
        <div className="ai-row"><label>Tab name</label><input value={tab} onChange={e=>setTab(e.target.value)} placeholder="Orders" /></div>
      </div>
      <div className="ai-actions">
        <button onClick={save}>Save</button>
        <button onClick={exportCsv} disabled={busy}>{busy ? 'Exporting...' : 'Export CSV (simulate sync)'}</button>
      </div>
      <div className="muted" style={{marginTop:6}}>Note: This creates a CSV download you can import into your sheet.</div>
    </div>
  );
}

function TemplateOrder() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const create = async () => {
    setBusy(true); setMsg('');
    try {
      const serial = `TPL-${Date.now().toString().slice(-6)}`;
      const payload = { serialNumber: serial, owner: 'Emirate Essentials', orderDate: new Date().toISOString().slice(0,10) };
      await axios.post(API_URL, payload);
      setMsg(`Template order ${serial} created.`);
      logActivity({ type: 'create', title: 'Template order created', detail: serial });
    } catch (e) {
      setMsg('Failed to create template order (maybe exists).');
    } finally { setBusy(false); }
  };
  return (
    <div className="ai-card">
      <div className="ai-head"><h4>Quick template order</h4></div>
      <div className="ai-actions">
        <button onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create template order'}</button>
      </div>
      {msg && <div className="ai-note">{msg}</div>}
    </div>
  );
}

export default function ActivityIntegrations() {
  return (
    <div className="ai-grid">
      <Timeline />
      <KeysManager />
      <SheetsSync />
      <TemplateOrder />
    </div>
  );
}
