import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password in queries by default
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian mobile number'],
    },
    role: {
      type: String,
      enum: ['CITIZEN', 'HELPER', 'ADMIN'],
      default: 'CITIZEN',
    },
    language: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en',
    },
    homeLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
      address: String,
      city: String,
      state: String,
      pincode: String,
    },
    activeMode: {
      type: String,
      enum: ['GLOBAL', 'LOCAL'],
      default: 'GLOBAL',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    profilePicture: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
  },
);

// 2dsphere index for geospatial queries (for Local mode)
userSchema.index({ 'homeLocation': '2dsphere' });

// Index for role queries
userSchema.index({ role: 1 });

// Virtual for full location display
userSchema.virtual('fullAddress').get(function () {
  if (!this.homeLocation?.address) return '';
  const parts = [
    this.homeLocation.address,
    this.homeLocation.city,
    this.homeLocation.state,
    this.homeLocation.pincode,
  ].filter(Boolean);
  return parts.join(', ');
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

userSchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

export default User;
