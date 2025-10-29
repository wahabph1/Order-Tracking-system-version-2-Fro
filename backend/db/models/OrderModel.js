// Backend/models/OrderModel.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    serialNumber: {
        type: String,
        required: true,
        // NOTE: Globally unique constraint removed; DB-level rule is applied via normalizedSerial index.
    },
    // Internal field to enforce uniqueness for non-Wahab only (omitted for Wahab)
    normalizedSerial: {
        type: String,
        select: false, // not needed in responses
    },
    orderDate: {
        type: Date,
        default: Date.now 
    },
    deliveryStatus: {
        type: String,
        required: true,
        default: 'Pending',
        // Aap sirf in teen status mein se koi ek hi use kar sakte hain
        enum: ['Pending', 'In Transit', 'Delivered', 'Cancelled'] 
    },
    owner: {
        type: String,
        required: true,
        // Sirf in char owners mein se koi ek hi ho sakta hai
        enum: ['Emirate Essentials', 'Ahsan', 'Habibi Tools', 'Wahab']
    }
}, { timestamps: true }); // yeh automatic 'createdAt' aur 'updatedAt' add kar dega

// Pre-validate: For non-Wahab, copy serialNumber into normalizedSerial to enforce unique constraint.
OrderSchema.pre('validate', function(next) {
  try {
    const isWahab = String(this.owner) === 'Wahab';
    if (!isWahab) {
      this.normalizedSerial = this.serialNumber ? String(this.serialNumber).trim() : undefined;
    } else {
      // Ensure field is not set so sparse index ignores Wahab docs
      this.normalizedSerial = undefined;
    }
    next();
  } catch (e) { next(e); }
});

// Unique among NON-Wahab only (sparse skips docs without normalizedSerial)
OrderSchema.index({ normalizedSerial: 1 }, { unique: true, sparse: true, name: 'uniq_nonwahab_serial' });

// Helpful for queries filtering by owner and serialNumber
OrderSchema.index({ owner: 1, serialNumber: 1 });

module.exports = mongoose.model('Order', OrderSchema);
