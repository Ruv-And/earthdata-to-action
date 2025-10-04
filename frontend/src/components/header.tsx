"use client"

import { MapPin, Bell, Wind, Pin } from "lucide-react"

interface HeaderProps {
  onLocationClick: () => void
  onNotificationClick: () => void
  notificationEnabled: boolean
}

export function Header({
  onLocationClick,
  onNotificationClick,
  notificationEnabled,
}: HeaderProps) {
  return (
    <header className="border-b border-gray-200 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Wind className="h-10 w-10 text-black" />
          <h1 className="text-3xl font-semibold text-black">ClearSkies</h1>
        </div>
        <nav className="flex items-center gap-3">
          <button
            onClick={onLocationClick}
            className="px-5 py-3 rounded-lg border-2 border-black bg-white text-black 
                       hover:bg-black hover:text-white transition-colors duration-300 ease-in-out flex items-center gap-2"
          >
            <Pin />
            <span className="text-base">
              Get Location
            </span>
          </button>
          <button
            onClick={onNotificationClick}
            className="px-5 py-3 rounded-lg border-2 border-black bg-white text-black 
                       hover:bg-black hover:text-white transition-colors duration-300 ease-in-out flex items-center gap-2"
          >
            <Bell />
            <span className="text-base">
              {notificationEnabled ? "Turn Off Notifications" : "Enable Alerts"}
            </span>
          </button>
        </nav>
      </div>
    </header>
  )
}
