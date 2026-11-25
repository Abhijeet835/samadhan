import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    helperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Helper', required: true },
    seekerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5, validate: { validator: Number.isInteger, message: 'rating must be an integer' } },
    comment: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

// One editable review per seeker–helper pair.
reviewSchema.index({ helperId: 1, seekerId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
