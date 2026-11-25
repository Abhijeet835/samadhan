import * as notificationService from './notification.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function list(req, res, next) {
  try {
    const { page, limit, unreadOnly } = req.validated.query;
    return sendSuccess(res, await notificationService.listNotifications(req.user.userId, { page, limit, unreadOnly: unreadOnly === 'true' }));
  } catch (error) {
    return next(error);
  }
}

export async function unreadCount(req, res, next) {
  try {
    return sendSuccess(res, await notificationService.getUnreadCount(req.user.userId));
  } catch (error) {
    return next(error);
  }
}

export async function read(req, res, next) {
  try {
    const notification = await notificationService.markRead(req.user.userId, req.params.id);
    return sendSuccess(res, { notification });
  } catch (error) {
    return next(error);
  }
}

export async function readAll(req, res, next) {
  try {
    return sendSuccess(res, await notificationService.markAllRead(req.user.userId));
  } catch (error) {
    return next(error);
  }
}
