// WahabReports.jsx - Exclusive reports for Wahab orders

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = (process.env.REACT_APP_API_BASE_URL && typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? process.env.REACT_APP_API_BASE_URL
  : 'https://order-tracking-system-version-2-bac.vercel.app/api/orders';

// Reusable animated SVG Donut Chart
function DonutChart({ segments, size = 240, strokeWidth = 36 }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const total = segments.reduce((s, x) => s + x.value, 0);
    const [reveal, setReveal] = useState(false);

    const segmentsKey = React.useMemo(() => segments.map(s => `${s.label}:${s.value}:${s.color}`).join('|'), [segments]);

    useEffect(() => {
        // trigger animation on mount/update
        const t = setTimeout(() => setReveal(true), 30);
        return () => clearTimeout(t);
    }, [total, segmentsKey]);

    let acc = 0; // cumulative offset

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ transform: 'rotate(-90deg)' }}
            role="img"
            aria-label="Wahab Orders Donut chart"
        >
            {/* background track */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={strokeWidth}
            />
            {segments.map((seg, i) => {
                const fraction = total > 0 ? seg.value / total : 0;
                const length = fraction * circumference;
                const offset = circumference - acc;
                acc += length;
                return (
                    <circle
                        key={seg.label}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="butt"
                        strokeDasharray={`${reveal ? length : 0} ${circumference}`}
                        strokeDashoffset={offset}
                        style={{
                            transition: 'stroke-dasharray 1.2s ease-out, stroke-dashoffset 1.2s ease-out',
                            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))'
                        }}
                    />
                );
            })}
        </svg>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div className="report-card" style={{ borderTopColor: color }}>
            <div className="report-card-label">{label}</div>
            <div className="report-card-value" style={{ color }}>{value}</div>
        </div>
    );
}

function WahabReports({ onClose }) {
    const [counts, setCounts] = useState({ pending: 0, inTransit: 0, delivered: 0, cancelled: 0, total: 0 });
    const [settlements, setSettlements] = useState([]); // computed payment buckets by markers
    const [markers, setMarkers] = useState([]);


    const computeCounts = useCallback((list) => {
        const c = { pending: 0, inTransit: 0, delivered: 0, cancelled: 0 };
        (list || []).forEach(o => {
            const s = (o.deliveryStatus || '').toLowerCase();
            if (s === 'pending') c.pending += 1;
            else if (s === 'in transit') c.inTransit += 1;
            else if (s === 'delivered') c.delivered += 1;
            else if (s === 'cancelled') c.cancelled += 1;
        });
        const total = c.pending + c.inTransit + c.delivered + c.cancelled;
        setCounts({ ...c, total });
    }, []);

    // Compute settlement buckets by backend markers
    const computeSettlements = useCallback((list, mlist) => {
        const orders = (list || []).slice().sort((a,b)=> new Date(b.createdAt || b.orderDate) - new Date(a.createdAt || a.orderDate));
        const idx = new Map();
        orders.forEach((o, i) => idx.set(o._id, i));
        const markerList = (mlist || [])
            .filter(m => m && m.afterOrderId && idx.has(m.afterOrderId))
            .map(m => ({ ...m, rowIndex: idx.get(m.afterOrderId) }))
            .sort((a,b)=> a.rowIndex - b.rowIndex); // top→down
        const buckets = [];
        for (let i = 0; i < markerList.length; i++) {
            const m = markerList[i];
            const start = m.rowIndex + 1; // rows strictly below marker
            const end = (i + 1 < markerList.length) ? (markerList[i+1].rowIndex + 1) : orders.length;
            const slice = orders.slice(start, end);
            const stats = { total: slice.length, delivered: 0, pending: 0, cancelled: 0, inTransit: 0 };
            for (const o of slice) {
                const s = String(o.deliveryStatus || '').toLowerCase();
                if (s === 'delivered') stats.delivered++;
                else if (s === 'pending') stats.pending++;
                else if (s === 'cancelled') stats.cancelled++;
                else if (s === 'in transit') stats.inTransit++;
            }
            const rate = 500; // PKR per delivered
            const earnings = stats.delivered * rate;
            buckets.push({
                id: m._id || m.id,
                label: `After ${orders[m.rowIndex]?.serialNumber || 'row'}`,
                time: m.createdAt,
                stats,
                earnings,
                orders: slice,
            });
        }
        setSettlements(buckets);
    }, []);

    // Now that callbacks exist, run initial fetch
    useEffect(() => {
        const fetchWahabOrders = async () => {
            try {
                // Fetch only Wahab orders
                const res = await axios.get(`${API_URL}?owner=Wahab`);
                const data = Array.isArray(res.data) ? res.data : [];
                const mres = await axios.get(`${API_URL}/settlements?owner=Wahab`);
                const mlist = Array.isArray(mres.data) ? mres.data : [];
                setMarkers(mlist);
                computeCounts(data);
                computeSettlements(data, mlist);
            } catch (e) {
                setCounts({ pending: 0, inTransit: 0, delivered: 0, cancelled: 0, total: 0 });
                setSettlements([]);
                setMarkers([]);
            }
        };
        fetchWahabOrders();
    }, [computeCounts, computeSettlements]);

    const colors = {
        pending: '#f59e0b',     // amber
        inTransit: '#3b82f6',   // blue  
        delivered: '#22c55e',   // green
        cancelled: '#ef4444'    // red
    };

    const segments = [
        { label: 'Pending', value: counts.pending, color: colors.pending },
        { label: 'In Transit', value: counts.inTransit, color: colors.inTransit },
        { label: 'Delivered', value: counts.delivered, color: colors.delivered },
        { label: 'Cancelled', value: counts.cancelled, color: colors.cancelled },
    ];

    // PDF helpers
    const statusColor = (s) => {
        const k = String(s || '').toLowerCase();
        if (k === 'delivered') return { bg: [209, 250, 229], fg: [16, 185, 129] }; // green
        if (k === 'cancelled') return { bg: [254, 226, 226], fg: [239, 68, 68] }; // red
        if (k === 'in transit') return { bg: [219, 234, 254], fg: [59, 130, 246] }; // blue
        if (k === 'pending') return { bg: [254, 243, 199], fg: [245, 158, 11] }; // amber
        return { bg: [243, 244, 246], fg: [31, 41, 55] };
    };

    const downloadSettlementPdf = (bucket, index) => {
        const list = bucket?.orders || [];
        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'A4' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.text(`Wahab Settlement — Marker #${index + 1} (${bucket.label})`, 40, 40);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}  •  Orders: ${list.length}  •  Delivered: ${bucket.stats?.delivered || 0}`, 40, 58);
        const body = list.map((o, i) => [
            String(i + 1),
            o.serialNumber || '-',
            new Date(o.orderDate || o.createdAt).toLocaleDateString(),
            o.deliveryStatus || '-',
        ]);
        autoTable(doc, {
            startY: 76,
            head: [['#', 'Serial', 'Date', 'Status']],
            body,
            styles: { fontSize: 9, cellPadding: 6 },
            headStyles: { fillColor: [109, 40, 217] },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 180 },
                2: { cellWidth: 100 },
                3: { cellWidth: 'auto' },
            },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    const status = data.row?.raw?.[3];
                    const { bg, fg } = statusColor(status);
                    if (data.column.index === 3) {
                        data.cell.styles.fillColor = bg;
                        data.cell.styles.textColor = fg;
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            },
            didDrawPage: () => {
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.getHeight();
                doc.setFontSize(9);
                doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageSize.getWidth() - 80, pageHeight - 16);
            }
        });
        const safe = String(bucket?.label || `marker_${index + 1}`).replace(/[^a-z0-9-_]+/ig, '_');
        try { doc.save(`wahab-settlement-${safe}.pdf`); }
        catch (e) {
            try {
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `wahab-settlement-${safe}.pdf`; a.style.display = 'none';
                document.body.appendChild(a); a.click();
                setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 0);
            } catch {}
        }
    };

    return (
        <div className="reports-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="reports-title">Wahab Orders Reports & Analytics</h2>
                <button 
                    className="btn" 
                    onClick={onClose}
                    style={{ 
                        background: '#ef4444', 
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    ✕ Close
                </button>
            </div>

            <div className="owner-filter" style={{ marginBottom: '20px' }}>
                <button
                    type="button"
                    className="owner-chip active"
                    style={{
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontWeight: 'bold'
                    }}
                    disabled
                >
                    <span className="owner-name">Wahab Orders Only</span>
                    <span className="owner-count">{counts.total}</span>
                </button>
            </div>

            {/* Summary Stats Card */}
            <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                color: 'white',
                padding: '24px',
                borderRadius: '16px',
                marginBottom: '20px',
                boxShadow: '0 10px 30px rgba(30, 41, 59, 0.3)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '20px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', opacity: 0.9 }}>TOTAL ORDERS</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{counts.total}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', opacity: 0.9 }}>DELIVERED</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>{counts.delivered}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', opacity: 0.9 }}>PKR EARNED</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fbbf24' }}>{(counts.delivered * 500).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', opacity: 0.9 }}>SUCCESS RATE</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#60a5fa' }}>{counts.total > 0 ? Math.round((counts.delivered / counts.total) * 100) : 0}%</div>
                </div>
            </div>

            {/* Earnings Card - Only show if delivered orders exist */}
            {counts.delivered > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    boxShadow: '0 8px 25px rgba(34, 197, 94, 0.3)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-50%',
                        width: '200%',
                        height: '200%',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '50%',
                        transform: 'rotate(45deg)'
                    }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ 
                            fontSize: '16px', 
                            fontWeight: '600',
                            marginBottom: '12px',
                            letterSpacing: '0.5px'
                        }}>
                            WAHAB EARNINGS
                        </div>
                        <div style={{ 
                            fontSize: '36px', 
                            fontWeight: 'bold',
                            marginBottom: '8px',
                            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}>
                            {(counts.delivered * 500).toLocaleString()} PKR
                        </div>
                        <div style={{ 
                            fontSize: '14px', 
                            opacity: 0.8
                        }}>
                            {counts.delivered} Delivered Orders × 500 PKR
                        </div>
                    </div>
                </div>
            )}

            <div className="reports-grid">
                <div className="donut-wrap">
                    <div className="donut-outer glow">
                        <DonutChart segments={segments} />
                        <div className="donut-center">
                            <div className="center-label">Wahab Orders</div>
                            <div className="center-value count-up">{counts.total}</div>
                        </div>
                    </div>
                </div>

                <div className="legend-wrap">
                    {segments.map(s => (
                        <div className="legend-item" key={s.label}>
                            <span className="legend-dot" style={{ background: s.color }} />
                            <span className="legend-text">{s.label}</span>
                            <span className="legend-value">{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="cards-row">
                <StatCard label="Pending" value={counts.pending} color={colors.pending} />
                <StatCard label="In Transit" value={counts.inTransit} color={colors.inTransit} />
                <StatCard label="Delivered" value={counts.delivered} color={colors.delivered} />
                <StatCard label="Cancelled" value={counts.cancelled} color={colors.cancelled} />
                <div className="report-card" style={{ borderTopColor: '#22c55e', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
                    <div className="report-card-label">Total Earnings</div>
                    <div className="report-card-value" style={{ color: '#22c55e', fontSize: '18px', fontWeight: 'bold' }}>
                        {(counts.delivered * 500).toLocaleString()} PKR
                    </div>
                    <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>
                        {counts.delivered} × 500 PKR
                    </div>
                </div>
            </div>

            {/* Settlement Payments (by your markers) */}
            {settlements.length > 0 && (
                <div style={{ marginTop: 20 }}>
                    <h3 style={{ margin: '12px 0 8px 0', color: '#0f172a' }}>Settlement Payments (by your markers)</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 12,
                    }}>
                        {settlements.map((s, i) => (
                            <div key={s.id} className="report-card" style={{ borderTopColor: '#6d28d9', background: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)' }}>
                                <div className="report-card-label" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                    <span>Marker #{i+1} • {s.label}</span>
                                    <span style={{ fontSize: 11, color:'#6b7280' }}>{new Date(s.time).toLocaleString()}</span>
                                </div>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 6 }}>
                                    <div>
                                        <div style={{ fontSize:12, color:'#374151' }}>Delivered</div>
                                        <div style={{ fontSize:18, fontWeight:700, color:'#16a34a' }}>{s.stats.delivered}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize:12, color:'#374151' }}>Total</div>
                                        <div style={{ fontSize:18, fontWeight:700 }}>{s.stats.total}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize:12, color:'#374151' }}>PKR</div>
                                        <div style={{ fontSize:18, fontWeight:700, color:'#f59e0b' }}>{s.earnings.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div style={{ display:'flex', gap:8, marginTop:8, fontSize:12 }}>
                                    <span style={{ background:'#dcfce7', color:'#166534', padding:'2px 6px', borderRadius:6 }}>D {s.stats.delivered}</span>
                                    <span style={{ background:'#fee2e2', color:'#991b1b', padding:'2px 6px', borderRadius:6 }}>C {s.stats.cancelled}</span>
                                    <span style={{ background:'#fde68a', color:'#92400e', padding:'2px 6px', borderRadius:6 }}>P {s.stats.pending}</span>
                                    <span style={{ background:'#bfdbfe', color:'#1e3a8a', padding:'2px 6px', borderRadius:6 }}>T {s.stats.inTransit}</span>
                                </div>
                                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
                                    <button className="btn" style={{ background:'#6d28d9', color:'#fff', border:'1px solid #5b21b6' }} onClick={() => downloadSettlementPdf(s, i)}>
                                        Download PDF
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bars-wrap">
                {segments.map(s => (
                    <div className="bar-item" key={`bar-${s.label}`}>
                        <div className="bar-label">{s.label}</div>
                        <div className="bar-track">
                            <div
                                className="bar-fill"
                                style={{
                                    width: counts.total > 0 ? `${Math.round((s.value / counts.total) * 100)}%` : '0%',
                                    background: s.color
                                }}
                            />
                        </div>
                        <div className="bar-value">{counts.total > 0 ? `${Math.round((s.value / counts.total) * 100)}%` : '0%'}</div>
                    </div>
                ))}
            </div>

            {counts.total === 0 && (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: '#666',
                    fontSize: '18px' 
                }}>
                    No Wahab orders found. Add some orders to see analytics.
                </div>
            )}
        </div>
    );
}

export default WahabReports;