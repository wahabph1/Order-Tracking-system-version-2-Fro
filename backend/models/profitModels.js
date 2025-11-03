const mongoose = require('mongoose');

// Store Schema
const storeSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true,
        default: '#2563eb'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Profit Calculation Schema
const profitCalculationSchema = new mongoose.Schema({
    storeId: {
        type: String,
        required: true
    },
    storeName: {
        type: String,
        required: true
    },
    itemName: {
        type: String,
        required: true
    },
    realPrice: {
        type: Number,
        required: true
    },
    deliveryCharges: {
        type: Number,
        required: true
    },
    deliveredOrders: {
        type: Number,
        required: true
    },
    profitPerOrder: {
        type: Number,
        required: true
    },
    totalProfit: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Create indexes for better performance
storeSchema.index({ id: 1 });
profitCalculationSchema.index({ storeId: 1, timestamp: -1 });

const Store = mongoose.model('Store', storeSchema);
const ProfitCalculation = mongoose.model('ProfitCalculation', profitCalculationSchema);

module.exports = { Store, ProfitCalculation };