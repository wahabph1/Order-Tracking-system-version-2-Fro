// ==========================================================
// frontend/src/OrderList.js 
// ==========================================================
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import OrderEditModal from './OrderEditModal'; // Edit Modal import kiya

const VENDORS = ['Ahsan', 'Habibi Tools', 'Emirate Essentials'];
const STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
const API_URL = process.env.REACT_APP_API_BASE_URL;

const OrderList = ({ refreshFlag }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterVendor, setFilterVendor] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [selectedOrderId, setSelectedOrderId] = useState(null); 

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (filterVendor !== 'All') params.append('vendor', filterVendor);
            if (filterStatus !== 'All') params.append('status', filterStatus);

            const queryString = params.toString();
            
            const response = await axios.get(`${API_URL}?${queryString}`);
            setOrders(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching orders:', error);
            setLoading(false);
        }
    }, [searchTerm, filterVendor, filterStatus, refreshFlag]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders, refreshFlag]); 

    // Handle only Status Change from Dropdown
    const handleStatusChange = async (id, newStatus) => {
        const notes = prompt(`Enter notes for status change to ${newStatus} (Optional):`);

        try {
            // Hum patch request mein sirf deliveryStatus aur notes bhejenge
            await axios.patch(`${API_URL}/${id}`, { deliveryStatus: newStatus, notes });
            
            // List ko refresh karo
            fetchOrders(); 

        } catch (error) {
            alert('Status update nahi ho paya. Server error ya invalid status.');
        }
    };

    const handleRowClick = (id) => {
        setSelectedOrderId(id);
    };

    if (loading) return <h3>Loading Orders...</h3>;

    return (
        <div className="order-list-container">
            <h2>📦 Order Tracking Table ({orders.length} Orders)</h2>

            <div className="filter-controls">
                <input type="text" placeholder="Search by Serial Number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

                <select value={filterVendor} onChange={(e) => setFilterVendor(e.target.value)}>
                    <option value="All">All Vendors</option>
                    {VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>

                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="All">All Statuses</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {orders.length === 0 ? (<p>No orders found matching your criteria.</p>) : (
                <table>
                    <thead>
                        <tr>
                            <th>Serial No.</th>
                            <th>Vendor</th>
                            <th>Date</th>
                            <th>Current Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order._id} onClick={() => handleRowClick(order._id)} style={{ cursor: 'pointer' }}>
                                <td>**{order.serialNumber}**</td>
                                <td>{order.vendor}</td>
                                <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                                <td>
                                    <span className={`status-tag status-${order.deliveryStatus.toLowerCase()}`}>{order.deliveryStatus}</span>
                                </td>
                                <td>
                                    <select
                                        value={order.deliveryStatus}
                                        onChange={(e) => {
                                            e.stopPropagation(); // Row click ko rokna
                                            handleStatusChange(order._id, e.target.value);
                                        }}
                                        onClick={(e) => e.stopPropagation()} // Row click ko rokna
                                    >
                                        {STATUSES.map(s => (<option key={s} value={s}>{s}</option>))}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {selectedOrderId && (
                <OrderEditModal 
                    orderId={selectedOrderId} 
                    onClose={() => setSelectedOrderId(null)} 
                    onUpdate={fetchOrders} // Update ya delete hone par list refresh karo
                    onDelete={fetchOrders} // Update ya delete hone par list refresh karo
                />
            )}
        </div>
    );
};

export default OrderList;