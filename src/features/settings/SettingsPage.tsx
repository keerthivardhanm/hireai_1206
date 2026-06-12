import { useState } from 'react';
import {
  User,
  Bell,
  Sun,
  Shield,
  Globe,
  LogOut
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Avatar } from '../../components/ui/badge';
import type { UserResponse } from '../../types';

interface SettingsPageProps {
  user: UserResponse | null;
  onLogout: () => void;
}

type SettingsTab = 'profile' | 'notifications' | 'appearance' | 'security' | 'audit';

export function SettingsPage({ user, onLogout }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
    { id: 'appearance', label: 'Appearance', icon: <Sun className="w-5 h-5" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-5 h-5" /> },
    { id: 'audit', label: 'Audit Log', icon: <Globe className="w-5 h-5" /> }
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card padding="none">
              <nav className="divide-y divide-gray-100">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      activeTab === tab.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'
                    }`}
                  >
                    {tab.icon}
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile */}
            {activeTab === 'profile' && (
              <Card padding="lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Settings</h2>
                <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <Avatar name={user?.name || 'User'} size="xl" />
                  <div>
                    <p className="font-medium text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                    <p className="text-xs text-gray-400 mt-1">Role: {user?.role}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Full Name" defaultValue={user?.name} disabled />
                  <Input label="Email" defaultValue={user?.email} disabled />
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <Button variant="secondary" onClick={onLogout} leftIcon={<LogOut className="w-4 h-4" />}>
                    Sign out
                  </Button>
                </div>
              </Card>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <Card padding="lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-500">Receive updates via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Push Notifications</p>
                      <p className="text-sm text-gray-500">Receive in-app notifications</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pushNotifications}
                        onChange={(e) => setPushNotifications(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>
              </Card>
            )}

            {/* Appearance */}
            {activeTab === 'appearance' && (
              <Card padding="lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h2>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Dark Mode</p>
                    <p className="text-sm text-gray-500">Toggle dark theme (coming soon)</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer opacity-50">
                    <input
                      type="checkbox"
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                      className="sr-only peer"
                      disabled
                    />
                    <div className="w-11 h-6 bg-gray-300 rounded-full"></div>
                  </label>
                </div>
              </Card>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <Card padding="lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Security</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">Password</p>
                    <p className="text-sm text-gray-500 mt-1">Last changed: Unknown</p>
                    <Button variant="secondary" size="sm" className="mt-3">
                      Change Password
                    </Button>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500 mt-1">Add an extra layer of security</p>
                    <Button variant="secondary" size="sm" className="mt-3">
                      Enable 2FA
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Audit Log */}
            {activeTab === 'audit' && (
              <Card padding="lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  {[
                    { action: 'Logged in', time: 'Just now' },
                    { action: 'Viewed candidate profile', time: '5 minutes ago' },
                    { action: 'Updated job posting', time: '1 hour ago' }
                  ].map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-sm text-gray-700">{log.action}</span>
                      </div>
                      <span className="text-xs text-gray-400">{log.time}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
