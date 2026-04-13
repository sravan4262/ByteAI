"use client"

import { createContext, useContext } from 'react'

interface NotificationContextValue {
  openNotifications: () => void
}

export const NotificationContext = createContext<NotificationContextValue>({
  openNotifications: () => {},
})

export const useNotifications = () => useContext(NotificationContext)
