import mongoose from 'mongoose';

export const ISSUE_FLAG_REASONS = ['SPAM', 'DUPLICATE', 'INAPPROPRIATE', 'WRONG_LOCATION', 'OTHER'];

const issueFlagSchema = new mongoose.Schema(
  {
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: ISSUE_FLAG_REASONS, required: true },
    comment: { type: String, default: '', trim: true, maxlength: 300 },
    dismissed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

issueFlagSchema.index({ issueId: 1, userId: 1 }, { unique: true });
issueFlagSchema.index({ issueId: 1, dismissed: 1 });

const IssueFlag = mongoose.model('IssueFlag', issueFlagSchema);

export default IssueFlag;
