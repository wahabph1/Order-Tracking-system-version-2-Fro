const express = require('express');
const cors = require('cors');
// .env file se variables load karne ke liye zaroori
require('dotenv').config(); 
const connectDB = require('./db/db'); 

const app = express();

// ***************************************************************
// 🔑 CRITICAL FIX: DATABASE CONNECTION KO SIRF EK BAAR CALL KIYA GAYA HAI
// Yeh Vercel par server ko crash hone se bachayega aur 500 error theek karega.
connectDB()
  .then(() => console.log('DB ready'))
  .catch(err => console.error('DB connect error:', (err && err.message) || err));
// Ensure indexes reflect schema (allow duplicates for Wahab only)
const Order = require('./db/models/OrderModel');
Order.syncIndexes().catch(err => console.error('Order index sync failed:', (err && err.message) || err));

// Drop legacy unique index on serialNumber if it still exists (blocks Wahab duplicates)
(async () => {
  try {
    const hasLegacy = await Order.collection.indexExists('serialNumber_1');
    if (hasLegacy) {
      await Order.collection.dropIndex('serialNumber_1');
      console.log('Dropped legacy index serialNumber_1');
    }
  } catch (e) {
    console.error('Legacy index cleanup error:', (e && e.message) || e);
  }
})();
// ***************************************************************

// NOTE: Purana Database Middleware (app.use(async (req, res, next) => { ... })) HATA DIYA GAYA HAI.

// ***************************************************************
// CORS Configuration (Naye URLs Shamil Hain)
// ***************************************************************
const allowedOrigins = [
    'http://localhost:3000', 
    'https://order-tracking-frontend.vercel.app', 
    'https://order-f.vercel.app',
    'https://order-f-p2r4.vercel.app'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Not allowed by CORS for origin: ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
// ***************************************************************

app.use(express.json()); 

// 🚀 ROOT PATH HANDLER (Health Check)
app.get('/', (req, res) => {
    res.status(200).send('Order Tracking System Backend is fully operational and healthy!');
});

// Order Routes
const orderRoutes = require('./routes/orderRoutes'); 
// Yeh line Vercel routing aur /api/orders path ko handle karti hai.
app.use('/api/orders', orderRoutes);

// Profit Calculator Routes
const profitRoutes = require('./routes/profitRoutes');
app.use('/api/profit', profitRoutes);

// Investment Routes (Qatar investments, etc.)
const investmentRoutes = require('./routes/investmentRoutes');
app.use('/api/investments', investmentRoutes);

// CRITICAL: Express app ko export karna zaroori hai
module.exports = app;

// Local development: start server if run directly (Vercel will import the app)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}
