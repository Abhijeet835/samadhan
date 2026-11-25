import * as bookingService from './booking.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function create(req, res, next) {
  try {
    const data = await bookingService.createBooking({ consumerId: req.user.userId, data: req.body });
    return sendSuccess(res, data, data.idempotent ? 200 : 201);
  } catch (error) {
    return next(error);
  }
}

export async function mine(req, res, next) {
  try {
    return sendSuccess(res, await bookingService.listMyBookings(req.user.userId, req.validated.query));
  } catch (error) {
    return next(error);
  }
}

export async function providerList(req, res, next) {
  try {
    return sendSuccess(res, await bookingService.listProviderBookings(req.user.userId, req.validated.query));
  } catch (error) {
    return next(error);
  }
}

export async function detail(req, res, next) {
  try {
    const booking = await bookingService.getBookingById(req.params.bookingId, req.user.userId, req.user.role);
    return sendSuccess(res, { booking });
  } catch (error) {
    return next(error);
  }
}

export async function transition(req, res, next) {
  try {
    const booking = await bookingService.transitionBooking({
      bookingId: req.params.bookingId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      nextStatus: req.body.status,
      note: req.body.note,
    });
    return sendSuccess(res, { booking });
  } catch (error) {
    return next(error);
  }
}
