"use client";

import { useState, useEffect } from "react";
import RoleBasedLayout from "@/components/role-based-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCheck, Trash2, Filter } from "lucide-react";
import { notificationsApi, type Notification } from "@/lib/api";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const router = useRouter();

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      const data = await notificationsApi.getAll();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleNotificationClick(notification: Notification) {
    try {
      if (!notification.is_read) {
        await notificationsApi.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      }

      if (notification.action_url) {
        router.push(notification.action_url);
      } else {
        switch (notification.entity_type) {
          case 'activity':
            router.push(`/activities/${notification.entity_id}`);
            break;
          case 'approval':
            router.push(`/activities/approvals`);
            break;
          case 'event':
            router.push(`/activities/${notification.entity_id}`);
            break;
          case 'program':
            router.push(`/programs`);
            break;
          default:
            router.push('/dashboard');
        }
      }
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
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      await notificationsApi.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
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

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <RoleBasedLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Bell className="w-6 h-6" />
                  Notifications
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Filter */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      filter === 'all'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('unread')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      filter === 'unread'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Unread
                  </button>
                </div>

                {/* Mark All Read */}
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-2 px-4 py-2 bg-qsights-blue text-white rounded-lg hover:bg-qsights-blue/90 transition-colors text-sm font-medium"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-qsights-blue"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Bell className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-medium">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {filter === 'unread' ? 'You\'re all caught up!' : 'We\'ll notify you when something happens'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-4 rounded-lg border transition-all hover:shadow-md text-left relative group ${
                      !notification.is_read 
                        ? 'bg-blue-50/50 border-blue-200 hover:bg-blue-50' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <span className="text-3xl">{getNotificationIcon(notification.type)}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`text-base font-semibold text-gray-900 ${!notification.is_read ? 'font-bold' : ''}`}>
                                {notification.title}
                              </h3>
                              {!notification.is_read && (
                                <span className="w-2.5 h-2.5 bg-qsights-blue rounded-full flex-shrink-0"></span>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-3">
                              {notification.message}
                            </p>

                            {/* Entity Tag */}
                            {notification.entity_name && (
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getNotificationColor(notification.type)}`}>
                                <span>
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

                          {/* Delete Button */}
                          <button
                            onClick={(e) => handleDelete(notification.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleBasedLayout>
  );
}
