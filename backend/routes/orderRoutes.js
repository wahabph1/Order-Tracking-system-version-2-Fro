// Backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const Order = require('../db/models/OrderModel');
const DeletedOrder = require('../db/models/DeletedOrder');

// Helper: Drop any legacy UNIQUE indexes on serialNumber that block Wahab duplicates
async function purgeLegacySerialUnique() {
  try {
    const indexes = await Order.collection.indexes();
    for (const idx of indexes) {
      if (idx && idx.unique && idx.key && idx.key.serialNumber === 1) {
        try {
          await Order.collection.dropIndex(idx.name);
          console.log('Dropped legacy unique index on serialNumber:', idx.name);
        } catch (e) {
          console.error('Failed dropping legacy serial index', idx.name, (e && e.message) || e);
        }
      }
    }
  } catch (e) {
    console.error('Index inspection error:', (e && e.message) || e);
  }
}

// 1. READ: Saare Orders Lao (Filtering aur Searching Support ke saath)
router.get('/', async (req, res) => {
    try {
        // URL query se 'owner' aur 'search' parameters nikalna
        const { owner, search } = req.query; 
        
        const filter = {};
        
        // --- 1. Owner Filter Logic ---
        if (owner && owner !== 'All') { 
            filter.owner = owner;
        }

        // --- 2. Search Logic (by Serial Number) ---
        if (search) {
            // Regular Expression ka use: search string ko case-insensitive tareeqe se dhoondhna
            filter.serialNumber = { $regex: search, $options: 'i' };
        }

        // Filter object ko use karke orders dhoondhna
        const orders = await Order.find(filter).sort({ orderDate: -1 }); 
        
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. CREATE: Naya Order Add Karo
router.post('/', async (req, res) => {
    try {
        const { serialNumber, owner, orderDate } = req.body;
        const payload = { serialNumber, owner };

        // Policy: Sirf Wahab ke liye duplicate serialNumber allow hain.
        // Non-Wahab (Emirate Essentials, Ahsan, Habibi Tools) ke darmiyan duplicate mana hain.
        if (String(owner) !== 'Wahab') {
            const exists = await Order.exists({ serialNumber, owner: { $ne: 'Wahab' } });
            if (exists) {
                return res.status(400).json({ message: 'Duplicate serial not allowed for non-Wahab owners.' });
            }
        } else {
            // Wahab ke liye: koi bhi serial allow hai, chahe dashboard (non-Wahab) mein na ho
            // Extra safety: ensure any legacy unique index on serialNumber is removed
            await purgeLegacySerialUnique();
        }

        // Agar client ne date bheji hai to use karen; warna schema default (Date.now) chalega
        if (orderDate) {
            const d = new Date(orderDate);
            if (!isNaN(d.getTime())) payload.orderDate = d;
        }

        // Create with retry if duplicate-key arises due to leftover index
        let newOrder;
        try {
            newOrder = await Order.create(payload);
        } catch (e) {
            if (String(owner) === 'Wahab' && e && e.code === 11000) {
                await purgeLegacySerialUnique();
                newOrder = await Order.create(payload);
            } else {
                throw e;
            }
        }

        res.status(201).json(newOrder);
    } catch (err) {
        res.status(400).json({ message: err.message || 'Failed to add order' });
    }
});

// 3. UPDATE: Order Status/Details Update Karo
router.put('/:id', async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(updatedOrder);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 4. DELETE: Order Delete Karo
router.delete('/:id', async (req, res) => {
    try {
        const existing = await Order.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Order not found' });

        // Archive into DeletedOrder
        await DeletedOrder.create({
            originalId: existing._id,
            serialNumber: existing.serialNumber,
            owner: existing.owner,
            orderDate: existing.orderDate,
            deliveryStatus: existing.deliveryStatus,
            deletedAt: new Date(),
            snapshot: existing.toObject(),
        });

        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: 'Order deleted and archived' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// List deleted orders (optional filters: owner, search; optional pagination)
router.get('/deleted', async (req, res) => {
    try {
        const { owner, search, page, limit } = req.query;
        const q = {};
        if (owner && owner !== 'All') q.owner = owner;
        if (search) q.serialNumber = { $regex: search, $options: 'i' };

        const pg = Math.max(parseInt(page || '1', 10), 1);
        const lm = Math.min(Math.max(parseInt(limit || '1000', 10), 1), 5000);

        const items = await DeletedOrder
            .find(q)
            .sort({ deletedAt: -1 })
            .skip((pg - 1) * lm)
            .limit(lm)
            .lean();

        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete ALL deleted orders
router.delete('/deleted', async (_req, res) => {
    try {
        const result = await DeletedOrder.deleteMany({});
        res.json({ deleted: result?.deletedCount ?? 0 });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
