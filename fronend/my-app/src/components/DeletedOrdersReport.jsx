import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';


const API_URL = process.env.REACT_APP_API_BASE_URL || '/api/orders';

function safeSavePDF(doc, filename) {
  try {
    // Primary path
    doc.save(filename);
  } catch (e) {
    try {
      // Fallback: manual anchor download
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 0);
    } catch {}
  }
}

export default function DeletedOrdersReport() {
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState([]);
  const [err, setErr] = useState('');

  const fetchDeleted = useCallback(async () => {
    try {
      setErr('');
      const res = await axios.get(`${API_URL}/deleted`);
      const items = Array.isArray(res.data) ? res.data : [];
      const norm = items.map((x, idx) => ({
        idx: items.length - idx,
        time: x.deletedAt || x.updatedAt || x.createdAt,
        detail: x.serialNumber || x.originalId || '-',
        owner: x.owner || 'Unknown',
      }));
      setDeleted(norm);
    } catch (e) {
      setErr('Failed to fetch deleted orders from server');
      setDeleted([]);
    }
  }, []);

  useEffect(() => { fetchDeleted(); }, [fetchDeleted]);

  // Fetch all deleted orders from backend by paging (no practical limit for PDF)
  const fetchAllDeleted = async () => {
    const out = [];
    let page = 1;
    const limit = 5000; // backend max per page
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await axios.get(`${API_URL}/deleted?page=${page}&limit=${limit}`);
      const items = Array.isArray(res.data) ? res.data : [];
      if (!items.length) break;
      for (const x of items) {
        out.push({
          time: x.deletedAt || x.updatedAt || x.createdAt,
          detail: x.serialNumber || x.originalId || '-',
          owner: x.owner || 'Unknown',
        });
      }
      if (items.length < limit) break;
      page += 1;
      // brief yield to UI
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 50));
    }
    return out;
  };

  const downloadAll = async () => {
    setBusy(true);
    try {
      const all = await fetchAllDeleted();
      if (!all.length) { setBusy(false); return; }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'A4' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.text('Deleted Orders Report', 40, 40);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}  •  Total: ${all.length}`, 40, 58);

      const body = all.map((r, i) => [
        String(i + 1),
        new Date(r.time).toLocaleString(),
        r.detail,
        r.owner,
      ]);

      autoTable(doc, {
        startY: 76,
        head: [['#', 'Deleted At', 'Serial/ID', 'Owner']],
        body,
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [37, 99, 235] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 160 },
          2: { cellWidth: 200 },
          3: { cellWidth: 'auto' },
        },
        didDrawPage: () => {
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.getHeight();
          doc.setFontSize(9);
          doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageSize.getWidth() - 80, pageHeight - 16);
        }
      });

      safeSavePDF(doc, 'deleted-orders.pdf');
    } catch (e) {
      setErr('Failed to download deleted orders PDF');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-card" style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Deleted Orders Report</h3>
        <div style={{ display:'flex', gap: 8, flexWrap:'wrap' }}>
          <button type="button" onClick={downloadAll} disabled={!deleted.length || busy} style={{
            background: '#2563eb', color: '#fff', border: '1px solid #1e40af', padding: '8px 12px', borderRadius: 6,
            cursor: deleted.length && !busy ? 'pointer' : 'not-allowed', transition: 'none', boxShadow: 'none'
          }}>
{busy ? 'Preparing…' : 'Download PDF (All)'}
          </button>
          <button type="button" onClick={async()=>{
            if (!deleted.length) return;
            const ok = window.confirm(`Delete all ${deleted.length} archived entries? This cannot be undone.`);
            if (!ok) return;
            setBusy(true);
            try {
              await axios.delete(`${API_URL}/deleted`);
              await fetchDeleted();
            } catch (e) { setErr('Failed to clear deleted orders'); }
            setBusy(false);
          }} disabled={!deleted.length || busy} style={{
            background:'#ef4444', color:'#fff', border:'1px solid #dc2626', padding:'8px 12px', borderRadius:6
          }}>
            Delete All
          </button>
        </div>
      </div>
      <p className="subtle" style={{ marginTop: 0 }}>
        Preview shows recent deletions. Click the button to download ALL deleted orders as a single PDF.
      </p>
      {err && <div className="status-message error-message" style={{color:'#b91c1c'}}>{err}</div>}

      {!deleted.length ? (
        <div className="muted">No deletions found.</div>
      ) : null}

      {!deleted.length ? null : (
        <div style={{ maxHeight: 280, overflow: 'auto', borderTop: '1px solid #f1f5f9', marginTop: 8 }}>
          <table className="table" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 6px'}}>#</th>
                <th style={{ textAlign: 'left', padding: '8px 6px'}}>Deleted At</th>
                <th style={{ textAlign: 'left', padding: '8px 6px'}}>Serial/ID</th>
                <th style={{ textAlign: 'left', padding: '8px 6px'}}>Owner</th>
              </tr>
            </thead>
            <tbody>
              {deleted.map((r, i) => (
                <tr key={`${r.time}-${i}`}>
                  <td style={{ padding: '6px' }}>{i + 1}</td>
                  <td style={{ padding: '6px' }}>{new Date(r.time).toLocaleString()}</td>
                  <td style={{ padding: '6px' }}>{r.detail}</td>
                  <td style={{ padding: '6px' }}>{r.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
