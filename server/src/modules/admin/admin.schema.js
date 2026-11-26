import { z } from 'zod';
import { ISSUE_STATUSES } from '../issues/issue.model.js';
import { ISSUE_FLAG_REASONS } from './issueFlag.model.js';

const id = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const page = { page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) };

export const adminIssuesQuerySchema = z.object({
  ...page,
  q: z.string().max(120).optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  tier: z.coerce.number().int().min(0).max(2).optional(),
  category: z.string().max(40).optional(),
  city: z.string().max(100).optional(),
  flagged: z.enum(['true', 'false']).optional(),
  hasFailedActions: z.enum(['true', 'false']).optional(),
  exploded: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'fund', 'supporters', 'tier']).default('newest'),
});

export const adminTransitionSchema = z.object({
  status: z.enum(ISSUE_STATUSES),
  note: z.string().max(500).optional().default(''),
});

export const assignAuthoritySchema = z.object({ authorityId: id.nullable() });
export const authorityReplySchema = z.object({ message: z.string().min(10).max(1000).trim(), authorityId: id.optional() });
export const platformCreditSchema = z.object({
  amountPaise: z.coerce.number().int().positive(),
  reason: z.string().min(5).max(200).trim(),
  idempotencyKey: z.string().min(8).max(100),
});

export const issueFlagSchema = z.object({
  reason: z.enum(ISSUE_FLAG_REASONS),
  comment: z.string().max(300).trim().optional().default(''),
});

export const adminUsersQuerySchema = z.object({
  ...page,
  q: z.string().max(120).optional(),
  role: z.enum(['CONSUMER', 'PROVIDER', 'CITIZEN', 'HELPER', 'ADMIN']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});
export const patchUserSchema = z.object({ isActive: z.boolean() });

export const patchSettingsSchema = z.object({
  reportFeePaise: z.number().int().optional(),
  supportFeePaise: z.number().int().optional(),
  tier1Paise: z.number().int().optional(),
  tier2Paise: z.number().int().optional(),
  smallIssueThreshold: z.number().int().min(1).max(1000).optional(),
  mediumIssueThreshold: z.number().int().min(2).max(5000).optional(),
  largeIssueThreshold: z.number().int().min(3).max(20000).optional(),
  smallPoolGoalPaise: z.number().int().min(1000).max(50000000).optional(),
  mediumPoolGoalPaise: z.number().int().min(2000).max(50000000).optional(),
  largePoolGoalPaise: z.number().int().min(5000).max(50000000).optional(),
  platformCommissionPercent: z.number().int().min(0).max(50).optional(),
  signupCreditPaise: z.number().int().optional(),
  duplicateRadiusM: z.number().int().optional(),
  duplicateDays: z.number().int().optional(),
  autoCloseDays: z.number().int().optional(),
  platformCreditMaxPaise: z.number().int().optional(),
  demoMode: z.boolean().optional(),
}).refine((o) => Object.keys(o).length > 0, 'Provide at least one setting');

export const patchCategoriesSchema = z.object({
  disabledIssueCategories: z.array(z.string()).optional(),
  disabledHelperCategories: z.array(z.string()).optional(),
});

export const dashboardQuerySchema = z.object({ days: z.coerce.number().int().refine((d) => [7, 30, 90].includes(d)).default(30) });
export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z.string().max(80).optional(),
  entity: z.string().max(40).optional(),
  entityId: z.string().max(40).optional(),
  actorId: id.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().max(80).optional(),
});

export const idParamSchema = z.object({ id });
export const issueIdParamSchema = z.object({ issueId: id });
export const userIdParamSchema = z.object({ userId: id });
