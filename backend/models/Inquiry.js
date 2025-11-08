const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  propertyId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  message: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Inquiry', inquirySchema);
