// Backend/db/models/Investment.js
const mongoose = require('mongoose');

const InvestmentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'PKR',
    },
    note: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    source: {
      type: String,
      default: 'Qatar',
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

InvestmentSchema.index({ source: 1, date: -1 });

module.exports = mongoose.model('Investment', InvestmentSchema);