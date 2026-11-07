import React, { useState, useEffect } from 'react';
import { Sparkles, Users, Calendar, BarChart3, Bell, LogOut, ArrowRight, ShieldCheck, Home } from 'lucide-react';
import { api, setToken } from '../services/api.js';

export default function Navbar({ user, onLogout, activeTab, setActiveTab }) {
  const [notifications, setNotifications] = useState([]);
  const [showInbox, setShowInbox] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = async () => {
    try {
      const data = await api.getNotifications();
      const notifs = data.notifications || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read_status).length);
    } catch {
      // Ignore if not logged in
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_status: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-5xl">
      <div className="glass-pill rounded-full px-4 sm:px-6 py-2.5 shadow-2xl flex items-center justify-between gap-4 border border-white/10">
        {/* Brand Logo */}
        <button
          onClick={() => setActiveTab('landing')}
          className="flex items-center gap-2.5 text-left group"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-500 to-amber-400 flex items-center justify-center text-neutral-950 font-bold shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-serif text-lg tracking-tight text-white group-hover:text-brand-300 transition-colors">
              SmartMatcher
            </span>
            <span className="hidden sm:inline text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-400 border border-white/[0.08]">
              v2
            </span>
          </div>
        </button>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setActiveTab('landing')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              activeTab === 'landing'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab('hub')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              activeTab === 'hub'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Coordination Hub
          </button>

          <button
            onClick={() => setActiveTab('discovery')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              activeTab === 'discovery'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Discovery & Groups
          </button>

          <button
            onClick={() => setActiveTab('onboarding')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              activeTab === 'onboarding'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Diagnostic
          </button>

          <button
            onClick={() => setActiveTab('demo')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              activeTab === 'demo'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Simulation Benchmark
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Smart Nudge Inbox */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowInbox(!showInbox)}
                className="p-2 rounded-full text-neutral-300 hover:text-white hover:bg-white/[0.08] relative transition"
                title="Smart Nudges & Reminders"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-brand-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showInbox && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 glass-panel rounded-2xl p-4 shadow-2xl z-50 border border-white/10">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-brand-400" />
                      <h4 className="font-semibold text-xs text-white">Smart Nudge Inbox</h4>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-mono">{unreadCount} unread</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.06] mt-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-neutral-500 py-4 text-center font-light">No notifications yet. The accountability worker monitors your sessions.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs rounded-xl transition mt-1.5 ${
                            n.read_status ? 'opacity-60 bg-transparent' : 'bg-white/[0.04] border border-brand-500/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-neutral-200">{n.title}</span>
                            {!n.read_status && (
                              <button
                                onClick={() => handleMarkRead(n.id)}
                                className="text-brand-400 hover:text-brand-300 text-[10px] underline"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                          <p className="text-neutral-400 mt-1 leading-relaxed text-[11px]">{n.message}</p>
                          <span className="text-[9px] text-neutral-500 mt-1.5 block font-mono">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User profile / Logged In State */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <button
                onClick={() => setActiveTab('hub')}
                className="text-xs font-medium text-white hover:text-brand-300 transition hidden sm:inline"
              >
                {user.name.split(' ')[0]}
              </button>
              <button
                onClick={onLogout}
                className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-full hover:bg-white/[0.08] transition"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('auth')}
              className="px-4 py-1.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 text-xs font-semibold transition-all shadow-md flex items-center gap-1.5 group"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
