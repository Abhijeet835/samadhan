/**
 * Social controllers: admin and public endpoints.
 */

import * as socialService from './social.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

// ========== PUBLIC ENDPOINTS ==========

export async function trending(req, res, next) {
  try {
    const query = req.validated?.query ?? req.query;
    const result = await socialService.getTrending(query);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function getIssuePosts(req, res, next) {
  try {
    const result = await socialService.getIssuePosts(req.params.issueId);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function clickPost(req, res, next) {
  try {
    const result = await socialService.incrementShareClick(req.params.postId);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

// ========== ADMIN ENDPOINTS ==========

export async function listPosts(req, res, next) {
  try {
    const query = req.validated?.query ?? req.query;
    const result = await socialService.listPosts(query);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function publishPost(req, res, next) {
  try {
    const post = await socialService.publishPost(req.params.postId);
    return sendSuccess(res, { post });
  } catch (error) {
    return next(error);
  }
}

export async function retryPost(req, res, next) {
  try {
    const post = await socialService.publishPost(req.params.postId);
    return sendSuccess(res, { post });
  } catch (error) {
    return next(error);
  }
}

export async function regeneratePost(req, res, next) {
  try {
    const post = await socialService.regeneratePost(req.params.postId, req.user.userId);
    return sendSuccess(res, { post });
  } catch (error) {
    return next(error);
  }
}

export async function takedownPost(req, res, next) {
  try {
    const post = await socialService.takedownPost(
      req.params.postId,
      req.body.reason,
      req.user.userId,
    );
    return sendSuccess(res, { post });
  } catch (error) {
    return next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const result = await socialService.updatePublishMode(
      req.body.socialPublishMode,
      req.user.userId,
    );
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}
