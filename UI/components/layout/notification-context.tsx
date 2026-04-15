"use client"

import { createContext, useContext } from 'react'

interface NotificationContextValue {
  openNotifications: () => void
  unreadCount: number
}

export const NotificationContext = createContext<NotificationContextValue>({
  openNotifications: () => {},
  unreadCount: 0,
})

export const useNotifications = () => useContext(NotificationContext)
