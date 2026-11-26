import mongoose from 'mongoose';

import { normalizeIndianState } from '../../constants/indiaLocations.js';

export const ISSUE_CATEGORIES = [
  'BROKEN_ROADS',
  'SEWAGE_DRAINAGE',
  'GARBAGE_MANAGEMENT',
  'WATER_ELECTRICITY',
  'STRAY_ANIMALS',
  'EDUCATION_INFRA',
  'PUBLIC_FACILITIES',
  'OTHER',
];

export const LEGACY_ISSUE_CATEGORY_MAP = Object.freeze({
  ROAD: 'BROKEN_ROADS',
  SEWAGE: 'SEWAGE_DRAINAGE',
  GARBAGE: 'GARBAGE_MANAGEMENT',
  WATER: 'WATER_ELECTRICITY',
  ELECTRICITY: 'WATER_ELECTRICITY',
  STREETLIGHT: 'PUBLIC_FACILITIES',
  PARK: 'PUBLIC_FACILITIES',
});

export const ALL_ACCEPTED_ISSUE_CATEGORIES = [
  ...ISSUE_CATEGORIES,
  ...Object.keys(LEGACY_ISSUE_CATEGORY_MAP),
];

export function normalizeIssueCategory(cat) {
  if (!cat) return cat;
  const upper = String(cat).trim().toUpperCase();
  return LEGACY_ISSUE_CATEGORY_MAP[upper] ?? upper;
}

export const ISSUE_STATUSES = [
  'ACTIVE',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'REJECTED',
];

export const ISSUE_TYPES = ['SOCIAL_EXPLOSION', 'POOL_FUNDS'];
export const IMPORTANCE_LEVELS = ['SMALL', 'MEDIUM', 'LARGE'];
export const SOLVER_TYPES = ['GOVERNMENT', 'NGO', 'PRIVATE_ORG', 'COMMUNITY'];
export const ISSUE_LANGUAGES = ['en', 'hi'];

const DEVANAGARI_RE = new RegExp(`[${String.fromCharCode(0x0900)}-${String.fromCharCode(0x097f)}]`);

export function hasDevanagari(text) {
  return DEVANAGARI_RE.test(String(text ?? ''));
}

export function buildIssueLanguageFilter(lang) {
  if (lang === 'hi') {
    return {
      $or: [
        { titleHi: { $exists: true, $type: 'string', $ne: '' } },
        { issueLang: 'hi' },
        { language: 'hi' },
        { title: DEVANAGARI_RE },
      ],
    };
  }
  if (lang === 'en') {
    return {
      $and: [
        {
          $or: [
            { issueLang: 'en' },
            {
              $and: [
                { issueLang: { $exists: false } },
                { $or: [{ language: 'en' }, { language: { $exists: false } }] },
              ],
            },
          ],
        },
        { title: { $not: DEVANAGARI_RE } },
      ],
    };
  }
  return null;
}

export function localizeIssue(doc, lang) {
  if (!doc || lang !== 'hi') return doc;
  const localized = {
    ...doc,
    title: doc.titleHi || doc.title,
    description: doc.descriptionHi || doc.description,
  };
  if (doc.location) {
    localized.location = {
      ...doc.location,
      address: doc.location.addressHi || doc.location.address,
      city: doc.location.cityHi || doc.location.city,
    };
  }
  if (doc.responsibleParty) {
    localized.responsibleParty = {
      ...doc.responsibleParty,
      name: doc.responsibleParty.nameHi || doc.responsibleParty.name,
    };
  }
  if (doc.resolution) {
    localized.resolution = {
      ...doc.resolution,
      organizationName: doc.resolution.organizationNameHi || doc.resolution.organizationName,
      departmentOrLead: doc.resolution.departmentOrLeadHi || doc.resolution.departmentOrLead,
      resolutionDetails: doc.resolution.resolutionDetailsHi || doc.resolution.resolutionDetails,
      impactSummary: doc.resolution.impactSummaryHi || doc.resolution.impactSummary,
    };
  }
  return localized;
}

const utilizationItemSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true, maxlength: 140 },
    amountPaise: { type: Number, required: true, min: 100 },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

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
    issueLang: {
      type: String,
      enum: ISSUE_LANGUAGES,
      default: 'en',
      index: true,
    },
    titleHi: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    descriptionHi: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: ISSUE_CATEGORIES,
      required: true,
      set: normalizeIssueCategory,
    },
    issueType: {
      type: String,
      enum: ISSUE_TYPES,
      default: 'SOCIAL_EXPLOSION',
      index: true,
    },
    importance: {
      type: String,
      enum: IMPORTANCE_LEVELS,
      default: 'MEDIUM',
      index: true,
    },
    // Dynamic limit: supporter threshold for SOCIAL_EXPLOSION, or goal paise for POOL_FUNDS.
    thresholdTarget: {
      type: Number,
      default: 50,
      min: 1,
    },
    fundingGoalPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    explosionTriggered: {
      type: Boolean,
      default: false,
      index: true,
    },
    explosionTriggeredAt: Date,
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
      country: { type: String, default: 'India' },
      address: String,
      addressHi: String,
      city: String,
      cityHi: String,
      state: { type: String, set: normalizeIndianState },
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
    // Legacy tier fields kept for schema compatibility while importance thresholds drive new flows.
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
    platformCreditPaise: { type: Number, default: 0, min: 0 },
    authorityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Authority',
      default: null,
    },
    tier1ReachedAt: Date,
    tier2ReachedAt: Date,
    // Pool funds transparency & responsible party
    responsibleParty: {
      type: {
        type: String,
        enum: ['GOVERNMENT', 'NGO', 'PRIVATE_ORG', 'INDIVIDUAL', 'NONE'],
        default: 'NONE',
      },
      name: { type: String, trim: true, maxlength: 140, default: '' },
      nameHi: { type: String, trim: true, maxlength: 140, default: '' },
      contactRole: { type: String, trim: true, maxlength: 100, default: '' },
      note: { type: String, trim: true, maxlength: 300, default: '' },
    },
    fundUtilization: {
      type: [utilizationItemSchema],
      default: [],
    },
    // Full resolution & solver promotion tracking (Prompt 12)
    resolution: {
      solverType: { type: String, enum: SOLVER_TYPES },
      organizationName: { type: String, trim: true, maxlength: 160, default: '' },
      organizationNameHi: { type: String, trim: true, maxlength: 160, default: '' },
      departmentOrLead: { type: String, trim: true, maxlength: 140, default: '' },
      departmentOrLeadHi: { type: String, trim: true, maxlength: 140, default: '' },
      resolutionDetails: { type: String, trim: true, maxlength: 1000, default: '' },
      resolutionDetailsHi: { type: String, trim: true, maxlength: 1000, default: '' },
      impactSummary: { type: String, trim: true, maxlength: 500, default: '' },
      impactSummaryHi: { type: String, trim: true, maxlength: 500, default: '' },
      resolvedAt: Date,
      promotion: {
        enabled: { type: Boolean, default: false },
        tagline: { type: String, trim: true, maxlength: 200, default: '' },
        badgeText: { type: String, trim: true, maxlength: 80, default: '' },
        websiteUrl: { type: String, trim: true, maxlength: 300, default: '' },
      },
    },
    reachBySource: {
      x: { type: Number, default: 0, min: 0 },
      fb: { type: Number, default: 0, min: 0 },
      ig: { type: Number, default: 0, min: 0 },
      rd: { type: Number, default: 0, min: 0 },
      tg: { type: Number, default: 0, min: 0 },
      wa: { type: Number, default: 0, min: 0 },
      direct: { type: Number, default: 0, min: 0 },
    },
  },
  {
    timestamps: true,
  },
);

issueSchema.index({ location: '2dsphere' });
issueSchema.index({ category: 1, status: 1, createdAt: -1 });
issueSchema.index({ 'location.state': 1, 'location.city': 1, status: 1 });
issueSchema.index({ issueType: 1, importance: 1, status: 1 });
issueSchema.index({ fundPaise: -1 });
issueSchema.index({ title: 'text', description: 'text' });

const Issue = mongoose.model('Issue', issueSchema);

export default Issue;
