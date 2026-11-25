import { z } from 'zod';

import { ISSUE_CATEGORIES } from '../issues/issue.model.js';
import { SOCIAL_PLATFORMS, SOCIAL_POST_STATUSES } from './socialPost.model.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const postIdParamSchema = z.object({
  postId: z.string().regex(objectIdRegex, 'Invalid post id'),
});

export const issueIdParamSchema = z.object({
  issueId: z.string().regex(objectIdRegex, 'Invalid issue id'),
});

export const takedownSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required').max(500, 'Reason too long'),
});

export const settingsSchema = z.object({
  socialPublishMode: z.enum(['AUTO', 'REVIEW'], {
    required_error: 'socialPublishMode is required',
    invalid_type_error: 'socialPublishMode must be AUTO or REVIEW',
  }),
});

export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(SOCIAL_POST_STATUSES).optional(),
  platform: z.enum(SOCIAL_PLATFORMS).optional(),
  issueId: z.string().regex(objectIdRegex, 'Invalid issue id').optional(),
  tier: z.coerce.number().int().min(1).max(2).optional(),
});

export const trendingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.enum(ISSUE_CATEGORIES).optional(),
  city: z.string().trim().max(100).optional(),
});
