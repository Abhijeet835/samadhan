import { z } from 'zod';
import { ISSUE_CATEGORIES, ISSUE_STATUSES } from './issue.model.js';

export const createIssueSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150).trim(),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000).trim(),
  category: z.enum(ISSUE_CATEGORIES),
  photos: z.array(z.string().url('Photo must be a valid URL')).max(3).optional().default([]),
  location: z.object({
    coordinates: z
      .tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ])
      .describe('[longitude, latitude]'),
    address: z.string().max(300).optional().default(''),
    city: z.string().max(100).optional().default(''),
    state: z.string().max(100).optional().default(''),
    pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional().or(z.literal('')).default(''),
  }),
  idempotencyKey: z.string().min(8).max(100).trim(),
  force: z.boolean().optional().default(false),
});

export const listIssuesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  category: z.enum(ISSUE_CATEGORIES).optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(['latest', 'fund', 'supporters']).default('latest'),
});

export const transitionIssueSchema = z.object({
  status: z.enum(ISSUE_STATUSES),
  note: z.string().max(500).optional().default(''),
});

export const issueIdParamSchema = z.object({
  issueId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid issue id'),
});

export const mapQuerySchema = z.object({
  west: z.coerce.number().optional(),
  south: z.coerce.number().optional(),
  east: z.coerce.number().optional(),
  north: z.coerce.number().optional(),
  category: z.enum(ISSUE_CATEGORIES).optional(),
  status: z.string().max(120).optional(),
  minTier: z.coerce.number().int().min(0).max(2).optional().default(0),
  limit: z.coerce.number().int().min(1).max(300).optional().default(200),
});

export const supportIssueSchema = z.object({
  idempotencyKey: z.string().min(8).max(100).trim(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});