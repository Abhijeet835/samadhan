import mongoose from 'mongoose';

export const WALLET_TXN_TYPES = [
  'TOPUP',
  'REPORT_FEE',
  'SUPPORT_FEE',
  'REFUND',
  'PLATFORM_CREDIT',
  'SIGNUP_CREDIT',
];

const walletTxnSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: WALLET_TXN_TYPES,
      required: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      validate: {
        validator: (value) => Number.isInteger(value) && value !== 0,
        message: 'amountPaise must be a non-zero signed integer',
      },
    },
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

walletTxnSchema.index({ userId: 1, createdAt: -1 });
walletTxnSchema.index({ type: 1, createdAt: -1 });

const WalletTxn = mongoose.model('WalletTxn', walletTxnSchema);

export default WalletTxn;