import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserPlus,
  RotateCcw,
  ExternalLink,
  CheckCheck
} from 'lucide-react';
import apiService from '../../services/api';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../auth/AuthProvider';

export default function NotificationBell() {
  const { selectedTeamId, addToast } = useApp();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !selectedTeamId) return;
    try {
      const res = await apiService.getNotifications(selectedTeamId);
      const notifs = res.data || [];
      setNotifications(notifs);
      setUnreadCount(res.unread_count ?? notifs.filter(n => !n.is_read).length);
    } catch {
      // fail silently to not interrupt UX
    }
  }, [isAuthenticated, selectedTeamId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleMarkAsRead = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      await apiService.markNotificationRead(selectedTeamId, notifId);
      setNotifications(prev =>
        prev.map(n => n.id === notifId ? { ...n, is_read: 1 } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiService.markAllNotificationsRead(selectedTeamId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      addToast('All notifications marked as read', 'info');
    } catch (err) {
      addToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link_url) {
      navigate(notif.link_url);
    } else {
      navigate('/tasks');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_assigned':
        return <UserPlus className="w-4 h-4 text-purple-600" />;
      case 'task_reassigned':
        return <RotateCcw className="w-4 h-4 text-indigo-600" />;
      case 'task_completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'task_overdue':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'task_deadline_approaching':
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatTimeAgo = (ts) => {
    if (!ts) return '';
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.max(0, now - ts);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px]">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                  You will be notified about task assignments, deadlines, blockers, and completions here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-start gap-3 relative ${
                    !notif.is_read ? 'bg-purple-50/30' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <p className={`text-xs leading-snug ${!notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      {formatTimeAgo(notif.created_at)}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <button
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="absolute top-3.5 right-3 text-slate-400 hover:text-purple-600 p-1 rounded transition-colors"
                      title="Mark as read"
                    >
                      <span className="w-2 h-2 rounded-full bg-purple-600 block"></span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
