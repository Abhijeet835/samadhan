import mongoose from 'mongoose';

const issueSupportSchema = new mongoose.Schema(
  {
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      validate: {
        validator: (value) => Number.isInteger(value) && value > 0,
        message: 'amountPaise must be a positive integer',
      },
    },
    isReporter: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// One support per user per issue.
issueSupportSchema.index({ issueId: 1, userId: 1 }, { unique: true });

const IssueSupport = mongoose.model('IssueSupport', issueSupportSchema);

export default IssueSupport;