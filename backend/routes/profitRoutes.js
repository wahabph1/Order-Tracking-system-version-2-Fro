const express = require('express');
const router = express.Router();
const { Store, ProfitCalculation } = require('../models/profitModels');

// ============ STORE ROUTES ============

// GET /api/profit/stores - Get all stores
router.get('/stores', async (req, res) => {
    try {
        const stores = await Store.find().sort({ createdAt: -1 });
        res.json(stores);
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to fetch stores', 
            error: error.message 
        });
    }
});

// POST /api/profit/stores - Create new store
router.post('/stores', async (req, res) => {
    try {
        const { id, name, color } = req.body;
        
        if (!id || !name) {
            return res.status(400).json({ 
                message: 'Store ID and name are required' 
            });
        }

        // Check if store with same ID already exists
        const existingStore = await Store.findOne({ id });
        if (existingStore) {
            return res.status(400).json({ 
                message: 'Store with this ID already exists' 
            });
        }

        const store = new Store({
            id,
            name,
            color: color || '#2563eb'
        });

        await store.save();
        res.status(201).json(store);
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to create store', 
            error: error.message 
        });
    }
});

// DELETE /api/profit/stores/:id - Delete store and all its calculations
router.delete('/stores/:id', async (req, res) => {
    try {
        const storeId = req.params.id;

        // Delete store
        const deletedStore = await Store.findOneAndDelete({ id: storeId });
        if (!deletedStore) {
            return res.status(404).json({ 
                message: 'Store not found' 
            });
        }

        // Delete all calculations for this store
        await ProfitCalculation.deleteMany({ storeId });

        res.json({ 
            message: 'Store and all its calculations deleted successfully',
            deletedStore 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to delete store', 
            error: error.message 
        });
    }
});

// ============ CALCULATION ROUTES ============

// GET /api/profit/calculations/:storeId - Get all calculations for a store
router.get('/calculations/:storeId', async (req, res) => {
    try {
        const storeId = req.params.storeId;
        const limit = parseInt(req.query.limit) || 50; // Default to 50 calculations
        
        const calculations = await ProfitCalculation
            .find({ storeId })
            .sort({ timestamp: -1 })
            .limit(limit);
            
        res.json(calculations);
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to fetch calculations', 
            error: error.message 
        });
    }
});

// POST /api/profit/calculations - Save new calculation
router.post('/calculations', async (req, res) => {
    try {
        const calculationData = req.body;
        
        // Validate required fields
        const requiredFields = ['storeId', 'storeName', 'itemName', 'realPrice', 'deliveryCharges', 'deliveredOrders', 'profitPerOrder', 'totalProfit'];
        for (let field of requiredFields) {
            if (calculationData[field] === undefined || calculationData[field] === null) {
                return res.status(400).json({ 
                    message: `${field} is required` 
                });
            }
        }

        const calculation = new ProfitCalculation(calculationData);
        await calculation.save();
        
        res.status(201).json(calculation);
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to save calculation', 
            error: error.message 
        });
    }
});

// DELETE /api/profit/calculations/:id - Delete specific calculation
router.delete('/calculations/:id', async (req, res) => {
    try {
        const calculationId = req.params.id;
        
        const deletedCalculation = await ProfitCalculation.findByIdAndDelete(calculationId);
        if (!deletedCalculation) {
            return res.status(404).json({ 
                message: 'Calculation not found' 
            });
        }
        
        res.json({ 
            message: 'Calculation deleted successfully',
            deletedCalculation 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to delete calculation', 
            error: error.message 
        });
    }
});

// DELETE /api/profit/calculations/store/:storeId - Delete all calculations for a store
router.delete('/calculations/store/:storeId', async (req, res) => {
    try {
        const storeId = req.params.storeId;
        
        const result = await ProfitCalculation.deleteMany({ storeId });
        
        res.json({ 
            message: `Deleted ${result.deletedCount} calculations for store ${storeId}`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to delete calculations', 
            error: error.message 
        });
    }
});

// GET /api/profit/stats - Get overall statistics
router.get('/stats', async (req, res) => {
    try {
        const totalStores = await Store.countDocuments();
        const totalCalculations = await ProfitCalculation.countDocuments();
        
        // Get total profit across all calculations
        const profitStats = await ProfitCalculation.aggregate([
            {
                $group: {
                    _id: null,
                    totalProfit: { $sum: '$totalProfit' },
                    avgProfit: { $avg: '$totalProfit' },
                    maxProfit: { $max: '$totalProfit' },
                    minProfit: { $min: '$totalProfit' }
                }
            }
        ]);

        // Get profit by store
        const profitByStore = await ProfitCalculation.aggregate([
            {
                $group: {
                    _id: '$storeId',
                    storeName: { $first: '$storeName' },
                    totalProfit: { $sum: '$totalProfit' },
                    calculationCount: { $sum: 1 }
                }
            },
            { $sort: { totalProfit: -1 } }
        ]);

        res.json({
            totalStores,
            totalCalculations,
            profitStats: profitStats[0] || {
                totalProfit: 0,
                avgProfit: 0,
                maxProfit: 0,
                minProfit: 0
            },
            profitByStore
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to fetch statistics', 
            error: error.message 
        });
    }
});

module.exports = router;