import webpush from 'web-push';
import { SubscriptionService } from './subscriptionService.js';

let VAPID_KEYS = null;
let webPushConfigured = false;

function initializeVapidKeys() {
  if (!webPushConfigured) {
    VAPID_KEYS = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    };

    if (!VAPID_KEYS.publicKey || !VAPID_KEYS.privateKey) {
      console.error('VAPID keys not found in environment variables');
      console.error('VAPID_PUBLIC_KEY:', !!VAPID_KEYS.publicKey);
      console.error('VAPID_PRIVATE_KEY:', !!VAPID_KEYS.privateKey);
      throw new Error('VAPID keys are required for push notifications');
    }

    webpush.setVapidDetails(
      'mailto:your-email@example.com',
      VAPID_KEYS.publicKey,
      VAPID_KEYS.privateKey
    );

    webPushConfigured = true;
    console.log('VAPID keys initialized successfully');
  }
}

export class PushNotificationService {
  static async sendNotification(subscription, title, body, data = {}) {
    try {
      initializeVapidKeys();
      
      const payload = JSON.stringify({
        title,
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: {
          url: '/',
          ...data
        }
      });

      await webpush.sendNotification(subscription, payload);
      console.log('Push notification sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log('Invalid subscription, removing...');
        await this.removeInvalidSubscription(subscription);
      }
      
      return false;
    }
  }
  // send to all
  static async broadcastAirQualityAlert(title, body, airQualityData = {}) {
    try {
      const subscriptions = await SubscriptionService.getActiveSubscriptions();
      console.log(`Broadcasting to ${subscriptions.length} subscribers`);
      
      const promises = subscriptions.map(async (sub) => {
        if (sub.push_subscription) {
          console.log(`Sending notification to subscription ${sub.id}`);
          const pushSub = JSON.parse(sub.push_subscription);
          return this.sendNotification(
            pushSub,
            title,
            body,
            {
              subscriptionId: sub.id,
              airQuality: airQualityData,
              timestamp: new Date().toISOString()
            }
          );
        } else {
          console.log(`Subscription ${sub.id} has no push subscription`);
        }
        return false;
      });

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(result => result.status === 'fulfilled' && result.value).length;
      
      console.log(`Push notifications sent: ${successCount}/${subscriptions.length}`);
      return successCount;
    } catch (error) {
      console.error('Error broadcasting air quality alert:', error);
      throw error;
    }
  }
  static async removeInvalidSubscription(subscription) {
    try {
      const subscriptions = await SubscriptionService.getActiveSubscriptions();
      const invalidSub = subscriptions.find(sub => {
        if (!sub.push_subscription) return false;
        const pushSub = JSON.parse(sub.push_subscription);
        return pushSub.endpoint === subscription.endpoint;
      });

      if (invalidSub) {
        await SubscriptionService.update(invalidSub.id, { push_subscription: null });
        console.log(`Removed invalid push subscription for ID: ${invalidSub.id}`);
      }
    } catch (error) {
      console.error('Error removing invalid subscription:', error);
    }
  }
  static getVapidPublicKey() {
    initializeVapidKeys();
    return VAPID_KEYS.publicKey;
  }
}
