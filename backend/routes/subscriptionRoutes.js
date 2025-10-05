// src/routes/subscription.routes.js
import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscriptionController.js';
import { validate } from '../middleware/validate.js';
import { subscribeSchema, updateSchema, deleteSchema } from '../schema/schema.js';
import { z } from 'zod';

const router = Router();

router.post(
  '/subscribe',
  validate(subscribeSchema),
  SubscriptionController.subscribe
);

router.put(
  '/subscription/:id',
  validate(updateSchema),
  SubscriptionController.update
);

router.delete(
  '/subscription/:id',
  validate(deleteSchema),
  SubscriptionController.delete
);

router.get(
  '/subscriptions',
  SubscriptionController.getAll
);

router.post(
  '/check-subscription',
  validate(z.object({ sessionToken: z.string().min(1) })),
  SubscriptionController.checkStatus
);

router.get(
  '/vapid-key',
  SubscriptionController.getVapidKey
);

router.post(
  '/test-notification',
  SubscriptionController.testNotification
);

export default router;
