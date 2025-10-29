import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { logActivity } from './utils/activity';

const API_URL = (process.env.REACT_APP_API_BASE_URL && typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? process.env.REACT_APP_API_BASE_URL
  : 'https://order-b.vercel.app/api/orders';

export default function AutoDetect() {
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef(null);
  const boxRef = useRef(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [form, setForm] = useState({ serialNumber: '', owner: '', orderDate: new Date().toISOString().slice(0,10) });

  const owners = useMemo(() => ['Ahsan', 'Emirate Essentials', 'Habibi Tools', 'Wahab'], []);

  // selection state for crop
  const [sel, setSel] = useState({ x: 0, y: 0, w: 0, h: 0, dragging: false });
  const containerRef = useRef(null);

  const startSel = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSel({ x, y, w: 0, h: 0, dragging: true });
  };
  const moveSel = (e) => {
    if (!sel.dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x2 = e.clientX - rect.left;
    const y2 = e.clientY - rect.top;
    const x = Math.min(sel.x, x2);
    const y = Math.min(sel.y, y2);
    const w = Math.abs(x2 - sel.x);
    const h = Math.abs(y2 - sel.y);
    setSel((s)=>({ ...s, x, y, w, h }));
  };
  const endSel = () => {
    if (!sel.dragging) return;
    setSel((s)=>({ ...s, dragging: false }));
  };
  const clearSel = () => setSel({ x:0, y:0, w:0, h:0, dragging:false });

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(''); setText(''); setForm(prev => ({ ...prev }));
    const r = new FileReader();
    r.onload = () => setImgSrc(String(r.result));
    r.readAsDataURL(f);
  };

  const drawRotated = (img, angleDeg, scaleFactor = 2) => {
    const rad = (angleDeg * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const w = img.width * scaleFactor;
    const h = img.height * scaleFactor;
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(w * cos + h * sin);
    canvas.height = Math.floor(w * sin + h * cos);
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    return canvas;
  };

  const preprocessImage = async (src, angle = 0) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // upscale + rotate
        const base = drawRotated(img, angle, 2);
        const ctx = base.getContext('2d');
        const imageData = ctx.getImageData(0, 0, base.width, base.height);
        const data = imageData.data;
        // adaptive-ish threshold using running mean (simple, fast)
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const v = Math.max(r, g, b); // emphasize colored text
          sum += v;
        }
        const avg = sum / (data.length / 4);
        const thresh = Math.max(140, Math.min(190, avg + 10));
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          let v = Math.max(r, g, b);
          // slight contrast boost
          v = (v - 128) * 1.25 + 128;
          const t = v > thresh ? 255 : 0;
          data[i] = data[i+1] = data[i+2] = t;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(base.toDataURL('image/png'));
      };
      img.src = src;
    });
  };

  const recognizeOnce = async (src, psm = '6') => {
    const Tesseract = await import('tesseract.js');
    const opts = { logger: () => {}, tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-', preserve_interword_spaces: '1', tessedit_pageseg_mode: psm };
    const { data } = await Tesseract.recognize(src, 'eng', opts);
    return data;
  };

  const pickSerial = (t) => {
    const serialRegexes = [
      /S\s*\.?\s*NO\s*[:#-]?\s*([A-Z0-9-]{3,})/i,
      /S\s*\/?\s*NO\s*[:#-]?\s*([A-Z0-9-]{3,})/i,
      /Serial\s*(?:No\.?|#|:)\s*([A-Z0-9-]{3,})/i,
      /Invoice\s*(?:No\.?|#|:)\s*([A-Z0-9-]{3,})/i,
      /Order\s*(?:No\.?|#|:)\s*([A-Z0-9-]{3,})/i,
      /\b([A-Z]{1,3}-?\d{4,})\b/,
      /\b(\d{5,})\b/
    ];
    for (const rx of serialRegexes) {
      const m = t.match(rx);
      if (m) return m[1] || m[0];
    }
    return '';
  };

  const runQuickOCR = async () => {
    if (!imgSrc) return;
    setBusy(true); setErr(''); // keep previous text for reference
    try {
      const processed = await preprocessImage(imgSrc, 0); // 0° only
      const d = await recognizeOnce(processed, '7'); // single-line-ish
      const raw = (d?.text || '').replace(/\uFFFD/g, '');
      if (raw) setText(raw);
      const serial = pickSerial(raw);
      const dateMatch = raw.match(/(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})|(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/);
      const ownerFound = owners.find(o => new RegExp(o, 'i').test(raw)) || '';
      setForm(prev => ({
        ...prev,
        serialNumber: serial || prev.serialNumber,
        orderDate: dateMatch ? normalizeDate(dateMatch[0]) : prev.orderDate,
        owner: ownerFound || prev.owner
      }));
    } catch (e) {
      setErr('Quick scan failed. Try deep scan.');
    } finally { setBusy(false); }
  };

  const cropCanvasFromSelection = () => {
    if (!imgRef.current || !containerRef.current || sel.w < 5 || sel.h < 5) return null;
    const img = imgRef.current;
    // compute scale from displayed size to natural
    const dispW = img.clientWidth;
    const dispH = img.clientHeight;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const scaleX = natW / dispW;
    const scaleY = natH / dispH;
    // selection relative to image box (image centered? ensure container fits image size only)
    const sx = Math.max(0, Math.floor(sel.x * scaleX));
    const sy = Math.max(0, Math.floor(sel.y * scaleY));
    const sw = Math.min(natW - sx, Math.floor(sel.w * scaleX));
    const sh = Math.min(natH - sy, Math.floor(sel.h * scaleY));
    const canvas = document.createElement('canvas');
    canvas.width = sw; canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvas.toDataURL('image/png');
  };

  const runDeepOCR = async () => {
    if (!imgSrc) return;
    setBusy(true); setErr('');
    const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
    try {
      const angles = [0, 90, 180, 270];
      let best = { score: -1, text: '', serial: '', date: '', owner: '' };
      for (const angle of angles) {
        const processed = await preprocessImage(imgSrc, angle);
        const p1 = recognizeOnce(processed, '6');
        const p2 = recognizeOnce(processed, '7');
        const results = await Promise.race([
          Promise.all([p1, p2]),
          timeout(8000) // 8s safety
        ]);
        if (!Array.isArray(results)) break; // timed out
        for (const d of results) {
          const raw = (d?.text || '').replace(/\uFFFD/g, '');
          const serial = pickSerial(raw);
          const dateMatch = raw.match(/(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})|(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})/);
          const ownerFound = owners.find(o => new RegExp(o, 'i').test(raw)) || '';
          const score = (serial ? serial.replace(/[^A-Z0-9]/gi,'').length * 10 : 0) + (d?.confidence || 0) + (ownerFound ? 5 : 0);
          if (score > best.score) best = { score, text: raw, serial, date: dateMatch ? dateMatch[0] : '', owner: ownerFound };
        }
      }
      if (best.text) setText(best.text);
      setForm(prev => ({
        ...prev,
        serialNumber: best.serial || prev.serialNumber,
        orderDate: best.date ? normalizeDate(best.date) : prev.orderDate,
        owner: best.owner || prev.owner
      }));
    } catch (e) {
      setErr('Deep scan timed out or failed. You can edit fields manually.');
    } finally { setBusy(false); }
  };

  const normalizeDate = (s) => {
    try {
      const d = new Date(s.replace(/\./g,'/').replace(/-/g,'/'));
      if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
    } catch {}
    return new Date().toISOString().slice(0,10);
  };

  const createOrder = async () => {
    if (!form.serialNumber || !form.owner) { setErr('Please fill Serial and Owner'); return; }
    setBusy(true); setErr('');
    try {
      const payload = { serialNumber: form.serialNumber, owner: form.owner, orderDate: form.orderDate };
      await axios.post(API_URL, payload);
      logActivity({ type: 'create', title: 'Order created from invoice', detail: form.serialNumber });
      alert('Order created successfully');
      setImgSrc(''); setText('');
    } catch (e) {
      setErr('Failed to create order (maybe already exists).');
    } finally { setBusy(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (imgSrc) runQuickOCR(); /* quick auto */ }, [imgSrc]);

  return (
    <div className="profile-card" style={{ padding: 16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12 }}>
        <h3 style={{ margin:0 }}>Auto Detect from Invoice (beta)</h3>
        <label className="btn" style={{ background:'#2563eb', color:'#fff', border:'1px solid #1e40af', padding:'8px 12px', borderRadius:6, cursor:'pointer' }}>
          Upload Image
          <input type="file" accept="image/*" onChange={onFile} style={{ display:'none' }} />
        </label>
      </div>

      {err && <div style={{ color:'#b91c1c', marginBottom: 8 }}>{err}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div>
          {imgSrc ? (
            <div ref={containerRef} style={{ position:'relative', border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden' }}
                 onMouseDown={startSel} onMouseMove={moveSel} onMouseUp={endSel}>
              <img ref={imgRef} src={imgSrc} alt="preview" style={{ width:'100%', maxHeight:360, objectFit:'contain', display:'block' }} />
              {(sel.w>2 && sel.h>2) && (
                <div ref={boxRef} style={{ position:'absolute', left: sel.x, top: sel.y, width: sel.w, height: sel.h, border:'2px solid #2563eb', background:'rgba(37,99,235,0.15)' }} />
              )}
            </div>
          ) : (
            <div style={{ border:'1px dashed #cbd5e1', borderRadius:8, padding:20, color:'#64748b' }}>Select an invoice image to start OCR. Tip: drag to select the S.NO area for best results.</div>
          )}
          <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
            <button className="btn" onClick={() => { const c = cropCanvasFromSelection(); if (!c) { setErr('Select an area first'); return; } setBusy(true); setTimeout(async()=>{ try { const processed = await preprocessImage(c, 0); const d = await recognizeOnce(processed, '7'); const raw=(d?.text||'').replace(/\uFFFD/g,''); if(raw) setText(raw); const serial=pickSerial(raw); setForm(prev=>({ ...prev, serialNumber: serial||prev.serialNumber })); } catch(e){ setErr('Crop OCR failed'); } finally{ setBusy(false);} },0); }} disabled={!imgSrc || busy}>OCR Crop (Serial)</button>
            <button className="btn" onClick={clearSel} disabled={!imgSrc || busy}>Clear Selection</button>
          </div>
          {busy && <div style={{ marginTop:8, color:'#475569' }}>Detecting text…</div>}
          {text && (
            <div style={{ marginTop:8 }}>
              <div style={{ fontSize:12, color:'#64748b', marginBottom:4 }}>Detected text (for reference)</div>
              <textarea value={text} readOnly rows={8} style={{ width:'100%', fontSize:12 }} />
            </div>
          )}
        </div>
        <div>
          <div className="input-group"><label>Serial Number</label><input value={form.serialNumber} onChange={e=>setForm({ ...form, serialNumber: e.target.value })} /></div>
          <div className="input-group"><label>Owner</label>
            <select value={form.owner} onChange={e=>setForm({ ...form, owner: e.target.value })}>
              <option value="">Select owner</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="input-group"><label>Date</label><input type="date" value={form.orderDate} onChange={e=>setForm({ ...form, orderDate: e.target.value })} /></div>
          <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
            <button className="btn" onClick={runQuickOCR} disabled={!imgSrc || busy} title="Fast (0°)">Quick Scan</button>
            <button className="btn" onClick={runDeepOCR} disabled={!imgSrc || busy} title="Try rotated & multi-pass (slow)">Deep Scan (slow)</button>
            <button className="btn" onClick={createOrder} disabled={busy} style={{ background:'#16a34a', color:'#fff', border:'1px solid #15803d' }}>Create Order</button>
          </div>
        </div>
      </div>
    </div>
  );
}
