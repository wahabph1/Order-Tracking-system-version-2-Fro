// backend/db/models/SettlementMarker.js
const mongoose = require('mongoose');

const SettlementMarkerSchema = new mongoose.Schema(
  {
    owner: {
      type: String,
      required: true,
      enum: ['Emirate Essentials', 'Ahsan', 'Habibi Tools', 'Wahab'],
      index: true,
    },
    // Marker is placed immediately AFTER this order row
    afterOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    label: { type: String, default: 'Settlement' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SettlementMarker', SettlementMarkerSchema);
