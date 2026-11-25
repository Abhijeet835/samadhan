import mongoose from 'mongoose';

import { ISSUE_CATEGORIES, normalizeIssueCategory } from '../issues/issue.model.js';

const authoritySchema = new mongoose.Schema(
  {
    nameEn: { type: String, required: true, trim: true, maxlength: 200 },
    nameHi: { type: String, required: true, trim: true, maxlength: 200 },
    department: { type: String, required: true, trim: true, maxlength: 200 },
    categories: {
      type: [String],
      enum: [...ISSUE_CATEGORIES, '*'],
      required: true,
      set: (vals) => [...new Set((vals ?? []).map((v) => (v === '*' ? '*' : normalizeIssueCategory(v))))],
      validate: {
        validator: (value) => value.length > 0,
        message: 'At least one category is required',
      },
    },
    cityKeys: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => value.length > 0,
        message: 'At least one city key is required',
      },
    },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    handles: {
      x: { type: String, trim: true, default: '' },
      facebook: { type: String, trim: true, default: '' },
      instagram: { type: String, trim: true, default: '' },
    },
    website: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    isFallback: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// MongoDB forbids a compound index over two parallel arrays, so each array
// field gets its own multikey index (CONTEXT.md §8 lists them together).
authoritySchema.index({ cityKeys: 1 });
authoritySchema.index({ categories: 1 });

const Authority = mongoose.model('Authority', authoritySchema);

export default Authority;
