// ProfitCalculator.jsx - Profit calculation system for different stores

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://order-b.vercel.app/api/profit';

function ProfitCalculator() {
    const [selectedStore, setSelectedStore] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        itemName: '',
        realPrice: '',
        weeklyAdSpend: '',
        deliveryCharges: '',
        deliveredOrders: ''
    });
    const [result, setResult] = useState(null);
    const [showAddStore, setShowAddStore] = useState(false);
    const [newStore, setNewStore] = useState({ name: '', color: '#2563eb' });
    const [showHistory, setShowHistory] = useState(false);
    const [currentStoreHistory, setCurrentStoreHistory] = useState([]);
    const [currentStoreId, setCurrentStoreId] = useState('');
    
    // Load stores from database
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const colorOptions = [
        '#e11d48', '#2563eb', '#16a34a', '#dc2626', '#7c3aed',
        '#ea580c', '#0891b2', '#c2410c', '#7c2d12', '#4338ca',
        '#be185d', '#059669', '#b91c1c', '#6366f1', '#9333ea'
    ];
    
    // Load stores from database on component mount
    useEffect(() => {
        fetchStores();
    }, []);
    
    // Fetch stores from database
    const fetchStores = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/stores`);
            setStores(response.data);
        } catch (error) {
            console.error('Error fetching stores:', error);
            alert('Failed to load stores. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    // Save calculation to database
    const saveCalculationToHistory = async (storeId, calculationData) => {
        try {
            await axios.post(`${API_URL}/calculations`, calculationData);
        } catch (error) {
            console.error('Error saving calculation:', error);
            alert('Failed to save calculation history.');
        }
    };
    
    // Load calculation history for a store from database
    const loadStoreHistory = async (storeId) => {
        try {
            const response = await axios.get(`${API_URL}/calculations/${storeId}`);
            return response.data;
        } catch (error) {
            console.error('Error loading store history:', error);
            return [];
        }
    };
    
    // Delete individual calculation from database
    const deleteCalculation = async (storeId, calculationId) => {
        try {
            await axios.delete(`${API_URL}/calculations/${calculationId}`);
            // Reload current store history
            const updatedHistory = await loadStoreHistory(storeId);
            setCurrentStoreHistory(updatedHistory);
        } catch (error) {
            console.error('Error deleting calculation:', error);
            alert('Failed to delete calculation.');
        }
    };
    
    // Clear all history for a store from database
    const clearStoreHistory = async (storeId) => {
        if (window.confirm('Are you sure you want to delete ALL calculation history for this store?')) {
            try {
                await axios.delete(`${API_URL}/calculations/store/${storeId}`);
                setCurrentStoreHistory([]);
            } catch (error) {
                console.error('Error clearing store history:', error);
                alert('Failed to clear store history.');
            }
        }
    };

    const handleStoreSelect = (store) => {
        setSelectedStore(store);
        setShowForm(true);
        setResult(null);
        setFormData({
            itemName: '',
            realPrice: '',
            weeklyAdSpend: '',
            deliveryCharges: '',
            deliveredOrders: ''
        });
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const calculateProfit = async () => {
        const { realPrice, weeklyAdSpend, deliveryCharges, deliveredOrders } = formData;
        
        if (!realPrice || !weeklyAdSpend || !deliveryCharges || !deliveredOrders) {
            alert('Please fill all fields');
            return;
        }

        const realPriceNum = parseFloat(realPrice);
        const weeklyAdSpendNum = parseFloat(weeklyAdSpend);
        const deliveryChargesNum = parseFloat(deliveryCharges);
        const deliveredOrdersNum = parseInt(deliveredOrders);

        // Revenue calculation: (Real Price + Delivery Charges) × Number of Delivered Orders
        const totalRevenue = (realPriceNum + deliveryChargesNum) * deliveredOrdersNum;
        // Cost calculation: (Real Price × Number of Delivered Orders) + Weekly Ad Spend
        const totalCost = (realPriceNum * deliveredOrdersNum) + weeklyAdSpendNum;
        // Profit calculation: Total Revenue - Total Cost (Revenue - Real Price Cost - Ad Spend)
        const totalProfit = (deliveryChargesNum * deliveredOrdersNum) - weeklyAdSpendNum;
        const profitPerOrder = totalProfit / deliveredOrdersNum;

        const calculationResult = {
            storeId: selectedStore.id,
            itemName: formData.itemName,
            storeName: stores.find(s => s.id === selectedStore.id)?.name,
            realPrice: realPriceNum,
            weeklyAdSpend: weeklyAdSpendNum,
            deliveryCharges: deliveryChargesNum,
            deliveredOrders: deliveredOrdersNum,
            totalRevenue: totalRevenue,
            totalCost: totalCost,
            totalProfit: totalProfit,
            profitPerOrder: profitPerOrder
        };
        
        // Save to database
        await saveCalculationToHistory(selectedStore.id, calculationResult);
        
        setResult(calculationResult);
    };

    const resetCalculator = () => {
        setSelectedStore('');
        setShowForm(false);
        setResult(null);
        setShowAddStore(false);
        setFormData({
            itemName: '',
            realPrice: '',
            weeklyAdSpend: '',
            deliveryCharges: '',
            deliveredOrders: ''
        });
    };
    
    const handleAddStore = async () => {
        if (!newStore.name.trim()) {
            alert('Please enter store name');
            return;
        }
        
        const storeId = newStore.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const store = {
            id: storeId,
            name: newStore.name,
            color: newStore.color
        };
        
        try {
            const response = await axios.post(`${API_URL}/stores`, store);
            setStores(prev => [...prev, response.data]);
            setNewStore({ name: '', color: '#2563eb' });
            setShowAddStore(false);
            alert(`✅ Store "${newStore.name}" added successfully and saved to database!`);
        } catch (error) {
            console.error('Error adding store:', error);
            if (error.response?.status === 400) {
                alert(error.response.data.message || 'Store already exists.');
            } else {
                alert('Failed to add store. Please try again.');
            }
        }
    };
    
    const handleDeleteStore = async (storeId) => {
        const storeName = stores.find(s => s.id === storeId)?.name;
        if (window.confirm(`Are you sure you want to permanently delete "${storeName}" store and all its calculation history?`)) {
            try {
                await axios.delete(`${API_URL}/stores/${storeId}`);
                setStores(prev => prev.filter(s => s.id !== storeId));
                alert('Store deleted successfully!');
            } catch (error) {
                console.error('Error deleting store:', error);
                alert('Failed to delete store. Please try again.');
            }
        }
    };

    if (loading) {
        return (
            <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
                <div style={{ 
                    padding: '60px 20px',
                    color: '#6b7280',
                    fontSize: '18px'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                    <p style={{ margin: 0, fontWeight: '500' }}>
                        Loading Profit Calculator...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            {/* Header */}
            <div style={{ 
                textAlign: 'center', 
                marginBottom: '40px',
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                color: 'white',
                padding: '30px',
                borderRadius: '16px'
            }}>
                <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>
                    Profit Calculator
                </h1>
                <p style={{ margin: '10px 0 0', opacity: 0.9, fontSize: '16px' }}>
                    Calculate profits for different stores in AED
                </p>
            </div>

            {/* Store Selection */}
            {!showForm && !showAddStore && (
                <div style={{ marginBottom: '30px' }}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '30px' 
                    }}>
                        <h2 style={{ 
                            margin: 0,
                            color: '#1f2937', 
                            fontSize: '24px' 
                        }}>
                            Select Store
                        </h2>
                        <button
                            onClick={() => setShowAddStore(true)}
                            style={{
                                background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '10px 20px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-1px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            <span style={{ fontSize: '16px' }}>+</span>
                            Add Store
                        </button>
                    </div>
                    
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '20px'
                    }}>
                        {stores.map(store => (
                            <div key={store.id} style={{ position: 'relative' }}>
                                <button
                                    onClick={() => handleStoreSelect(store)}
                                    style={{
                                        background: `linear-gradient(135deg, ${store.color}15 0%, ${store.color}25 100%)`,
                                        border: `2px solid ${store.color}`,
                                        borderRadius: '12px',
                                        padding: '24px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        textAlign: 'center',
                                        width: '100%'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = 'translateY(-4px)';
                                        e.target.style.boxShadow = `0 12px 30px ${store.color}40`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                >
                                <div style={{
                                    width: '50px',
                                    height: '50px',
                                    background: store.color,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 16px',
                                    color: 'white',
                                    fontSize: '24px',
                                    fontWeight: 'bold'
                                }}>
                                    {store.name.charAt(0)}
                                </div>
                                <h3 style={{ 
                                    margin: 0, 
                                    color: store.color, 
                                    fontSize: '18px',
                                    fontWeight: '600'
                                }}>
                                    {store.name}
                                </h3>
                                <p style={{ 
                                    margin: '8px 0 0', 
                                    color: '#6b7280', 
                                    fontSize: '14px' 
                                }}>
                                    Calculate profit for {store.name.toLowerCase()}
                                </p>
                            </button>
                            
                            {/* View History Button */}
                            <div style={{ 
                                position: 'absolute', 
                                bottom: '8px', 
                                left: '50%', 
                                transform: 'translateX(-50%)' 
                            }}>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const history = await loadStoreHistory(store.id);
                                        setCurrentStoreHistory(history);
                                        setCurrentStoreId(store.id);
                                        setShowHistory(true);
                                    }}
                                    style={{
                                        background: `${store.color}20`,
                                        color: store.color,
                                        border: `1px solid ${store.color}`,
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        fontSize: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="View Calculation History"
                                    onMouseEnter={(e) => {
                                        e.target.style.background = store.color;
                                        e.target.style.color = 'white';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = `${store.color}20`;
                                        e.target.style.color = store.color;
                                    }}
                                >
                                    📊 History
                                </button>
                            </div>
                            
                            {/* Delete button for all stores */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteStore(store.id);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease'
                                }}
                                title="Delete Store"
                                onMouseEnter={(e) => {
                                    e.target.style.background = '#dc2626';
                                    e.target.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = '#ef4444';
                                    e.target.style.transform = 'scale(1)';
                                }}
                            >
                                ×
                            </button>
                            </div>
                        ))}
                        
                        {/* Empty state message */}
                        {stores.length === 0 && (
                            <div style={{
                                gridColumn: '1 / -1',
                                textAlign: 'center',
                                padding: '60px 20px',
                                color: '#6b7280',
                                fontSize: '18px'
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏪</div>
                                <p style={{ margin: 0, marginBottom: '8px', fontWeight: '500' }}>
                                    No stores added yet
                                </p>
                                <p style={{ margin: 0, fontSize: '14px' }}>
                                    Click "Add Store" to create your first store
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Store Form */}
            {showAddStore && (
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '32px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    border: '3px solid #16a34a20',
                    maxWidth: '500px',
                    margin: '0 auto'
                }}>
                    <div style={{ 
                        textAlign: 'center', 
                        marginBottom: '30px',
                        paddingBottom: '20px',
                        borderBottom: '2px solid #16a34a20'
                    }}>
                        <h2 style={{ 
                            margin: 0, 
                            color: '#16a34a',
                            fontSize: '24px',
                            fontWeight: '600'
                        }}>
                            Add New Store
                        </h2>
                        <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>
                            Create a custom store for profit calculations
                        </p>
                    </div>

                    <div style={{ display: 'grid', gap: '24px' }}>
                        {/* Store Name */}
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '500',
                                color: '#374151'
                            }}>
                                Store Name *
                            </label>
                            <input
                                type="text"
                                value={newStore.name}
                                onChange={(e) => setNewStore(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter store name"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#16a34a'}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                        </div>

                        {/* Store Color */}
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '500',
                                color: '#374151'
                            }}>
                                Store Theme Color
                            </label>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(5, 1fr)',
                                gap: '8px',
                                marginBottom: '12px'
                            }}>
                                {colorOptions.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setNewStore(prev => ({ ...prev, color }))}
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '8px',
                                            background: color,
                                            border: newStore.color === color ? '3px solid #374151' : '2px solid #e5e7eb',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            transform: newStore.color === color ? 'scale(1.1)' : 'scale(1)'
                                        }}
                                        title={color}
                                    />
                                ))}
                            </div>
                            <div style={{
                                padding: '12px',
                                background: `${newStore.color}15`,
                                border: `1px solid ${newStore.color}40`,
                                borderRadius: '8px',
                                textAlign: 'center',
                                fontSize: '14px',
                                color: newStore.color,
                                fontWeight: '500'
                            }}>
                                Preview: {newStore.name || 'Your Store Name'}
                            </div>
                        </div>

                        {/* Buttons */}
                        <div style={{ 
                            display: 'flex', 
                            gap: '16px', 
                            justifyContent: 'center',
                            marginTop: '20px'
                        }}>
                            <button
                                onClick={handleAddStore}
                                style={{
                                    background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '14px 28px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 8px 20px rgba(22, 163, 74, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            >
                                Add Store
                            </button>
                            
                            <button
                                onClick={() => {
                                    setShowAddStore(false);
                                    setNewStore({ name: '', color: '#2563eb' });
                                }}
                                style={{
                                    background: 'white',
                                    color: '#6b7280',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    padding: '14px 28px',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.borderColor = '#9ca3af';
                                    e.target.style.color = '#374151';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.color = '#6b7280';
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profit Form */}
            {showForm && !result && (
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '32px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    border: `3px solid ${selectedStore.color}20`
                }}>
                    <div style={{ 
                        textAlign: 'center', 
                        marginBottom: '30px',
                        paddingBottom: '20px',
                        borderBottom: `2px solid ${selectedStore.color}20`
                    }}>
                        <h2 style={{ 
                            margin: 0, 
                            color: selectedStore.color,
                            fontSize: '24px',
                            fontWeight: '600'
                        }}>
                            {selectedStore.name} - Profit Calculator
                        </h2>
                    </div>

                    <div style={{ display: 'grid', gap: '24px' }}>
                        {/* Item Name */}
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '500',
                                color: '#374151'
                            }}>
                                Item Name
                            </label>
                            <input
                                type="text"
                                value={formData.itemName}
                                onChange={(e) => handleInputChange('itemName', e.target.value)}
                                placeholder="Enter item name"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = selectedStore.color}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                        </div>

                        {/* Real Price */}
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '500',
                                color: '#374151'
                            }}>
                                Real Price per Item (AED)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.realPrice}
                                onChange={(e) => handleInputChange('realPrice', e.target.value)}
                                placeholder="Enter real price in AED"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = selectedStore.color}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                        </div>

                        {/* Weekly Ad Spend */}
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '500',
                                color: '#374151'
                            }}>
                                Weekly Ad Spend (AED)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.weeklyAdSpend}
                                onChange={(e) => handleInputChange('weeklyAdSpend', e.target.value)}
                                placeholder="Enter total weekly ad spend in AED"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = selectedStore.color}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                        </div>

                        {/* Delivery Charges */}
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '500',
                                color: '#374151'
                            }}>
                                Delivery Charges per Order (AED)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.deliveryCharges}
                                onChange={(e) => handleInputChange('deliveryCharges', e.target.value)}
                                placeholder="Enter delivery charges in AED"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = selectedStore.color}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                        </div>

                        {/* Number of Delivered Orders */}
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '500',
                                color: '#374151'
                            }}>
                                Number of Delivered Orders
                            </label>
                            <input
                                type="number"
                                value={formData.deliveredOrders}
                                onChange={(e) => handleInputChange('deliveredOrders', e.target.value)}
                                placeholder="Enter number of delivered orders"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = selectedStore.color}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />
                        </div>

                        {/* Buttons */}
                        <div style={{ 
                            display: 'flex', 
                            gap: '16px', 
                            justifyContent: 'center',
                            marginTop: '20px'
                        }}>
                            <button
                                onClick={calculateProfit}
                                style={{
                                    background: `linear-gradient(135deg, ${selectedStore.color} 0%, ${selectedStore.color}dd 100%)`,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '14px 28px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = `0 8px 20px ${selectedStore.color}40`;
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            >
                                Calculate Profit
                            </button>
                            
                            <button
                                onClick={resetCalculator}
                                style={{
                                    background: 'white',
                                    color: '#6b7280',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '8px',
                                    padding: '14px 28px',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.borderColor = '#9ca3af';
                                    e.target.style.color = '#374151';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.color = '#6b7280';
                                }}
                            >
                                Back to Stores
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results */}
            {result && (
                <div style={{
                    background: `linear-gradient(135deg, ${selectedStore.color}10 0%, ${selectedStore.color}20 100%)`,
                    borderRadius: '16px',
                    padding: '32px',
                    border: `3px solid ${selectedStore.color}40`
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <h2 style={{ 
                            margin: 0, 
                            color: selectedStore.color,
                            fontSize: '28px',
                            fontWeight: '700'
                        }}>
                            Profit Calculation Results
                        </h2>
                        <p style={{ 
                            margin: '8px 0 0', 
                            color: '#6b7280', 
                            fontSize: '16px' 
                        }}>
                            {result.storeName} - {result.itemName}
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '20px',
                        marginBottom: '30px'
                    }}>
                        <div style={{
                            background: 'white',
                            padding: '20px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                                REAL PRICE
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: selectedStore.color }}>
                                {result.realPrice.toFixed(2)} AED
                            </div>
                        </div>

                        <div style={{
                            background: 'white',
                            padding: '20px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                                WEEKLY AD SPEND
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: selectedStore.color }}>
                                {result.weeklyAdSpend.toFixed(2)} AED
                            </div>
                        </div>

                        <div style={{
                            background: 'white',
                            padding: '20px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                                DELIVERY CHARGES
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: selectedStore.color }}>
                                {result.deliveryCharges.toFixed(2)} AED
                            </div>
                        </div>

                        <div style={{
                            background: 'white',
                            padding: '20px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                                DELIVERED ORDERS
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: selectedStore.color }}>
                                {result.deliveredOrders}
                            </div>
                        </div>

                        <div style={{
                            background: 'white',
                            padding: '20px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                                PROFIT PER ORDER
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: selectedStore.color }}>
                                {result.profitPerOrder.toFixed(2)} AED
                            </div>
                        </div>
                    </div>

                    {/* Revenue and Cost Summary */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '20px',
                        marginBottom: '30px'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                            color: 'white',
                            padding: '24px',
                            borderRadius: '12px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '16px', opacity: 0.9, marginBottom: '8px' }}>
                                TOTAL REVENUE
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '700' }}>
                                {result.totalRevenue.toFixed(2)} AED
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                ({result.realPrice.toFixed(2)} + {result.deliveryCharges.toFixed(2)}) × {result.deliveredOrders}
                            </div>
                        </div>
                        
                        <div style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
                            color: 'white',
                            padding: '24px',
                            borderRadius: '12px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '16px', opacity: 0.9, marginBottom: '8px' }}>
                                TOTAL COST
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '700' }}>
                                {result.totalCost.toFixed(2)} AED
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                                ({result.realPrice.toFixed(2)} × {result.deliveredOrders}) + {result.weeklyAdSpend.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Total Profit Highlight */}
                    <div style={{
                        background: `linear-gradient(135deg, ${selectedStore.color} 0%, ${selectedStore.color}dd 100%)`,
                        color: 'white',
                        padding: '30px',
                        borderRadius: '16px',
                        textAlign: 'center',
                        marginBottom: '30px'
                    }}>
                        <div style={{ fontSize: '18px', opacity: 0.9, marginBottom: '8px' }}>
                            TOTAL PROFIT
                        </div>
                        <div style={{ fontSize: '48px', fontWeight: '800', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                            {result.totalProfit.toFixed(2)} AED
                        </div>
                        <div style={{ fontSize: '16px', opacity: 0.8, marginTop: '8px' }}>
                            Revenue - Cost = Profit ({result.profitPerOrder.toFixed(2)} AED per order)
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ 
                        display: 'flex', 
                        gap: '16px', 
                        justifyContent: 'center' 
                    }}>
                        <button
                            onClick={() => {
                                setResult(null);
                                setFormData({
                                    itemName: '',
                                    realPrice: '',
                                    weeklyAdSpend: '',
                                    deliveryCharges: '',
                                    deliveredOrders: ''
                                });
                            }}
                            style={{
                                background: 'white',
                                color: selectedStore.color,
                                border: `2px solid ${selectedStore.color}`,
                                borderRadius: '8px',
                                padding: '12px 24px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Calculate Again
                        </button>
                        
                        <button
                            onClick={resetCalculator}
                            style={{
                                background: 'white',
                                color: '#6b7280',
                                border: '2px solid #e5e7eb',
                                borderRadius: '8px',
                                padding: '12px 24px',
                                fontSize: '16px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Back to Stores
                        </button>
                    </div>
                </div>
            )}

            {/* Calculation History Modal */}
            {showHistory && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        maxWidth: '800px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'hidden',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* History Header */}
                        <div style={{
                            padding: '24px 24px 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: '24px',
                                fontWeight: '600',
                                color: '#1f2937'
                            }}>
                                📊 Calculation History ({currentStoreHistory.length})
                            </h2>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {currentStoreHistory.length > 0 && (
                                    <button
                                        onClick={() => clearStoreHistory(currentStoreId)}
                                        style={{
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '8px 12px',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = '#dc2626';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = '#ef4444';
                                        }}
                                        title="Delete all calculations"
                                    >
                                        🗑️ Clear All
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowHistory(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '28px',
                                        cursor: 'pointer',
                                        color: '#9ca3af',
                                        padding: '4px'
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                        
                        {/* History Content */}
                        <div style={{
                            flex: 1,
                            overflow: 'auto',
                            padding: '24px'
                        }}>
                            {currentStoreHistory.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '60px 20px',
                                    color: '#6b7280'
                                }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                                    <p style={{ margin: 0, fontSize: '18px', fontWeight: '500' }}>
                                        No calculations yet
                                    </p>
                                    <p style={{ margin: '8px 0 0', fontSize: '14px' }}>
                                        Start calculating profits to see history
                                    </p>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gap: '16px'
                                }}>
                                    {currentStoreHistory.map(calc => (
                                        <div
                                            key={calc.id}
                                            style={{
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '12px',
                                                padding: '20px',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                marginBottom: '12px',
                                                position: 'relative'
                                            }}>
                                                <div style={{ flex: 1, marginRight: '12px' }}>
                                                    <h3 style={{
                                                        margin: 0,
                                                        fontSize: '16px',
                                                        fontWeight: '600',
                                                        color: '#1f2937'
                                                    }}>
                                                        {calc.itemName}
                                                    </h3>
                                                    <p style={{
                                                        margin: '4px 0 0',
                                                        fontSize: '12px',
                                                        color: '#6b7280'
                                                    }}>
                                                        {new Date(calc.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                                
                                                {/* Delete button for individual calculation */}
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm(`Delete calculation for "${calc.itemName}"?`)) {
                                                            await deleteCalculation(currentStoreId, calc._id);
                                                        }
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '0',
                                                        right: '0',
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        width: '20px',
                                                        height: '20px',
                                                        cursor: 'pointer',
                                                        fontSize: '10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s ease',
                                                        opacity: 0.7
                                                    }}
                                                    title="Delete this calculation"
                                                    onMouseEnter={(e) => {
                                                        e.target.style.opacity = '1';
                                                        e.target.style.background = '#dc2626';
                                                        e.target.style.transform = 'scale(1.1)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.opacity = '0.7';
                                                        e.target.style.background = '#ef4444';
                                                        e.target.style.transform = 'scale(1)';
                                                    }}
                                                >
                                                    ×
                                                </button>
                                                
                                                <div style={{
                                                    background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                                                    color: 'white',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    marginRight: '24px'
                                                }}>
                                                    {calc.totalProfit.toFixed(2)} AED
                                                </div>
                                            </div>
                                            
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                                gap: '12px',
                                                fontSize: '14px'
                                            }}>
                                                <div>
                                                    <span style={{ color: '#6b7280' }}>Real Price:</span>
                                                    <span style={{ fontWeight: '600', marginLeft: '4px' }}>
                                                        {calc.realPrice.toFixed(2)} AED
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#6b7280' }}>Ad Spend:</span>
                                                    <span style={{ fontWeight: '600', marginLeft: '4px' }}>
                                                        {calc.weeklyAdSpend ? calc.weeklyAdSpend.toFixed(2) : '0.00'} AED
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#6b7280' }}>Delivery:</span>
                                                    <span style={{ fontWeight: '600', marginLeft: '4px' }}>
                                                        {calc.deliveryCharges.toFixed(2)} AED
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#6b7280' }}>Orders:</span>
                                                    <span style={{ fontWeight: '600', marginLeft: '4px' }}>
                                                        {calc.deliveredOrders}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#6b7280' }}>Per Order:</span>
                                                    <span style={{ fontWeight: '600', marginLeft: '4px' }}>
                                                        {calc.profitPerOrder.toFixed(2)} AED
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProfitCalculator;