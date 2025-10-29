// ==========================================================
// frontend/src/OrderEditModal.js 
// ==========================================================
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VENDORS = ['Ahsan', 'Habibi Tools', 'Emirate Essentials'];
const STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
const API_URL = process.env.REACT_APP_API_BASE_URL;

const OrderEditModal = ({ orderId, onClose, onUpdate, onDelete }) => {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(false); 

    // Form States for Editing
    const [serialNumber, setSerialNumber] = useState('');
    const [vendor, setVendor] = useState('');
    const [orderDate, setOrderDate] = useState('');
    const [deliveryStatus, setDeliveryStatus] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            if (!orderId) return;
            setLoading(true);
            try {
                const response = await axios.get(`${API_URL}/${orderId}`);
                const fetchedOrder = response.data;
                setOrder(fetchedOrder);
                
                setSerialNumber(fetchedOrder.serialNumber);
                setVendor(fetchedOrder.vendor);
                setOrderDate(fetchedOrder.orderDate ? new Date(fetchedOrder.orderDate).toISOString().split('T')[0] : ''); 
                setDeliveryStatus(fetchedOrder.deliveryStatus);
                setLoading(false);
            } catch (err) {
                setError("Could not fetch order details.");
                setLoading(false);
            }
        };
        fetchDetails();
    }, [orderId]);

    // Handle Edit Submission
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const updatedData = { serialNumber, vendor, orderDate, deliveryStatus, notes: notes.trim() };

            await axios.patch(`${API_URL}/${orderId}`, updatedData);
            alert("Order updated successfully!");
            onUpdate(); 
            onClose(); 
        } catch (err) {
            alert(`Error saving: ${err.response?.data?.error || 'Server error'}`);
        }
    };
    
    // Handle Delete
    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to delete order ${order.serialNumber}? This cannot be undone.`)) {
            try {
                await axios.delete(`${API_URL}/${orderId}`);
                alert("Order successfully deleted!");
                onDelete(); 
                onClose(); 
            } catch (err) {
                alert(`Error deleting order: ${err.response?.data?.error || 'Server error'}`);
            }
        }
    };

    if (loading) return (
        <div className="details-modal"><div className="details-content">Loading...</div></div>
    );
    if (error || !order) return (
        <div className="details-modal"><div className="details-content">Error: {error || 'No data found.'}</div></div>
    );

    return (
        <div className="details-modal">
            <div className="details-content">
                <button className="close-btn" onClick={onClose}>&times;</button>
                <h2>Order: {order.serialNumber}</h2>
                
                {!editMode ? (
                    <>
                        {/* History View */}
                        <p><strong>Vendor:</strong> {order.vendor}</p>
                        <p><strong>Order Date:</strong> {new Date(order.orderDate).toLocaleDateString()}</p>
                        <p><strong>Current Status:</strong> <span className={`status-tag status-${order.deliveryStatus.toLowerCase()}`}>{order.deliveryStatus}</span></p>

                        <button onClick={() => setEditMode(true)} className="edit-btn">Edit Details</button>
                        <button onClick={handleDelete} className="delete-btn">Delete Order</button>

                        <hr/>
                        <h3>Status History</h3>
                        <div className="history-timeline">
                            {order.history && order.history.length > 0 ? (
                                order.history.slice().reverse().map((item, index) => (
                                    <div key={index} className="history-item">
                                        <div className="history-dot"></div>
                                        <div className="history-info">
                                            <p className={`status-tag status-${item.status.toLowerCase()}`}>**{item.status}**</p>
                                            <small>{new Date(item.timestamp).toLocaleString()}</small>
                                            {item.notes && <p className="history-notes">Note: {item.notes}</p>}
                                        </div>
                                    </div>
                                ))
                            ) : (<p>No history recorded yet.</p>)}
                        </div>
                    </>
                ) : (
                    /* Edit Mode Form */
                    <form onSubmit={handleSave} className="edit-form">
                        <h3>Edit Order Details</h3>
                        <label>Serial Number (Unique):</label>
                        <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required />
                        
                        <label>Vendor:</label>
                        <select value={vendor} onChange={(e) => setVendor(e.target.value)} required>
                            {VENDORS.map(v => (<option key={v} value={v}>{v}</option>))}
                        </select>

                        <label>Order Date:</label>
                        <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
                        
                        <label>Delivery Status:</label>
                        <select value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value)} required>
                            {STATUSES.map(s => (<option key={s} value={s}>{s}</option>))}
                        </select>
                        
                        <label>Notes for Status Change (Optional):</label>
                        <input type="text" placeholder="e.g., Customer requested delay" value={notes} onChange={(e) => setNotes(e.target.value)} />
                        
                        <button type="submit" className="save-btn">Save Changes</button>
                        <button type="button" onClick={() => setEditMode(false)} className="cancel-btn">Cancel Edit</button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default OrderEditModal;