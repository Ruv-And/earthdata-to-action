"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { PermissionModal } from "@/components/permission"
import { pushNotificationManager } from "@/lib/pushNotifications"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [notificationEnabled, setNotificationEnabled] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<"location" | "notification">("location")
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [sessionToken, setSessionToken] = useState<string>("")
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pushSupported, setPushSupported] = useState(false)

  // Check existing subscription on load
  const checkExistingSubscription = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/check-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionToken: token })
      })

      const data = await response.json()

      if (data.success && data.subscribed && data.subscription) {
        console.log('Existing subscription found:', data.subscription.id)
        setSubscriptionId(data.subscription.id)
        setNotificationEnabled(data.subscription.notificationsEnabled)
        setCoords({
          lat: data.subscription.latitude,
          lon: data.subscription.longitude
        })
        
        // Store in sessionStorage
        sessionStorage.setItem("subscriptionId", data.subscription.id)
        sessionStorage.setItem("locationData", JSON.stringify({
          lat: data.subscription.latitude,
          lon: data.subscription.longitude
        }))
      } else {
        console.log('No existing subscription found')
      }
    } catch (error) {
      console.error('Failed to check subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check if push notifications are supported
    setPushSupported(pushNotificationManager.isSupported())

    // Register service worker
    if (pushNotificationManager.isSupported()) {
      pushNotificationManager.registerServiceWorker()
    }

    // Generate or retrieve session token
    let token = sessionStorage.getItem("sessionToken")
    if (!token) {
      token = `session_${Date.now()}_${Math.random().toString(36).substr(2, 18)}`
      sessionStorage.setItem("sessionToken", token)
    }
    setSessionToken(token)

    // Check for existing subscription from backend
    checkExistingSubscription(token)
  }, [])

  // Subscribe to notifications via API
  const subscribeToNotifications = async (latitude: number, longitude: number) => {
    try {
      console.log('Subscribing to notifications...', { latitude, longitude })
      
      let pushSubscription = null;
      
      // Try to get push subscription if supported
      if (pushSupported) {
        try {
          // Check if we already have permission
          const hasPermission = await pushNotificationManager.isPermissionGranted();
          if (hasPermission) {
            pushSubscription = await pushNotificationManager.subscribeToPush();
            console.log('Push subscription created:', pushSubscription);
          }
        } catch (error) {
          console.warn('Failed to create push subscription:', error);
          // Continue with regular subscription even if push fails
        }
      }
      
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
          pushSubscription
        })
      })

      const data = await response.json()

      if (data.success) {
        setSubscriptionId(data.subscriptionId)
        sessionStorage.setItem("subscriptionId", data.subscriptionId)
        sessionStorage.setItem("locationData", JSON.stringify({ lat: latitude, lon: longitude }))
        
        if (data.isExisting) {
          console.log("Updated existing subscription:", data.subscriptionId)
        } else {
          console.log("Created new subscription:", data.subscriptionId)
        }

        // Store push subscription info
        if (pushSubscription) {
          sessionStorage.setItem("pushSubscription", JSON.stringify(pushSubscription));
          console.log("Push notifications enabled - you'll receive alerts even when the browser is closed!");
        }
      } else {
        throw new Error(data.message || 'Subscription failed')
      }
    } catch (error) {
      console.error("Failed to subscribe:", error)
      alert("Failed to enable notifications. Please make sure the backend is running.")
      setNotificationEnabled(false)
    }
  }

  // Update subscription status
  const updateSubscription = async (enabled: boolean) => {
    if (!subscriptionId) return

    try {
      console.log('Updating subscription...', { enabled })
      
      const response = await fetch(`${API_URL}/api/subscription/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionToken,
          notificationsEnabled: enabled
        })
      })

      const data = await response.json()

      if (data.success) {
        console.log("Subscription updated")
      } else {
        throw new Error(data.message || 'Update failed')
      }
    } catch (error) {
      console.error("Failed to update subscription:", error)
      alert("Failed to update notification settings.")
    }
  }

  // Unsubscribe (delete subscription)
  const unsubscribe = async () => {
    if (!subscriptionId) return

    try {
      console.log('Unsubscribing...')
      
      // Unsubscribe from push notifications
      if (pushSupported) {
        await pushNotificationManager.unsubscribeFromPush();
      }
      
      const response = await fetch(`${API_URL}/api/subscription/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionToken })
      })

      const data = await response.json()

      if (data.success) {
        console.log("🗑️ Successfully unsubscribed")
        
        // Clear state and storage
        setSubscriptionId(null)
        setNotificationEnabled(false)
        sessionStorage.removeItem("subscriptionId")
        sessionStorage.removeItem("pushSubscription")
        
      } else {
        throw new Error(data.message || 'Unsubscribe failed')
      }
    } catch (error) {
      console.error("Failed to unsubscribe:", error)
      alert("Failed to unsubscribe.")
    }
  }

  // Test push notification
  const testNotification = async () => {
    try {
      const success = await pushNotificationManager.testNotification(
        "Test Air Quality Alert",
        "This is a test push notification to verify everything is working!"
      );
      
      if (success) {
        alert("Test notification sent! Check if you received it.");
      } else {
        alert("Failed to send test notification.");
      }
    } catch (error) {
      console.error("Failed to test notification:", error);
      alert("Failed to send test notification.");
    }
  }

  // Called when user clicks location or notification buttons
  const handleLocationClick = () => {
    setModalType("location")
    setModalOpen(true)
  }

  const handleNotificationClick = async () => {
    if (notificationEnabled) {
      // Unsubscribe completely
      const confirmed = confirm("Are you sure you want to turn off air quality notifications?")
      if (confirmed) {
        await unsubscribe()
      }
    } else {
      // Enable notifications
      setModalType("notification")
      setModalOpen(true)
    }
  }

  // Modal accept handlers
  const handleAccept = () => {
    if (modalType === "location") {
      if (!("geolocation" in navigator)) {
        alert("Geolocation is not supported in this browser.")
        return
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newCoords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          }
          setCoords(newCoords)
          sessionStorage.setItem("locationData", JSON.stringify(newCoords))
          console.log("Location fetched:", newCoords)
        },
        (err) => {
          console.error("Error getting location:", err)
          alert("Unable to retrieve your location.")
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      )
    } else {
      Notification.requestPermission().then(async (result) => {
        if (result === "granted") {
          if (coords) {
            setNotificationEnabled(true)
            await subscribeToNotifications(coords.lat, coords.lon)
          } else {
            alert("Location data is missing. Please enable location first.")
          }
        } else {
          alert("Notifications permission denied.")
        }
      })
    }

    setModalOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <Header
        onLocationClick={handleLocationClick}
        onNotificationClick={handleNotificationClick}
        notificationEnabled={notificationEnabled}
      />
      <PermissionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={modalType}
        onAccept={handleAccept}
        onDecline={() => setModalOpen(false)}
      />
      <main className="p-6 text-center text-gray-700">
        <h2 className="text-2xl font-semibold mb-4">Air Quality Forecast Dashboard</h2>
        <p className="text-muted-foreground">
          {coords ? (
            <>
              Your location has been received. You will receive personalized air quality forecasts.
              <br />
              <span className="text-sm">Lat: {Number(coords.lat).toFixed(4)}, Lon: {Number(coords.lon).toFixed(4)}</span>
            </>
          ) : (
            "Enable location to receive air quality forecasts for your area."
          )}
        </p>
        {notificationEnabled && subscriptionId && (
          <div className="mt-4 space-y-2">
            <button
              onClick={testNotification}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Test Notification
            </button>
          </div>
        )}
        {coords && !notificationEnabled && (
          <p className="mt-4 text-sm text-yellow-600">
            Enable notifications to receive air quality alerts
          </p>
        )}
        {!pushSupported && (
          <p className="mt-4 text-sm text-orange-600">
            ⚠️ Push notifications not supported in this browser. You'll only receive notifications when the page is open.
          </p>
        )}
      </main>
    </div>
  )
}