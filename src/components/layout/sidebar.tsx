import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  GitBranch,
  BarChart3,
  FileText,
  Sparkles,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  X,
  Menu
} from 'lucide-react';
import type { UserResponse } from '../../types';

interface SidebarProps {
  user: UserResponse | null;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  notificationCount: number;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pipeline', label: 'Applications', icon: GitBranch },
  { id: 'candidates', label: 'Candidates', icon: Users },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'copilot', label: 'AI Copilot', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ user, currentPage, onNavigate, onLogout, notificationCount }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setIsMobileOpen(false);
  };

  const isActive = (id: string) => {
    if (id === 'pipeline' && currentPage === 'pipeline') return true;
    if (id === 'candidates' && (currentPage === 'candidates' || currentPage === 'candidate-detail')) return true;
    return currentPage === id;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-[#1a1f36] rounded-lg shadow-md"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 lg:z-0
          h-screen bg-[#1a1f36] flex flex-col
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-[72px]' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            {!isCollapsed && (
              <div>
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest leading-none">HIREAI</p>
                <p className="text-base font-bold text-white leading-tight">Copilot</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-white/40 hover:text-white/80"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
          <ul className="space-y-0.5 px-3">
            {menuItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigate(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-150 group relative
                    ${isActive(item.id)
                      ? 'bg-white text-[#1a1f36]'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                    }
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="flex-1 text-left">{item.label}</span>
                  )}
                  {item.id === 'notifications' && notificationCount > 0 && !isCollapsed && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                      {notificationCount}
                    </span>
                  )}
                  {isCollapsed && isActive(item.id) && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-400 rounded-l-full" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="px-3 py-4 border-t border-white/10">
          {user && !isCollapsed && (
            <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-xl bg-white/5">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-white/40 truncate capitalize">{user.role}</p>
              </div>
            </div>
          )}
          {user && isCollapsed && (
            <div className="flex justify-center mb-1">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium
              text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

// Bottom Navigation for Mobile
interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { id: 'candidates', icon: Users, label: 'Candidates' },
    { id: 'pipeline', icon: GitBranch, label: 'Pipeline' },
    { id: 'jobs', icon: Briefcase, label: 'Jobs' },
    { id: 'copilot', icon: Sparkles, label: 'AI' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1a1f36] border-t border-white/10 z-30 safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`
              flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg
              ${currentPage === item.id ? 'text-white' : 'text-white/40'}
            `}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
