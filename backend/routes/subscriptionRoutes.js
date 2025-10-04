// src/routes/subscription.routes.js
import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscriptionController.js';
import { validate } from '../middleware/validate.js';
import { subscribeSchema, updateSchema, deleteSchema } from '../schema/schema.js';

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

export default router;
