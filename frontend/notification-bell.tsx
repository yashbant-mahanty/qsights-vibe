"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { notificationsApi, type Notification } from "@/lib/api";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const hasAuthToken = () => typeof document !== 'undefined' && document.cookie.includes('backendToken=');

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  async function loadNotifications() {
    try {
      if (!hasAuthToken()) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      setLoading(true);
      const data = await notificationsApi.getAll();
      console.log('Loaded notifications:', data);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Set empty array on error to show no notifications
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadUnreadCount() {
    try {
      if (!hasAuthToken()) {
        setUnreadCount(0);
        return;
      }
      const count = await notificationsApi.getUnreadCount();
      console.log('Loaded unread count:', count);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
      setUnreadCount(0);
    }
  }

  async function handleNotificationClick(notification: Notification) {
    try {
      // Mark as read
      if (!notification.is_read) {
        await notificationsApi.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Navigate to the relevant page
      if (notification.action_url) {
        router.push(notification.action_url);
      } else {
        // Default navigation based on notification type
        switch (notification.type) {
          case 'approval_request':
          case 'approval_pending':
            // For pending approvals, go to approvals page
            router.push(`/activities/approvals`);
            break;
          case 'approval_approved':
          case 'approval_rejected':
            // For approved/rejected, go to the approval detail page
            router.push(`/activities/approvals/${notification.entity_id}`);
            break;
          case 'activity_assigned':
          case 'activity_completed':
            // For activity notifications, check if entity_id exists
            if (notification.entity_id) {
              // Try to navigate to activity, fallback to activities list
              router.push(`/activities`);
            } else {
              router.push(`/activities`);
            }
            break;
          case 'reminder':
          case 'event_update':
            router.push(`/activities`);
            break;
          default:
            // Fallback based on entity type
            if (notification.entity_type === 'activity' || notification.entity_type === 'event') {
              router.push(`/activities`);
            } else if (notification.entity_type === 'approval') {
              router.push(`/activities/approvals`);
            } else if (notification.entity_type === 'program') {
              router.push(`/programs`);
            } else {
              router.push('/dashboard');
            }
        }
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  function getNotificationIcon(type: Notification['type']) {
    switch (type) {
      case 'approval_request':
      case 'approval_pending':
        return '📋';
      case 'approval_approved':
        return '✅';
      case 'approval_rejected':
        return '❌';
      case 'activity_assigned':
        return '📌';
      case 'activity_completed':
        return '🎉';
      case 'reminder':
        return '⏰';
      case 'event_update':
        return '📢';
      default:
        return '🔔';
    }
  }

  function getNotificationColor(type: Notification['type']) {
    switch (type) {
      case 'approval_approved':
      case 'activity_completed':
        return 'bg-green-50 border-green-200';
      case 'approval_rejected':
        return 'bg-red-50 border-red-200';
      case 'approval_request':
      case 'approval_pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'reminder':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popup */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500">{unreadCount} unread</p>
              )}
            </div>
            {notifications.length > 0 && unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-qsights-blue hover:text-qsights-blue/80 font-medium flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-qsights-blue"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm font-medium">No new notifications</p>
                <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium text-gray-900 ${!notification.is_read ? 'font-semibold' : ''}`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-qsights-blue rounded-full flex-shrink-0 mt-1.5"></span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>

                        {/* Entity Info */}
                        {notification.entity_name && (
                          <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded text-xs border ${getNotificationColor(notification.type)}`}>
                            <span className="font-medium">
                              {notification.entity_type === 'activity' ? '📊' : 
                               notification.entity_type === 'approval' ? '✓' :
                               notification.entity_type === 'program' ? '📁' : '📄'}
                            </span>
                            <span className="text-gray-700">{notification.entity_name}</span>
                          </div>
                        )}

                        {/* Timestamp */}
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer - View All Link */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => {
                  router.push('/notifications');
                  setIsOpen(false);
                }}
                className="text-sm text-qsights-blue hover:text-qsights-blue/80 font-medium w-full text-center"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
