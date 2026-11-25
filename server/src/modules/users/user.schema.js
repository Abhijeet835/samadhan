import { z } from 'zod';

// Phone regex for Indian numbers
const phoneRegex = /^[6-9]\d{9}$/;

// Password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      passwordRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    ),
  phone: z
    .string()
    .regex(phoneRegex, 'Please provide a valid 10-digit Indian mobile number'),
  role: z
    .enum(['CONSUMER', 'PROVIDER', 'CITIZEN', 'HELPER'])
    .optional()
    .default('CONSUMER')
    .transform((r) => (r === 'CITIZEN' ? 'CONSUMER' : r === 'HELPER' ? 'PROVIDER' : r)),
  language: z.enum(['en', 'hi']).optional().default('en'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim()
    .optional(),
  phone: z
    .string()
    .regex(phoneRegex, 'Please provide a valid 10-digit Indian mobile number')
    .optional(),
  language: z.enum(['en', 'hi']).optional(),
  activeMode: z.enum(['GLOBAL', 'LOCAL']).optional(),
  profilePicture: z.string().url('Invalid profile picture URL').optional(),
  homeLocation: z
    .object({
      coordinates: z
        .tuple([
          z.number().min(-180).max(180),
          z.number().min(-90).max(90),
        ])
        .describe('[longitude, latitude]'),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().length(6, 'Pincode must be 6 digits').optional(),
    })
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(
      passwordRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    ),
});

export const switchModeSchema = z.object({
  mode: z.enum(['GLOBAL', 'LOCAL'], {
    required_error: 'Mode is required',
    invalid_type_error: 'Mode must be either GLOBAL or LOCAL',
  }),
});
