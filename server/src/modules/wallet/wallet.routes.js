import express from 'express';

import * as walletController from './wallet.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { topupSchema, txnsQuerySchema } from './wallet.schema.js';

const router = express.Router();

router.use(authenticate);

router.get('/', walletController.getWallet);
router.post('/topup', validate(topupSchema), walletController.topup);
router.get('/txns', validate(txnsQuerySchema, 'query'), walletController.listTxns);

export default router;