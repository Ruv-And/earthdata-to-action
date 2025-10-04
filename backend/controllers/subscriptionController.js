// src/controllers/subscription.controller.js
import { SubscriptionService } from '../services/subscriptionService.js';

export class SubscriptionController {
  static async subscribe(req, res) {
    try {
      const { sessionToken, latitude, longitude, notificationsEnabled } = req.body;

      if (!notificationsEnabled) {
        return res.status(400).json({
          success: false,
          message: 'Notifications must be enabled to subscribe'
        });
      }

      const subscription = await SubscriptionService.create(
        sessionToken,
        latitude,
        longitude,
        notificationsEnabled
      );

      res.status(201).json({
        success: true,
        message: 'Successfully subscribed to air quality notifications',
        subscriptionId: subscription.id
      });
    } catch (error) {
      console.error('Subscribe error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const { sessionToken, notificationsEnabled, latitude, longitude } = req.body;

      // Verify token
      const isValid = await SubscriptionService.verifyToken(id, sessionToken);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid session token'
        });
      }

      // Update subscription
      await SubscriptionService.update(id, {
        notificationsEnabled,
        latitude,
        longitude
      });

      res.json({
        success: true,
        message: 'Subscription updated successfully'
      });
    } catch (error) {
      console.error('Update error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const { sessionToken } = req.body;

      // Verify token
      const isValid = await SubscriptionService.verifyToken(id, sessionToken);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid session token'
        });
      }

      await SubscriptionService.delete(id);

      res.json({
        success: true,
        message: 'Successfully unsubscribed'
      });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getAll(req, res) {
    try {
      const subscriptions = await SubscriptionService.getActiveSubscriptions();

      res.json({
        success: true,
        count: subscriptions.length,
        subscriptions
      });
    } catch (error) {
      console.error('Get all error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}