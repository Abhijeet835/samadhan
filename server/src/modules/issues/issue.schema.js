import { z } from 'zod';
import {
  ALL_ACCEPTED_ISSUE_CATEGORIES,
  IMPORTANCE_LEVELS,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  SOLVER_TYPES,
  normalizeIssueCategory,
} from './issue.model.js';
import { normalizeIndianState } from '../../constants/indiaLocations.js';

const categoryField = z
  .enum(ALL_ACCEPTED_ISSUE_CATEGORIES)
  .transform(normalizeIssueCategory);

export const createIssueSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150).trim(),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000).trim(),
  language: z.enum(['en', 'hi']).optional(),
  issueLang: z.enum(['en', 'hi']).optional(),
  titleHi: z.string().min(5).max(150).trim().optional(),
  descriptionHi: z.string().min(20).max(2000).trim().optional(),
  category: categoryField,
  issueType: z.enum(ISSUE_TYPES).optional().default('SOCIAL_EXPLOSION'),
  importance: z.enum(IMPORTANCE_LEVELS).optional().default('MEDIUM'),
  fundingGoalPaise: z.coerce.number().int().min(0).max(50000000).optional().default(0),
  responsibleParty: z
    .object({
      type: z.enum(['GOVERNMENT', 'NGO', 'PRIVATE_ORG', 'INDIVIDUAL', 'NONE']).optional().default('NONE'),
      name: z.string().max(140).trim().optional().default(''),
      nameHi: z.string().max(140).trim().optional(),
      contactRole: z.string().max(100).trim().optional().default(''),
      note: z.string().max(300).trim().optional().default(''),
    })
    .optional(),
  photos: z.array(z.string().url('Photo must be a valid URL')).max(3).optional().default([]),
  location: z.object({
    coordinates: z
      .tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ])
      .describe('[longitude, latitude]'),
    country: z.string().max(60).optional().default('India'),
    address: z.string().max(300).optional().default(''),
    addressHi: z.string().max(300).optional(),
    city: z.string().max(100).optional().default(''),
    cityHi: z.string().max(100).optional(),
    state: z.string().max(100).optional().default('').transform(normalizeIndianState),
    pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional().or(z.literal('')).default(''),
  }),
  idempotencyKey: z.string().min(8).max(100).trim(),
  force: z.boolean().optional().default(false),
});

export const listIssuesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  category: categoryField.optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  issueType: z.enum(ISSUE_TYPES).optional(),
  importance: z.enum(IMPORTANCE_LEVELS).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  resolvedOnly: z.enum(['true', 'false']).optional(),
  thresholdReached: z.enum(['true', 'false']).optional(),
  lang: z.enum(['en', 'hi']).optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(['latest', 'fund', 'supporters']).default('latest'),
});

export const transitionIssueSchema = z.object({
  status: z.enum(ISSUE_STATUSES),
  note: z.string().max(500).optional().default(''),
});

export const resolveIssueSchema = z.object({
  solverType: z.enum(SOLVER_TYPES),
  organizationName: z.string().min(2).max(160).trim(),
  departmentOrLead: z.string().max(140).trim().optional().default(''),
  resolutionDetails: z.string().min(10).max(1000).trim(),
  impactSummary: z.string().max(500).trim().optional().default(''),
  promotion: z
    .object({
      enabled: z.boolean().optional().default(false),
      tagline: z.string().max(200).trim().optional().default(''),
      badgeText: z.string().max(80).trim().optional().default(''),
      websiteUrl: z.string().max(300).trim().optional().default(''),
    })
    .optional(),
});

export const utilizationSchema = z.object({
  item: z.string().min(2).max(140).trim(),
  amountPaise: z.coerce.number().int().min(100).max(50000000),
  note: z.string().max(300).trim().optional().default(''),
  responsibleParty: z
    .object({
      type: z.enum(['GOVERNMENT', 'NGO', 'PRIVATE_ORG', 'INDIVIDUAL', 'NONE']).optional(),
      name: z.string().max(140).trim().optional(),
      contactRole: z.string().max(100).trim().optional(),
      note: z.string().max(300).trim().optional(),
    })
    .optional(),
});

export const issueIdParamSchema = z.object({
  issueId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid issue id'),
});

export const mapQuerySchema = z.object({
  west: z.coerce.number().optional(),
  south: z.coerce.number().optional(),
  east: z.coerce.number().optional(),
  north: z.coerce.number().optional(),
  category: categoryField.optional(),
  status: z.string().max(120).optional(),
  minTier: z.coerce.number().int().min(0).max(2).optional().default(0),
  limit: z.coerce.number().int().min(1).max(300).optional().default(200),
  lang: z.enum(['en', 'hi']).optional(),
});

export const supportIssueSchema = z.object({
  idempotencyKey: z.string().min(8).max(100).trim(),
  amountPaise: z.coerce.number().int().min(100).max(1000000).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
