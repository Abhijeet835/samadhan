import { z } from 'zod';

import { ISSUE_CATEGORIES } from '../issues/issue.model.js';

const categoryEnum = z.enum([...ISSUE_CATEGORIES, '*']);

const handlesSchema = z.object({
  x: z.string().max(100).optional().default(''),
  facebook: z.string().max(200).optional().default(''),
  instagram: z.string().max(100).optional().default(''),
});

export const createAuthoritySchema = z.object({
  nameEn: z.string().min(2).max(200).trim(),
  nameHi: z.string().min(2).max(200).trim(),
  department: z.string().min(2).max(200).trim(),
  categories: z.array(categoryEnum).min(1),
  cityKeys: z.array(z.string().min(1).max(100)).min(1),
  email: z.string().email('Invalid authority email').max(200),
  handles: handlesSchema.optional().default({}),
  website: z.string().max(300).optional().default(''),
  isActive: z.boolean().optional().default(true),
  isFallback: z.boolean().optional().default(false),
});

export const updateAuthoritySchema = createAuthoritySchema.partial();

export const authorityIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid authority id'),
});
