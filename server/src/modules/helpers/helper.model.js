import mongoose from 'mongoose';

import { LOCAL_CATEGORIES, VERIFICATION_STATUSES } from './helper.constants.js';

const helperSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    photoUrl: { type: String, default: '' },
    // NEVER returned in public projections — only owner dashboard/PATCH + admin.
    phone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    categories: {
      type: [String],
      enum: LOCAL_CATEGORIES,
      required: true,
      validate: { validator: (v) => v.length >= 1 && v.length <= 4, message: 'Choose 1 to 4 categories' },
    },
    experienceYears: { type: Number, default: 0, min: 0, max: 60 },
    bio: { type: String, required: true, trim: true, minlength: 20, maxlength: 600 },
    priceHint: { type: String, default: '', trim: true, maxlength: 80 },
    serviceLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v) => v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
          message: 'coordinates must be [longitude, latitude]',
        },
      },
      address: String,
      city: String,
      state: String,
      pincode: String,
    },
    radiusKm: { type: Number, default: 5, min: 1, max: 25 },
    isAvailable: { type: Boolean, default: true },
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'PENDING' },
    rejectionReason: { type: String, default: '' },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    connectCount: { type: Number, default: 0, min: 0 }, // DISTINCT seekers ever
    flagCount: { type: Number, default: 0, min: 0 }, // non-dismissed flags
    isHidden: { type: Boolean, default: false },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true },
);

helperSchema.index({ serviceLocation: '2dsphere' });
helperSchema.index({ verificationStatus: 1, isHidden: 1, categories: 1 });

const Helper = mongoose.model('Helper', helperSchema);

export default Helper;
