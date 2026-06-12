import React, { useState } from 'react';
import { Search, Bell } from 'lucide-react';
import type { UserResponse } from '../../types';

interface HeaderProps {
  user: UserResponse | null;
  title: string;
  subtitle?: string;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onSearch?: (query: string) => void;
}

export function Header({
  user,
  title,
  subtitle,
  notificationCount = 0,
  onNotificationClick,
  onSearch,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const initials = user
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
      <div className="px-4 lg:px-8 py-3.5 flex items-center gap-4">
        {/* Page title area */}
        <div className="flex-shrink-0 min-w-0">
          {subtitle && <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{subtitle}</p>}
          <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
        </div>

        {/* Global search - always visible, centered */}
        <form
          onSubmit={handleSearch}
          className="flex-1 max-w-xl mx-auto"
        >
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidates, roles, analytics..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
            />
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Notifications */}
          <button
            onClick={onNotificationClick}
            className="relative p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {/* User avatar */}
          {user && (
            <div className="w-9 h-9 rounded-full bg-[#1a1f36] flex items-center justify-center text-white text-sm font-bold cursor-pointer">
              {initials}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
