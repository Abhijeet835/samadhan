import mongoose from 'mongoose';

export const ISSUE_CATEGORIES = [
  'ROAD',
  'GARBAGE',
  'WATER',
  'STREETLIGHT',
  'SEWAGE',
  'ELECTRICITY',
  'PARK',
  'OTHER',
];

export const ISSUE_STATUSES = [
  'ACTIVE',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'REJECTED',
];

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      enum: ISSUE_CATEGORIES,
      required: true,
    },
    photos: {
      type: [String],
      default: [],
      validate: {
        validator: (value) => value.length <= 3,
        message: 'At most 3 photos are allowed',
      },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: (value) =>
            value.length === 2 &&
            value[0] >= -180 && value[0] <= 180 &&
            value[1] >= -90 && value[1] <= 90,
          message: 'coordinates must be [longitude, latitude]',
        },
      },
      address: String,
      city: String,
      state: String,
      pincode: String,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ISSUE_STATUSES,
      default: 'ACTIVE',
    },
    // Amplification is a separate field from lifecycle status (0 / 1 / 2).
    tier: {
      type: Number,
      enum: [0, 1, 2],
      default: 0,
    },
    tiersReached: {
      type: [Number],
      default: [],
    },
    fundPaise: {
      type: Number,
      default: 0,
      min: [0, 'Fund can never be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'fundPaise must be an integer',
      },
    },
    supporterCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    resolvedAt: Date,
    rejectedReason: String,
  },
  {
    timestamps: true,
  },
);

issueSchema.index({ location: '2dsphere' });
issueSchema.index({ category: 1, status: 1, createdAt: -1 });
issueSchema.index({ fundPaise: -1 });
issueSchema.index({ title: 'text', description: 'text' });

const Issue = mongoose.model('Issue', issueSchema);

export default Issue;