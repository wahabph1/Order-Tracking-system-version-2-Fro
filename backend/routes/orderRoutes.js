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

// 2. CREATE: Naya Order Add Karo (single)
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

// 2b. BULK CREATE: Multiple orders ek sath add karne ke liye
// Body: { orders: [ { serialNumber, owner, orderDate? }, ... ] }
router.post('/bulk', async (req, res) => {
    try {
        const { orders } = req.body || {};
        if (!Array.isArray(orders) || orders.length === 0) {
            return res.status(400).json({ message: 'orders array is required and cannot be empty' });
        }

        const results = [];
        let wahabIndexesPurged = false;

        for (let i = 0; i < orders.length; i++) {
            const raw = orders[i] || {};
            const serialNumber = raw.serialNumber;
            const owner = raw.owner;
            const orderDate = raw.orderDate;

            if (!serialNumber || !owner) {
                results.push({ index: i, ok: false, error: 'serialNumber and owner are required' });
                continue;
            }

            const payload = { serialNumber, owner };

            try {
                if (String(owner) !== 'Wahab') {
                    const exists = await Order.exists({ serialNumber, owner: { $ne: 'Wahab' } });
                    if (exists) {
                        results.push({ index: i, ok: false, error: 'Duplicate serial not allowed for non-Wahab owners.' });
                        continue;
                    }
                } else if (!wahabIndexesPurged) {
                    // Wahab ke liye legacy unique index ko sirf ek baar clean karein
                    await purgeLegacySerialUnique();
                    wahabIndexesPurged = true;
                }

                if (orderDate) {
                    const d = new Date(orderDate);
                    if (!isNaN(d.getTime())) payload.orderDate = d;
                }

                let created;
                try {
                    created = await Order.create(payload);
                } catch (e) {
                    if (String(owner) === 'Wahab' && e && e.code === 11000) {
                        await purgeLegacySerialUnique();
                        wahabIndexesPurged = true;
                        created = await Order.create(payload);
                    } else {
                        throw e;
                    }
                }

                results.push({ index: i, ok: true, order: created });
            } catch (e) {
                results.push({ index: i, ok: false, error: e.message || 'Failed to add order' });
            }
        }

        const createdCount = results.filter(r => r.ok).length;
        return res.status(207).json({
            message: `Bulk create finished. Created ${createdCount} of ${orders.length} orders`,
            results,
        });
    } catch (err) {
        res.status(500).json({ message: err.message || 'Bulk create failed' });
    }
});

// Test-only: Direct tracking stub (no real external integration yet)
// GET /api/orders/track/:serial
// Returns a fake status based on the serial pattern so frontend flow can be tested.
router.get('/track/:serial', async (req, res) => {
    try {
        const raw = String(req.params.serial || '').trim();
        if (!raw) {
            return res.status(400).json({ message: 'Serial is required' });
        }

        const serial = raw.toUpperCase();
        let externalStatus = 'Pending';

        // Very simple demo rules so you can see different outputs:
        // - If contains 'C' => Cancelled
        // - Else last digit 0-3 => Pending, 4-6 => In Transit, 7-9 => Delivered
        if (serial.includes('C')) {
            externalStatus = 'Cancelled';
        } else {
            const last = serial[serial.length - 1];
            const n = parseInt(last, 10);
            if (!Number.isNaN(n)) {
                if (n <= 3) externalStatus = 'Pending';
                else if (n <= 6) externalStatus = 'In Transit';
                else externalStatus = 'Delivered';
            }
        }

        return res.json({
            serialNumber: raw,
            externalStatus,
            checkedAt: new Date().toISOString(),
        });
    } catch (err) {
        res.status(500).json({ message: err.message || 'Tracking failed' });
    }
});

// 5. BULK STATUS UPDATE: Wahab orders by serial numbers
// Body: { serialNumbers: string[] | string (newline/comma/space separated), newStatus: 'Pending'|'In Transit'|'Delivered'|'Cancelled' }
router.put('/bulk-status', async (req, res) => {
    try {
        const { serialNumbers, newStatus, status } = req.body || {};
        const targetStatus = String(newStatus || status || '').trim();
        const allowed = ['Pending', 'In Transit', 'Delivered', 'Cancelled'];
        if (!allowed.includes(targetStatus)) {
            return res.status(400).json({ message: 'Invalid status. Allowed: Pending, In Transit, Delivered, Cancelled' });
        }

        // Normalize serial numbers input
        let input = serialNumbers;
        if (typeof input === 'string') {
            input = input.split(/[\n,\t\r\s]+/);
        }
        if (!Array.isArray(input)) {
            return res.status(400).json({ message: 'serialNumbers must be an array or a newline/comma/space-separated string' });
        }
        const serials = Array.from(new Set(input.map(s => String(s).trim()).filter(Boolean)));
        if (serials.length === 0) {
            return res.status(400).json({ message: 'No serial numbers provided' });
        }

        // Only apply to Wahab orders as requested
        const ownerFilter = 'Wahab';
        const query = { owner: ownerFilter, serialNumber: { $in: serials } };

        // For result reporting, find which serials exist
        const foundSerials = await Order.distinct('serialNumber', query);

        // Update all matching docs (duplicates allowed for Wahab → update all matching)
        const result = await Order.updateMany(query, { $set: { deliveryStatus: targetStatus } });

        const notFound = serials.filter(s => !foundSerials.includes(s));
        return res.json({
            matchedSerials: foundSerials,
            notFound,
            matchedCount: foundSerials.length,
            modifiedCount: result?.modifiedCount ?? 0,
            status: targetStatus,
        });
    } catch (err) {
        res.status(500).json({ message: err.message || 'Bulk status update failed' });
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

// ==============================
// Settlement Markers (backend)
// ==============================
const SettlementMarker = require('../db/models/SettlementMarker');

// List markers (optionally by owner)
router.get('/settlements', async (req, res) => {
    try {
        const { owner } = req.query;
        const q = {};
        if (owner && owner !== 'All') q.owner = owner;
        const items = await SettlementMarker.find(q).sort({ createdAt: -1 }).lean();
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message || 'Failed to list settlements' });
    }
});

// Create marker
router.post('/settlements', async (req, res) => {
    try {
        const { owner, afterOrderId, label } = req.body || {};
        if (!owner || !afterOrderId) return res.status(400).json({ message: 'owner and afterOrderId are required' });
        // ensure order exists
        const exist = await Order.exists({ _id: afterOrderId });
        if (!exist) return res.status(400).json({ message: 'afterOrderId not found' });
        const doc = await SettlementMarker.create({ owner, afterOrderId, label: label || 'Settlement' });
        res.status(201).json(doc);
    } catch (err) {
        res.status(400).json({ message: err.message || 'Failed to create settlement' });
    }
});

// Delete marker
router.delete('/settlements/:id', async (req, res) => {
    try {
        const r = await SettlementMarker.findByIdAndDelete(req.params.id);
        if (!r) return res.status(404).json({ message: 'Marker not found' });
        res.json({ deleted: true });
    } catch (err) {
        res.status(500).json({ message: err.message || 'Failed to delete marker' });
    }
});

module.exports = router;
