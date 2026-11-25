import mongoose from 'mongoose';

const helperFlagSchema = new mongoose.Schema(
  {
    helperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Helper', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true, minlength: 5, maxlength: 300 },
    // Admin unhide dismisses existing flags; only non-dismissed flags count.
    dismissed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

helperFlagSchema.index({ helperId: 1, userId: 1 }, { unique: true });

const HelperFlag = mongoose.model('HelperFlag', helperFlagSchema);

export default HelperFlag;
