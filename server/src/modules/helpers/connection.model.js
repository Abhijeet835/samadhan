import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema(
  {
    seekerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    helperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Helper', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

connectionSchema.index({ seekerId: 1, helperId: 1 });
connectionSchema.index({ seekerId: 1, createdAt: 1 });
connectionSchema.index({ helperId: 1, createdAt: 1 });

const Connection = mongoose.model('Connection', connectionSchema);

export default Connection;
