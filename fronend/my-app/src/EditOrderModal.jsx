// Frontend/src/components/EditOrderModal.jsx
import React, { useState } from 'react';
import axios from 'axios';

// ✅ Correct deployed backend URL
const API_URL = 'https://order-b.vercel.app/api/orders';

function EditOrderModal({ order, onClose, onOrderUpdated }) {
    const statusOptions = ['Pending', 'In Transit', 'Delivered', 'Cancelled'];
    const ownerOptions = ['Emirate Essentials', 'Ahsan', 'Habibi Tools'];

    const [formData, setFormData] = useState({
        serialNumber: order.serialNumber,
        orderDate: new Date(order.orderDate).toISOString().split('T')[0],
        deliveryStatus: order.deliveryStatus,
        owner: order.owner,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Normalize date to ISO midnight UTC
            const payload = { ...formData, orderDate: formData.orderDate ? new Date(`${formData.orderDate}T00:00:00.000Z`).toISOString() : undefined };
            const response = await axios.put(`${API_URL}/${order._id}`, payload);
            onOrderUpdated(response.data);
            alert(`Order ${formData.serialNumber} successfully updated!`);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update order.');
            console.error('Update error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button onClick={onClose} className="close-btn">&times;</button>

                <h3>Edit Order: {order.serialNumber}</h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Serial Number:</label>
                        <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} required />
                    </div>

                    <div className="input-group">
                        <label>Order Date:</label>
                        <input type="date" name="orderDate" value={formData.orderDate} onChange={handleChange} required />
                    </div>

                    <div className="input-group">
                        <label>Delivery Status:</label>
                        <select name="deliveryStatus" value={formData.deliveryStatus} onChange={handleChange} required>
                            {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Owner:</label>
                        <select name="owner" value={formData.owner} onChange={handleChange} required>
                            {ownerOptions.map(owner => <option key={owner} value={owner}>{owner}</option>)}
                        </select>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading} 
                        className={`action-btn save-btn ${loading ? 'loading' : ''}`}
                    >
                        {loading ? '' : '💾 Save Changes'}
                    </button>

                    {error && <p style={{ color: '#dc2626', fontWeight: 600 }}>{error}</p>}
                </form>
            </div>
        </div>
    );
}

export default EditOrderModal;
