// Push notification utilities
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class PushNotificationManager {
  private vapidPublicKey: string | null = null;
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    // Get VAPID public key from server
    try {
      const response = await fetch(`${API_URL}/api/vapid-key`);
      const data = await response.json();
      if (data.success) {
        this.vapidPublicKey = data.publicKey;
      }
    } catch (error) {
      console.error('Failed to get VAPID key:', error);
    }
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Check if notifications are permitted
   */
  async isPermissionGranted(): Promise<boolean> {
    if (!this.isSupported()) return false;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Register service worker
   */
  async registerServiceWorker(): Promise<boolean> {
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.registration);
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.isSupported() || !this.registration) {
      console.error('Push notifications not supported or service worker not registered');
      return null;
    }

    if (!this.vapidPublicKey) {
      console.error('VAPID public key not available');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      console.log('Push subscription created:', subscription);
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Get existing push subscription
   */
  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) return null;

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      return subscription;
    } catch (error) {
      console.error('Failed to get existing subscription:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Push subscription removed');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * Send push subscription to server
   */
  async sendSubscriptionToServer(
    subscription: PushSubscription,
    sessionToken: string,
    latitude: number,
    longitude: number
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken,
          latitude,
          longitude,
          notificationsEnabled: true,
          pushSubscription: subscription
        })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      return false;
    }
  }

  /**
   * Update push subscription on server
   */
  async updateSubscriptionOnServer(
    subscriptionId: string,
    sessionToken: string,
    subscription: PushSubscription
  ): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/subscription/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken,
          pushSubscription: subscription
        })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to update subscription on server:', error);
      return false;
    }
  }

  /**
   * Test push notification
   */
  async testNotification(title?: string, body?: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/test-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || 'Test Notification',
          body: body || 'This is a test push notification!'
        })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Create singleton instance
export const pushNotificationManager = new PushNotificationManager();
