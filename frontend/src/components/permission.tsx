"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MapPin, Bell } from "lucide-react"

interface PermissionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "location" | "notification"
  onAccept: () => void
  onDecline: () => void
}

export function PermissionModal({
  open,
  onOpenChange,
  type,
  onAccept,
  onDecline,
}: PermissionModalProps) {
  const isLocation = type === "location"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border border-border rounded-xl shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {isLocation ? (
              <MapPin className="h-6 w-6 text-blue-500" />
            ) : (
              <Bell className="h-6 w-6 text-yellow-500" />
            )}
            <DialogTitle className="text-lg font-semibold text-black">
              {isLocation
                ? "Get Location"
                : "Enable Push Notifications"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {isLocation ? (
              <>
                Allow <strong>ClearSkies</strong> to access your location one time to
                provide personalized air quality forecasts and alerts for your
                area. Your location is stored securely one time using a hashed session token and
                never shared with third parties.
              </>
            ) : (
              <>
                Receive real-time alerts when air quality in your area reaches
                unhealthy levels. Notifications help you make informed decisions
                about outdoor activities and protect your health.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
          <button
            onClick={onDecline}
            className="w-full sm:w-auto px-4 py-2 rounded-md border-2 border-black
            text-sm text-black hover:bg-gray-100 transition-colors duration-300 ease-in-out"
          >
            Not Now
          </button>
          <button
            onClick={onAccept}
            className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm text-white ${
              isLocation
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-yellow-500 hover:bg-yellow-600"
            } transition`}
          >
            {isLocation ? "Get Location" : "Enable Alerts"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
