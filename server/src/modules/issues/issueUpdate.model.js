import mongoose from 'mongoose';

const issueUpdateSchema = new mongoose.Schema(
  {
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true,
    },
    fromStatus: {
      type: String,
      default: null,
    },
    toStatus: {
      type: String,
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorRole: {
      type: String,
      enum: ['CITIZEN', 'HELPER', 'ADMIN', 'SYSTEM'],
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

issueUpdateSchema.index({ issueId: 1, createdAt: 1 });

const IssueUpdate = mongoose.model('IssueUpdate', issueUpdateSchema);

export default IssueUpdate;