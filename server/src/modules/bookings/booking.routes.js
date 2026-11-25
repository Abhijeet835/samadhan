import express from 'express';

import * as bookingController from './booking.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  bookingIdParamSchema,
  createBookingSchema,
  listBookingsQuerySchema,
  transitionBookingSchema,
} from './booking.schema.js';

const router = express.Router();

router.use(authenticate);

router.post('/', validate(createBookingSchema), bookingController.create);
router.get('/mine', validate(listBookingsQuerySchema, 'query'), bookingController.mine);
router.get('/provider', validate(listBookingsQuerySchema, 'query'), bookingController.providerList);

router.param('bookingId', (req, _res, next, value) => {
  try {
    bookingIdParamSchema.parse({ bookingId: value });
    next();
  } catch (error) {
    next(error);
  }
});

router.get('/:bookingId', bookingController.detail);
router.post('/:bookingId/transition', validate(transitionBookingSchema), bookingController.transition);

export default router;
