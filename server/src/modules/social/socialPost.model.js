import mongoose from 'mongoose';

export const SOCIAL_PLATFORMS = [
  'X',
  'INSTAGRAM',
  'FACEBOOK',
  'REDDIT',
  'WHATSAPP',
  'TELEGRAM',
];

export const SOCIAL_POST_STATUSES = [
  'GENERATED',
  'POSTING',
  'POSTED',
  'SIMULATED',
  'FAILED',
  'TAKEN_DOWN',
];

export const GENERATION_SOURCES = ['GEMINI', 'TEMPLATE'];

const socialPostSchema = new mongoose.Schema(
  {
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true,
      index: true,
    },
    tier: {
      type: Number,
      enum: [1, 2],
      required: true,
    },
    platform: {
      type: String,
      enum: SOCIAL_PLATFORMS,
      required: true,
    },
    titleEn: {
      type: String,
      maxlength: 300,
    },
    titleHi: {
      type: String,
      maxlength: 300,
    },
    captionEn: {
      type: String,
      required: true,
      maxlength: 2500,
    },
    captionHi: {
      type: String,
      required: true,
      maxlength: 2500,
    },
    imageUrl: String,
    generationSource: {
      type: String,
      enum: GENERATION_SOURCES,
      required: true,
    },
    status: {
      type: String,
      enum: SOCIAL_POST_STATUSES,
      default: 'GENERATED',
    },
    externalId: String,
    externalUrl: String,
    shareClicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastError: {
      type: String,
      maxlength: 500,
    },
    takedownReason: String,
  },
  {
    timestamps: true,
  },
);

// Composite index: (issueId, tier)
socialPostSchema.index({ issueId: 1, tier: 1 });

// Unique index for idempotency: one post per (issueId, tier, platform)
socialPostSchema.index({ issueId: 1, tier: 1, platform: 1 }, { unique: true });

const SocialPost = mongoose.model('SocialPost', socialPostSchema);

export default SocialPost;
