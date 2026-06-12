import {
  Bell,
  Check,
  Trash2,
  UserPlus,
  Calendar,
  Briefcase,
  FileText,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, EmptyState } from '../../components/ui/card';
import type { Notification } from '../../types';
import { getRelativeTime } from '../../utils/chart-utils';

interface NotificationsPageProps {
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  stage_change: <UserPlus className="w-5 h-5 text-blue-600" />,
  interview: <Calendar className="w-5 h-5 text-purple-600" />,
  job_published: <Briefcase className="w-5 h-5 text-emerald-600" />,
  report_ready: <FileText className="w-5 h-5 text-orange-600" />,
  copilot: <MessageSquare className="w-5 h-5 text-indigo-600" />,
  system: <AlertTriangle className="w-5 h-5 text-gray-600" />
};

export function NotificationsPage({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll
}: NotificationsPageProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="secondary" onClick={onMarkAllAsRead} leftIcon={<Check className="w-4 h-4" />}>
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" onClick={onClearAll} leftIcon={<Trash2 className="w-4 h-4" />}>
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell className="w-6 h-6" />}
            title="No notifications"
            description="You're all caught up! New notifications will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-4 p-4 bg-white rounded-lg border ${
                !notification.read ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'
              }`}
            >
              <div className={`p-2 rounded-lg ${!notification.read ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                {NOTIFICATION_ICONS[notification.type] || <Bell className="w-5 h-5 text-gray-600" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{notification.message}</p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400">
                    {getRelativeTime(notification.created_at)}
                  </span>
                  {!notification.read && (
                    <button
                      onClick={() => onMarkAsRead(notification.id)}
                      className="text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => onDelete(notification.id)}
                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
