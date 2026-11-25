import mongoose from 'mongoose';

import { LOCAL_CATEGORIES } from '../helpers/helper.constants.js';

export const BOOKING_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

export const PAYMENT_STATUSES = ['HELD', 'SETTLED', 'REFUNDED'];

const bookingSchema = new mongoose.Schema(
  {
    consumerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    providerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    helperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Helper', required: true, index: true },
    category: { type: String, enum: LOCAL_CATEGORIES, required: true },
    serviceTitle: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    scheduledDate: { type: String, required: true, trim: true },
    timeSlot: { type: String, required: true, trim: true, maxlength: 60 },
    serviceAddress: {
      address: { type: String, required: true, trim: true, minlength: 3, maxlength: 300 },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      pincode: { type: String, trim: true, default: '' },
    },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    amountPaise: {
      type: Number,
      required: true,
      min: 100,
      validate: { validator: Number.isInteger, message: 'amountPaise must be integer paise' },
    },
    commissionRatePercent: { type: Number, required: true, min: 0, max: 50 },
    commissionPaise: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'commissionPaise must be integer paise' },
    },
    providerPayoutPaise: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'providerPayoutPaise must be integer paise' },
    },
    status: { type: String, enum: BOOKING_STATUSES, default: 'PENDING', index: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'HELD' },
    idempotencyKey: { type: String, required: true, unique: true, trim: true },
    statusNote: { type: String, trim: true, maxlength: 300, default: '' },
    acceptedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true },
);

bookingSchema.index({ consumerId: 1, createdAt: -1 });
bookingSchema.index({ providerUserId: 1, status: 1, createdAt: -1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
