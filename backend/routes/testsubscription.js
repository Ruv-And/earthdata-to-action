import { Router } from 'express';
import { pool } from '../config/database.js';
import { PushNotificationService } from '../services/pushNotificationService.js';

const router = Router();

// test by id
router.post('/test/notify/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [subscriptionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subscription not found' 
      });
    }
    
    const sub = result.rows[0];
    
    console.log('Test notification sent to:', {
      id: sub.id,
      location: `${sub.latitude}, ${sub.longitude}`,
      enabled: sub.notifications_enabled
    });
    
    let notificationSent = false;
    let notificationError = null;
    if (sub.push_subscription) {
      try {
        const pushSub = JSON.parse(sub.push_subscription);
        const success = await PushNotificationService.sendNotification(
          pushSub,
          '🌫️ Air Quality Alert',
          'Air quality is unhealthy in your area. AQI: 165',
          {
            subscriptionId: sub.id,
            airQuality: { aqi: 165, category: 'unhealthy' },
            timestamp: new Date().toISOString()
          }
        );
        notificationSent = success;
        console.log(`Push notification ${success ? 'sent successfully' : 'failed'} to subscription ${sub.id}`);
      } catch (error) {
        console.error('Error sending push notification:', error);
        notificationError = error.message;
      }
    } else {
      console.log(`No push subscription found for subscription ${sub.id}`);
    }
    
    res.json({
      success: true,
      message: 'Test notification triggered',
      subscription: {
        id: sub.id,
        latitude: sub.latitude,
        longitude: sub.longitude,
        notificationsEnabled: sub.notifications_enabled,
        hasPushSubscription: !!sub.push_subscription
      },
      notification: {
        title: '🌫️ Air Quality Alert',
        body: 'Air quality is unhealthy in your area. AQI: 165',
        category: 'unhealthy',
        sent: notificationSent,
        error: notificationError
      }
    });
    
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;