import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balancePaise: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Wallet balance can never be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'balancePaise must be an integer',
      },
    },
  },
  {
    timestamps: true,
  },
);

const Wallet = mongoose.model('Wallet', walletSchema);

export default Wallet;