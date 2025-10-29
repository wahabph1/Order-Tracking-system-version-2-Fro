// Backend/db/models/DeletedOrder.js
const mongoose = require('mongoose');

const DeletedOrderSchema = new mongoose.Schema(
  {
    originalId: { type: mongoose.Schema.Types.ObjectId, index: true },
    serialNumber: { type: String, index: true },
    owner: { type: String, index: true },
    orderDate: { type: Date },
    deliveryStatus: { type: String },
    deletedAt: { type: Date, default: Date.now, index: true },
    // optional snapshot of original document
    snapshot: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeletedOrder', DeletedOrderSchema);