"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { PermissionModal } from "@/components/permission"

export default function Home() {
  const [notificationEnabled, setNotificationEnabled] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<"location" | "notification">("location")
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("locationData")
    if (stored) {
      const parsed = JSON.parse(stored)
      setCoords(parsed)
    }
  }, [])
  // Called when user clicks location or notification buttons
  const handleLocationClick = () => {
    setModalType("location")
    setModalOpen(true)
  }

  const handleNotificationClick = () => {
    if (notificationEnabled) {
      setNotificationEnabled(false)
    } else {
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
          if (notificationEnabled) {
            localStorage.setItem("locationData", JSON.stringify(newCoords))
          }
          console.log("One-time location fetched:", newCoords)
        },
        (err) => {
          console.error("Error getting location:", err)
          alert("Unable to retrieve your location.")
        },
        {
          enableHighAccuracy: true, // optional
          timeout: 5000,
          maximumAge: 0,
        }
      )
    } else {
      Notification.requestPermission().then((result) => {
        if (result === "granted") {
          setNotificationEnabled(true)
        } else {
          alert("Notifications permission denied.")
        }
      })
    }

    setModalOpen(false)
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
          Your location has been received. You will receive personalized air quality forecasts. 
          {coords && `Lat: ${coords.lat}, Lon: ${coords.lon}`}
        </p>
      </main>
    </div>
  )
}
