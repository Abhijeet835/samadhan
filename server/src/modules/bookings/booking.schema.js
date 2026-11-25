import { z } from 'zod';

import { ALL_ACCEPTED_LOCAL_CATEGORIES, normalizeLocalCategory } from '../helpers/helper.constants.js';
import { BOOKING_STATUSES } from './booking.model.js';
import { normalizeIndianState } from '../../constants/indiaLocations.js';

export const createBookingSchema = z.object({
  helperId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid provider id'),
  category: z.enum(ALL_ACCEPTED_LOCAL_CATEGORIES).transform(normalizeLocalCategory).optional(),
  serviceTitle: z.string().min(2).max(120).trim(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'scheduledDate must be YYYY-MM-DD'),
  timeSlot: z.string().min(2).max(60).trim(),
  serviceAddress: z.object({
    address: z.string().min(3).max(300).trim(),
    city: z.string().max(100).trim().optional().default(''),
    state: z.string().max(100).trim().optional().default('').transform(normalizeIndianState),
    pincode: z.string().regex(/^\d{6}$/).optional().or(z.literal('')).default(''),
  }),
  notes: z.string().max(500).trim().optional().default(''),
  amountPaise: z.coerce.number().int().min(100).max(5000000).optional(),
  idempotencyKey: z.string().min(8).max(100).trim(),
});

export const transitionBookingSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  note: z.string().max(300).trim().optional().default(''),
});

export const listBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(15),
  status: z.enum(BOOKING_STATUSES).optional(),
});

export const bookingIdParamSchema = z.object({
  bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid booking id'),
});
