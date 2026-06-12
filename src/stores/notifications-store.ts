import { useState, useCallback } from 'react';
import type { Notification } from '../types';

let notificationId = 0;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((
    type: Notification['type'],
    title: string,
    message: string,
    data?: Record<string, unknown>
  ) => {
    const notification: Notification = {
      id: ++notificationId,
      type,
      title,
      message,
      read: false,
      created_at: new Date().toISOString(),
      data
    };
    setNotifications(prev => [notification, ...prev]);
    return notification.id;
  }, []);

  const markAsRead = useCallback((id: number) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  };
}
