// src/controllers/subscription.controller.js
import { SubscriptionService } from '../services/subscriptionService.js';
import { PushNotificationService } from '../services/pushNotificationService.js';

export class SubscriptionController {
  static async checkStatus(req, res) {
    try {
      const { sessionToken } = req.body;

      const subscription = await SubscriptionService.findBySessionToken(sessionToken);

      if (!subscription) {
        return res.json({
          success: true,
          subscribed: false,
          subscription: null
        });
      }

      res.json({
        success: true,
        subscribed: true,
        subscription: {
          id: subscription.id,
          latitude: subscription.latitude,
          longitude: subscription.longitude,
          notificationsEnabled: subscription.notifications_enabled,
          lastNotificationSent: subscription.last_notification_sent,
          hasPushSubscription: !!subscription.push_subscription
        }
      });
    } catch (error) {
      console.error('Check status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async subscribe(req, res) {
    try {
      const { sessionToken, latitude, longitude, notificationsEnabled, pushSubscription } = req.body;

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
        notificationsEnabled,
        pushSubscription ? JSON.stringify(pushSubscription) : null
      );

      res.status(201).json({
        success: true,
        message: 'Successfully subscribed to air quality notifications',
        subscriptionId: subscription.id,
        vapidPublicKey: PushNotificationService.getVapidPublicKey()
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
      const { sessionToken, notificationsEnabled, latitude, longitude, pushSubscription } = req.body;

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
        longitude,
        pushSubscription: pushSubscription ? JSON.stringify(pushSubscription) : undefined
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

  static async getVapidKey(req, res) {
    try {
      res.json({
        success: true,
        publicKey: PushNotificationService.getVapidPublicKey()
      });
    } catch (error) {
      console.error('Get VAPID key error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async testNotification(req, res) {
    try {
      const { title = 'Test Notification', body = 'This is a test push notification!' } = req.body;
      
      const successCount = await PushNotificationService.broadcastAirQualityAlert(
        title,
        body,
        { test: true }
      );

      res.json({
        success: true,
        message: `Test notification sent to ${successCount} subscribers`,
        sentCount: successCount
      });
    } catch (error) {
      console.error('Test notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}