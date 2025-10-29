// WahabOrderTable.jsx - Exclusive dashboard for Wahab orders

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import WahabOrderForm from './WahabOrderForm'; 
import EditOrderModal from './EditOrderModal';
import WahabReports from './WahabReports';
import './styles/table.css';
import ConfirmDialog from './components/ConfirmDialog';
import Modal from './components/Modal';
import LoadingPopup from './components/LoadingPopup';
import { logActivity } from './utils/activity';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { verifyWahabPassword } from './auth';
import ActionSplash from './components/ActionSplash';

const API_URL = (process.env.REACT_APP_API_BASE_URL && typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? process.env.REACT_APP_API_BASE_URL
  : 'https://order-b.vercel.app/api/orders';
const statusOptions = ['Pending', 'In Transit', 'Delivered', 'Cancelled'];
const DEBOUNCE_DELAY = 300;

function WahabOrderTable() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [showReports, setShowReports] = useState(false);
    const [editingStatusId, setEditingStatusId] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    // Delete confirmations
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAllOpen, setConfirmAllOpen] = useState(false);
    const [targetOrder, setTargetOrder] = useState(null);

    // Multi-select + counts
    const [selectedIds, setSelectedIds] = useState(new Set());
    const allSelected = orders.length > 0 && selectedIds.size === orders.length;
    const deliveredCount = (orders || []).filter(o => String(o.deliveryStatus).toLowerCase() === 'delivered').length;
    const cancelledCount = (orders || []).filter(o => String(o.deliveryStatus).toLowerCase() === 'cancelled').length;
    const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleSelectAll = () => {
      if (allSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(orders.map(o => o._id)));
    };

    // Password gate for protected actions
    const [pwdOpen, setPwdOpen] = useState(false);
    const [pwd, setPwd] = useState('');
    const [pwdError, setPwdError] = useState('');
    const [pwdAction, setPwdAction] = useState(null); // 'edit'|'delete'|'deleteAll'|'deleteSelected'|'deleteDelivered'|'deleteCancelled'
    const [pwdPayload, setPwdPayload] = useState(null);
    const openPwd = (action, payload = null) => { setPwdOpen(true); setPwd(''); setPwdError(''); setPwdAction(action); setPwdPayload(payload); };
    const submitPwd = () => {
      if (!verifyWahabPassword(pwd)) { setPwdError('Incorrect password'); return; }
      if (pwdAction === 'edit' && pwdPayload) handleEditClick(pwdPayload);
      else if (pwdAction === 'delete' && pwdPayload) askDelete(pwdPayload);
      else if (pwdAction === 'deleteAll') handleDeleteAllOrders();
      else if (pwdAction === 'deleteSelected') handleDeleteSelected();
      else if (pwdAction === 'deleteDelivered') handleDeleteDelivered();
      else if (pwdAction === 'deleteCancelled') handleDeleteCancelled();
      setPwdOpen(false); setPwdAction(null); setPwdPayload(null);
    };

    // Actions UI
    const [actionsOpen, setActionsOpen] = useState(false);
    const [actionsSplash, setActionsSplash] = useState(false);
    // Weekly export UI state
    const [weeklyOpen, setWeeklyOpen] = useState(false);
    const [weeklyStart, setWeeklyStart] = useState('');
    const [weeklyEnd, setWeeklyEnd] = useState('');
    const [exportingWeekly, setExportingWeekly] = useState(false);

    // Fetch only Wahab orders
    const fetchWahabOrders = useCallback(async (opts = {}) => {
        const { silent = false } = opts;
        if (!silent) setLoading(true); 
        setError(null);
        
        let url = `${API_URL}?owner=Wahab`; // Fixed filter for Wahab
        
        if (searchTerm) {
            url = `${API_URL}?owner=Wahab&search=${searchTerm}`;
        }

        try {
            const response = await axios.get(url);
            const sortedOrders = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setOrders(sortedOrders);
        } catch (err) {
            setError('Failed to fetch Wahab orders from server.');
            console.error(err);
        } finally { 
            if (!silent) setLoading(false); 
        }
    }, [searchTerm]);

    const askDelete = (order) => {
        setTargetOrder(order);
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!targetOrder) return;
        try {
            await axios.delete(`${API_URL}/${targetOrder._id}`);
            setOrders(prev => prev.filter(o => o._id !== targetOrder._id));
            logActivity({ type: 'delete', title: 'Wahab order deleted', detail: targetOrder.serialNumber || targetOrder._id, owner: targetOrder.owner || 'Wahab' });
        } catch(err) {
            alert('Failed to delete Wahab order.');
        } finally {
            setConfirmOpen(false);
            setTargetOrder(null);
        }
    };

    const handleEditClick = (order) => { setCurrentOrder(order); setIsEditing(true); };
    const handleCloseModal = () => { setIsEditing(false); setCurrentOrder(null); };
    const handleRefresh = useCallback((opts = {}) => fetchWahabOrders(opts), [fetchWahabOrders]);
    
    // Handle inline status change
    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await axios.put(`${API_URL}/${orderId}`, { deliveryStatus: newStatus });
            // Update local state
            setOrders(prev => prev.map(order => 
                order._id === orderId 
                    ? { ...order, deliveryStatus: newStatus }
                    : order
            ));
            setEditingStatusId(null);
            logActivity({ type: 'status', title: 'Wahab status updated', detail: `${orderId} → ${newStatus}` });
        } catch (err) {
            alert('Failed to update status.');
            console.error(err);
        }
    };
    
    // Toggle status dropdown
    const toggleStatusEdit = (orderId) => {
        setEditingStatusId(editingStatusId === orderId ? null : orderId);
    };
    
    // Delete all Wahab orders
    const handleDeleteAllOrders = () => {
        if (orders.length === 0) {
            alert('No Wahab orders to delete');
            return;
        }
        setConfirmAllOpen(true);
    };

    // Delete selected
    const [confirmSelectedOpen, setConfirmSelectedOpen] = useState(false);
    const handleDeleteSelected = () => {
      if (selectedIds.size === 0) { alert('Select at least one order'); return; }
      setConfirmSelectedOpen(true);
    };
    const confirmDeleteSelected = async () => {
      const ids = Array.from(selectedIds);
      try {
        await Promise.all(ids.map(id => axios.delete(`${API_URL}/${id}`)));
        setOrders(prev => prev.filter(o => !selectedIds.has(o._id)));
        setSelectedIds(new Set());
        logActivity({ type:'delete', title:'Selected Wahab orders deleted', detail: `${ids.length} orders` });
      } catch (err) {
        alert('❌ Failed to delete some selected orders.');
      } finally { setConfirmSelectedOpen(false); }
    };

    // Delete delivered
    const [confirmDeliveredOpen, setConfirmDeliveredOpen] = useState(false);
    const handleDeleteDelivered = () => { if (!deliveredCount) { alert('No delivered orders'); return; } setConfirmDeliveredOpen(true); };
    const confirmDeleteDelivered = async () => {
      const toDelete = (orders||[]).filter(o => String(o.deliveryStatus).toLowerCase()==='delivered');
      try {
        await Promise.all(toDelete.map(o=>axios.delete(`${API_URL}/${o._id}`)));
        setOrders(prev=>prev.filter(o => String(o.deliveryStatus).toLowerCase()!=='delivered'));
        logActivity({ type:'delete', title:'Wahab delivered orders deleted', detail:`${toDelete.length} orders` });
      } catch(err){ alert('❌ Failed to delete some delivered orders.'); }
      finally { setConfirmDeliveredOpen(false); }
    };

    // Delete cancelled
    const [confirmCancelledOpen, setConfirmCancelledOpen] = useState(false);
    const handleDeleteCancelled = () => { if (!cancelledCount) { alert('No cancelled orders'); return; } setConfirmCancelledOpen(true); };
    const confirmDeleteCancelled = async () => {
      const toDelete = (orders||[]).filter(o => String(o.deliveryStatus).toLowerCase()==='cancelled');
      try {
        await Promise.all(toDelete.map(o=>axios.delete(`${API_URL}/${o._id}`)));
        setOrders(prev=>prev.filter(o => String(o.deliveryStatus).toLowerCase()!=='cancelled'));
        logActivity({ type:'delete', title:'Wahab cancelled orders deleted', detail:`${toDelete.length} orders` });
      } catch(err){ alert('❌ Failed to delete some cancelled orders.'); }
      finally { setConfirmCancelledOpen(false); }
    };

    const confirmDeleteAll = async () => {
        try {
            const deletePromises = orders.map(order => axios.delete(`${API_URL}/${order._id}`));
            await Promise.all(deletePromises);
            setOrders([]);
            logActivity({ type: 'delete', title: 'All Wahab orders deleted', detail: `${orders.length} orders` });
        } catch (err) {
            alert('❌ Failed to delete some Wahab orders. Please try again.');
            console.error(err);
        } finally {
            setConfirmAllOpen(false);
        }
    };

    useEffect(() => {
        const delay = setTimeout(() => fetchWahabOrders(), DEBOUNCE_DELAY);
        return () => clearTimeout(delay);
    }, [searchTerm, fetchWahabOrders]);

    const statusClass = (s) => `status status--${String(s || '').toLowerCase().replace(/\\s+/g,'-')}`;

    const safeSavePDF = (doc, filename) => {
        try { doc.save(filename); }
        catch (e) {
            try {
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = filename; a.style.display = 'none';
                document.body.appendChild(a); a.click();
                setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 0);
            } catch {}
        }
    };

    const exportByStatus = (status) => {
        const list = (orders || []).filter(o => String(o.deliveryStatus).toLowerCase() === String(status).toLowerCase());
        if (!list.length) { alert(`No ${status} Wahab orders to export.`); return; }
        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'A4' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.text(`Wahab Orders — ${status}`, 40, 40);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}  •  Total: ${list.length}`, 40, 58);
        const body = list.map((o, i) => [
            String(i + 1),
            o.serialNumber || '-',
            new Date(o.orderDate || o.createdAt).toLocaleDateString(),
            o.owner || '-',
            o.deliveryStatus || '-',
        ]);
        autoTable(doc, {
            startY: 76,
            head: [['#', 'Serial', 'Date', 'Owner', 'Status']],
            body,
            styles: { fontSize: 9, cellPadding: 6 },
            headStyles: { fillColor: [37, 99, 235] },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 140 },
                2: { cellWidth: 90 },
                3: { cellWidth: 140 },
                4: { cellWidth: 'auto' },
            },
            didDrawPage: () => {
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.getHeight();
                doc.setFontSize(9);
                doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageSize.getWidth() - 80, pageHeight - 16);
            }
        });
        safeSavePDF(doc, `wahab-orders-${status.toLowerCase().replace(/\\s+/g,'-')}.pdf`);
    };

    const exportAllOrders = () => {
        const list = orders || [];
        if (!list.length) { alert('No Wahab orders to export.'); return; }
        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'A4' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.text('Wahab Orders — All', 40, 40);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}  •  Total: ${list.length}`, 40, 58);
        const body = list.map((o, i) => [
            String(i + 1),
            o.serialNumber || '-',
            new Date(o.orderDate || o.createdAt).toLocaleDateString(),
            o.owner || '-',
            o.deliveryStatus || '-',
        ]);
        autoTable(doc, {
            startY: 76,
            head: [['#', 'Serial', 'Date', 'Owner', 'Status']],
            body,
            styles: { fontSize: 9, cellPadding: 6 },
            headStyles: { fillColor: [37, 99, 235] },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 140 },
                2: { cellWidth: 90 },
                3: { cellWidth: 140 },
                4: { cellWidth: 'auto' },
            },
            didDrawPage: () => {
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.getHeight();
                doc.setFontSize(9);
                doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageSize.getWidth() - 80, pageHeight - 16);
            }
        });
        safeSavePDF(doc, 'wahab-orders-all.pdf');
    };

    // Export week-wise PDFs for a given date range (inclusive)
    const exportWeeklyByRange = async (startStr, endStr) => {
        if (!startStr || !endStr) { alert('Please select both start and end dates'); return; }
        const start = new Date(startStr);
        const end = new Date(endStr);
        if (isNaN(start) || isNaN(end)) { alert('Invalid date(s)'); return; }
        if (start > end) { alert('Start date must be before end date'); return; }
        const toStartOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
        const weekStartOf = (d) => { const x = toStartOfDay(d); const day = x.getDay(); const offset = (day + 6) % 7; x.setDate(x.getDate() - offset); return x; };
        const weekEndOf = (ws) => { const x = new Date(ws); x.setDate(x.getDate() + 6); x.setHours(23,59,59,999); return x; };
        const fmt = (d) => new Date(d).toLocaleDateString();

        const inRange = (d) => {
            const x = new Date(d);
            return x >= toStartOfDay(start) && x <= new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23,59,59,999);
        };

        const list = (orders || []).filter(o => inRange(o.orderDate || o.createdAt));
        if (!list.length) { alert('No Wahab orders in the selected range'); return; }

        // Group by week (Mon-Sun)
        const groups = new Map();
        for (const o of list) {
            const od = new Date(o.orderDate || o.createdAt);
            const ws = weekStartOf(od);
            const key = ws.toISOString().slice(0,10);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(o);
        }

        // Sort weeks ascending
        const weekKeys = Array.from(groups.keys()).sort();
        for (const key of weekKeys) {
            const ws = new Date(key);
            const we = weekEndOf(ws);
            const weekOrders = groups.get(key).sort((a,b)=> new Date(a.orderDate||a.createdAt) - new Date(b.orderDate||b.createdAt));

            const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'A4' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(14);
            doc.text(`Wahab Orders — ${fmt(ws)} to ${fmt(we)}`, 40, 40);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}  •  Total: ${weekOrders.length}`, 40, 58);
            const body = weekOrders.map((o, i) => [
                String(i + 1),
                o.serialNumber || '-',
                new Date(o.orderDate || o.createdAt).toLocaleDateString(),
                o.owner || '-',
                o.deliveryStatus || '-',
            ]);
            autoTable(doc, {
                startY: 76,
                head: [['#', 'Serial', 'Date', 'Owner', 'Status']],
                body,
                styles: { fontSize: 9, cellPadding: 6 },
                headStyles: { fillColor: [37, 99, 235] },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 140 },
                    2: { cellWidth: 90 },
                    3: { cellWidth: 140 },
                    4: { cellWidth: 'auto' },
                },
                didDrawPage: () => {
                    const pageSize = doc.internal.pageSize;
                    const pageHeight = pageSize.getHeight();
                    doc.setFontSize(9);
                    doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageSize.getWidth() - 80, pageHeight - 16);
                }
            });
            const fname = `wahab-orders-${key}_to_${we.toISOString().slice(0,10)}.pdf`;
            safeSavePDF(doc, fname);
            // brief yield to UI
            // eslint-disable-next-line no-await-in-loop
            await new Promise(r => setTimeout(r, 60));
        }
    };

    // Animated popup will cover UI when loading; no inline text
    if (error) return <p style={{color:'red', textAlign:'center'}}>{error}</p>;

    return (
        <div className="container">
            <LoadingPopup open={loading} />
            {/* Add Wahab Order Button */}
            <div style={{ marginBottom: '16px', marginTop: '16px', textAlign: 'right' }}>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="add-order-btn"
                    style={{
                        background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(30, 64, 175, 0.25)',
                        transform: 'translateY(0) scale(1)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        letterSpacing: '0.025em',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-1px) scale(1.02)';
                        e.target.style.boxShadow = '0 8px 20px rgba(30, 64, 175, 0.35)';
                        e.target.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0) scale(1)';
                        e.target.style.boxShadow = '0 4px 12px rgba(30, 64, 175, 0.25)';
                        e.target.style.background = 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)';
                    }}
                    onMouseDown={(e) => {
                        e.target.style.transform = 'translateY(0) scale(0.98)';
                    }}
                    onMouseUp={(e) => {
                        e.target.style.transform = 'translateY(-1px) scale(1.02)';
                    }}
                >
                    <span style={{ 
                        fontSize: '16px', 
                        fontWeight: '300',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '16px',
                        height: '16px'
                    }}>+</span>
                    <span className="nav-shine" aria-hidden></span>
                    Add Wahab Order
                </button>
            </div>

            <div className="table-card">
              <div className="table-toolbar" style={{ 
                overflowX: 'auto',
                display: 'flex',
                flexWrap: 'nowrap',
                gap: '16px'
              }}>
                <div className="toolbar-left">
                  <span className="kpi">
                    <span className="kpi-label">Wahab Orders</span>
                    <span className="kpi-value">{orders.length}</span>
                  </span>
                </div>
                <div className="toolbar-right" style={{ 
                  gap: 12, 
                  display: 'flex',
                  overflowX: 'auto',
                  minWidth: 0,
                  paddingBottom: '4px'
                }}>
                  <input
                    className="search"
                    type="text"
                    placeholder="Search Wahab Serial No..."
                    value={searchTerm}
                    onChange={(e)=>setSearchTerm(e.target.value)}
                    style={{ minWidth: '200px', flexShrink: 0 }}
                  />
                  <button className="btn" onClick={()=>{ setActionsSplash(true); setTimeout(()=>{ setActionsSplash(false); setActionsOpen(true); }, 600); }} style={{ background:'#111827', color:'#fff', border:'1px solid #0f172a', whiteSpace:'nowrap', flexShrink:0 }}>
                    Actions ▾
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => setShowReports(true)}
                    style={{ 
                      background: '#2563eb', 
                      color: 'white',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    Wahab Reports
                  </button>
                  <button 
                    className="btn" 
                    onClick={handleRefresh}
                    style={{
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    Refresh Wahab
                  </button>
                  <button 
                    className="btn" 
                    onClick={()=>openPwd('deleteAll')}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: '1px solid #dc2626',
                      marginLeft: '8px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                    title={`Delete all ${orders.length} Wahab orders`}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#ef4444';
                    }}
                  >
                    🗑️ Delete All Wahab ({orders.length})
                  </button>
                </div>
              </div>

              {orders.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center' }}>
                  No Wahab orders found for the current search.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /></th>
                        <th>Serial No.</th>
                        <th>Date</th>
                        <th>Owner</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order._id}>
                          <td data-label="Select"><input type="checkbox" checked={selectedIds.has(order._id)} onChange={()=>toggleSelect(order._id)} /></td>
                          <td data-label="Serial No.">{order.serialNumber}</td>
                          <td data-label="Date">{new Date(order.orderDate || order.createdAt).toLocaleDateString()}</td>
                          <td data-label="Owner">
                            <span style={{ 
                              fontWeight: 'bold', 
                              color: '#2563eb',
                              backgroundColor: '#eff6ff',
                              padding: '4px 8px',
                              borderRadius: '4px'
                            }}>
                              {order.owner}
                            </span>
                          </td>
                          <td data-label="Status">
                            {editingStatusId === order._id ? (
                              <select
                                value={order.deliveryStatus}
                                onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                onBlur={() => setEditingStatusId(null)}
                                autoFocus
                                style={{
                                  padding: '4px 8px',
                                  border: '2px solid #2563eb',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  background: 'white',
                                  cursor: 'pointer'
                                }}
                              >
                                {statusOptions.map(status => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            ) : (
                              <span 
                                className={statusClass(order.deliveryStatus)}
                                onClick={() => toggleStatusEdit(order._id)}
                                style={{ 
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  position: 'relative'
                                }}
                                title="Click to change status"
                              >
                                {order.deliveryStatus}
                              </span>
                            )}
                          </td>
                          <td data-label="Actions" className="actions-cell">
                            <button className="btn btn-edit" onClick={()=>openPwd('edit', order)}>Edit</button>
                            <button className="btn btn-delete" onClick={()=>openPwd('delete', order)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="table-footer">
                <span className="muted">Showing {orders.length} Wahab records</span>
              </div>
            </div>

            {isEditing && currentOrder && (
                <EditOrderModal
                    order={currentOrder}
                    onClose={handleCloseModal}
                    onOrderUpdated={handleRefresh}
                />
            )}

            {showReports && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        maxWidth: '95vw',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                    }}>
                        <WahabReports onClose={() => setShowReports(false)} />
                    </div>
                </div>
            )}

            {/* Add Wahab Order Modal */}
            <Modal open={showAddModal} title="Add Wahab Order" onClose={() => setShowAddModal(false)}>
              <WahabOrderForm 
                onOrderAdded={() => {
                  handleRefresh({ silent: true });
                  setShowAddModal(false);
                }} 
              />
            </Modal>

            {/* Delete confirmation dialogs */}
            <ConfirmDialog
                open={confirmOpen}
                title="Delete this Wahab order?"
                description={targetOrder ? `Serial ${targetOrder.serialNumber} will be permanently removed.` : ''}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDelete}
                onCancel={() => { setConfirmOpen(false); setTargetOrder(null); }}
                danger
            />
            <ConfirmDialog
                open={confirmAllOpen}
                title="Delete ALL Wahab orders?"
                description={`This will remove ${orders.length} Wahab orders permanently.`}
                confirmText="Delete All"
                cancelText="Cancel"
                onConfirm={confirmDeleteAll}
                onCancel={() => setConfirmAllOpen(false)}
                danger
            />
            <ConfirmDialog
                open={confirmSelectedOpen}
                title={`Delete selected (${selectedIds.size}) Wahab orders?`}
                description={`This will permanently remove ${selectedIds.size} selected orders.`}
                confirmText="Delete Selected"
                cancelText="Cancel"
                onConfirm={confirmDeleteSelected}
                onCancel={() => setConfirmSelectedOpen(false)}
                danger
            />
            <ConfirmDialog
                open={confirmDeliveredOpen}
                title={`Delete ALL Delivered Wahab orders?`}
                description={`This will permanently remove ${deliveredCount} delivered orders.`}
                confirmText="Delete Delivered"
                cancelText="Cancel"
                onConfirm={confirmDeleteDelivered}
                onCancel={() => setConfirmDeliveredOpen(false)}
                danger
            />
            <ConfirmDialog
                open={confirmCancelledOpen}
                title={`Delete ALL Cancelled Wahab orders?`}
                description={`This will permanently remove ${cancelledCount} cancelled orders.`}
                confirmText="Delete Cancelled"
                cancelText="Cancel"
                onConfirm={confirmDeleteCancelled}
                onCancel={() => setConfirmCancelledOpen(false)}
                danger
            />

            <ActionSplash open={actionsSplash} label="Actions" />

            {/* Actions Modal */}
            <Modal open={actionsOpen} title="Actions" onClose={()=>setActionsOpen(false)} size="md">
              <div className="actions-grid">
                <button className="modal-action export-all" onClick={()=>{ setActionsOpen(false); exportAllOrders(); }}>
                  <span>Export All</span>
                  <span className="arrow">→</span>
                </button>
                <button className="modal-action export-pending" onClick={()=>{ setActionsOpen(false); exportByStatus('Pending'); }}>
                  <span>Export Pending</span>
                  <span className="arrow">→</span>
                </button>
                <button className="modal-action export-delivered" onClick={()=>{ setActionsOpen(false); exportByStatus('Delivered'); }}>
                  <span>Export Delivered</span>
                  <span className="arrow">→</span>
                </button>
                <button className="modal-action export-cancelled" onClick={()=>{ setActionsOpen(false); exportByStatus('Cancelled'); }}>
                  <span>Export Cancelled</span>
                  <span className="arrow">→</span>
                </button>
                <button className="modal-action delete-selected" disabled={selectedIds.size === 0} onClick={()=>{ setActionsOpen(false); openPwd('deleteSelected'); }}>
                  <span>🗑️ Delete Selected ({selectedIds.size})</span>
                  <span className="arrow">→</span>
                </button>
                <button className="modal-action delete-delivered" disabled={deliveredCount === 0} onClick={()=>{ setActionsOpen(false); openPwd('deleteDelivered'); }}>
                  <span>🗑️ Delete Delivered ({deliveredCount})</span>
                  <span className="arrow">→</span>
                </button>
                <button className="modal-action export-weekly" onClick={()=>{ setActionsOpen(false); setWeeklyOpen(true); }}>
                  <span>Export Week-wise (Date Range)</span>
                  <span className="arrow">→</span>
                </button>
                <button className="modal-action delete-cancelled" disabled={cancelledCount === 0} onClick={()=>{ setActionsOpen(false); openPwd('deleteCancelled'); }}>
                  <span>🗑️ Delete Cancelled ({cancelledCount})</span>
                  <span className="arrow">→</span>
                </button>
                <button className="modal-action delete-all" onClick={()=>{ setActionsOpen(false); openPwd('deleteAll'); }}>
                  <span>🗑️ Delete All ({orders.length})</span>
                  <span className="arrow">→</span>
                </button>
              </div>
            </Modal>

            {/* Weekly Export Modal */}
            <Modal open={weeklyOpen} title="Export Wahab Orders (Week-wise)" onClose={()=>setWeeklyOpen(false)} size="md">
              <div style={{ display:'grid', gap:12 }}>
                <div style={{ fontSize:12, color:'#475569' }}>Example: extract PDF from 2023-03-12 to 2024-02-19</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div>
                    <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:4 }}>Start date</label>
                    <input type="date" value={weeklyStart} onChange={e=>setWeeklyStart(e.target.value)} style={{ padding:'10px 12px', border:'2px solid #e5e7eb', borderRadius:8, width:'100%' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:4 }}>End date</label>
                    <input type="date" value={weeklyEnd} onChange={e=>setWeeklyEnd(e.target.value)} style={{ padding:'10px 12px', border:'2px solid #e5e7eb', borderRadius:8, width:'100%' }} />
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                  <button className="btn" onClick={()=>setWeeklyOpen(false)} style={{ background:'#e5e7eb', border:'1px solid #d1d5db' }}>Cancel</button>
                  <button className="btn" disabled={exportingWeekly} onClick={async()=>{ setExportingWeekly(true); try { await exportWeeklyByRange(weeklyStart, weeklyEnd); } finally { setExportingWeekly(false); } }} style={{ background:'#2563eb', color:'#fff', border:'1px solid #1e40af' }}>
                    {exportingWeekly ? 'Exporting…' : 'Export Week-wise PDFs'}
                  </button>
                </div>
              </div>
            </Modal>

            {/* Password Modal */}
            <Modal open={pwdOpen} title="Enter Password" onClose={()=>setPwdOpen(false)} size="md">
              <div style={{ display:'grid', gap: 10 }}>
                <input type="password" placeholder="Password" value={pwd} onChange={(e)=>setPwd(e.target.value)} style={{ padding:'10px 12px', border:'2px solid #e5e7eb', borderRadius:8 }} />
                {pwdError && <div style={{ color:'#dc2626', fontWeight:600 }}>{pwdError}</div>}
                <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                  <button className="btn" onClick={()=>setPwdOpen(false)} style={{ background:'#e5e7eb', border:'1px solid #d1d5db' }}>Cancel</button>
                  <button className="btn" onClick={submitPwd} style={{ background:'#2563eb', color:'#fff', border:'1px solid #1e40af' }}>Continue</button>
                </div>
              </div>
            </Modal>
        </div>
    );
}

export default WahabOrderTable;
