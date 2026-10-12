import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Sparkles, Bus, Route, Users, CalendarClock,
  Compass, Fuel, Wrench, FileSpreadsheet, Package, Wallet,
  CreditCard, BarChart3, ShieldCheck, Bell, Settings, User,
  Menu, X, ChevronLeft, ChevronRight, Search, LogOut,
  RotateCcw, CheckCheck, ExternalLink
} from 'lucide-react';
import { useFleetData } from '../../hooks/useFleetData';
import { formatDateTime } from '../../utils/formatters';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export const AppLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, markAllNotificationsAsRead, profile, resetToDemo, buses, drivers, routes } = useFleetData();

  const unreadCount = notifications.filter(n => !n.read).length;

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const navigationSections: NavSection[] = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { label: 'AI Intelligence', icon: Sparkles, path: '/ai-intelligence' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { label: 'Bus Management', icon: Bus, path: '/buses' },
        { label: 'Routes', icon: Route, path: '/routes' },
        { label: 'Drivers', icon: Users, path: '/drivers' },
        { label: 'Trip Scheduling', icon: CalendarClock, path: '/trips' },
        { label: 'GPS Tracking', icon: Compass, path: '/gps-tracking' },
        { label: 'Fuel Management', icon: Fuel, path: '/fuel' },
      ],
    },
    {
      label: 'Maintenance',
      items: [
        { label: 'Mechanics', icon: Wrench, path: '/maintenance' },
        { label: 'Maintenance Records', icon: FileSpreadsheet, path: '/maintenance-records' },
        { label: 'Inventory', icon: Package, path: '/inventory' },
      ],
    },
    {
      label: 'Finance',
      items: [
        { label: 'Finance', icon: Wallet, path: '/finance' },
        { label: 'EMI', icon: CreditCard, path: '/emi' },
      ],
    },
    {
      label: 'Insights',
      items: [
        { label: 'Reports', icon: BarChart3, path: '/reports' },
        { label: 'Audit Logs', icon: ShieldCheck, path: '/audit-logs' },
      ],
    },
    {
      label: 'Account',
      items: [
        { label: 'Notifications', icon: Bell, path: '/notifications', badge: unreadCount },
        { label: 'Settings', icon: Settings, path: '/settings' },
        { label: 'Profile', icon: User, path: '/profile' },
      ],
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('fleetmind_auth_token');
    navigate('/login');
  };

  // Global search matching
  const searchResults = searchQuery.trim() ? [
    ...buses.filter(b => b.bus_number.toLowerCase().includes(searchQuery.toLowerCase()) || b.registration_number.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(b => ({ type: 'Vehicle', title: `${b.bus_number} — ${b.registration_number}`, sub: b.model, path: '/buses' })),
    ...drivers.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.phone.includes(searchQuery))
      .map(d => ({ type: 'Driver', title: d.name, sub: `Licence: ${d.license_number}`, path: '/drivers' })),
    ...routes.filter(r => r.route_name.toLowerCase().includes(searchQuery.toLowerCase()) || r.route_code.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(r => ({ type: 'Route', title: `${r.route_code} — ${r.route_name}`, sub: `${r.distance_km} km`, path: '/routes' })),
  ] : [];

  return (
    <div className="min-h-screen bg-[#08111F] text-slate-100 flex relative selection:bg-[#00C2FF]/30 selection:text-white">
      {/* SIDEBAR (Desktop) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen ${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-[#0B1F3A] border-r border-white/5 flex flex-col transition-all duration-300 hidden lg:flex`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/5 shrink-0">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-[#00C2FF] flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
              <Bus className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-heading font-bold text-lg text-white tracking-tight">FleetMind</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#00C2FF]/20 text-[#00C2FF] border border-[#00C2FF]/30 tracking-wider">
                  AI
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigationSections.map((section, idx) => (
            <div key={idx}>
              {!isCollapsed && (
                <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-heading">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600/30 to-[#00C2FF]/20 text-white border border-[#00C2FF]/40 shadow-sm shadow-[#00C2FF]/10'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#00C2FF]' : ''}`} />
                      {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                      {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#00C2FF] text-slate-950">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-white/5 shrink-0 bg-[#08111F]/50">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <img
              src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
              alt={profile.full_name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#00C2FF]/30 shrink-0"
            />
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{profile.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate">{profile.role}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-[#0B1F3A] border-r border-white/10 p-4 flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-[#00C2FF] flex items-center justify-center">
                  <Bus className="w-4 h-4 text-white" />
                </div>
                <span className="font-heading font-bold text-lg text-white">FleetMind AI</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {navigationSections.map((section, idx) => (
                <div key={idx}>
                  <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-heading">
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-600/30 to-[#00C2FF]/20 text-white border border-[#00C2FF]/40'
                              : 'text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? 'text-[#00C2FF]' : ''}`} />
                          <span className="flex-1">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00C2FF] text-slate-950">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER */}
        <header className="h-16 bg-[#0B1F3A]/70 backdrop-blur-md border-b border-white/5 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm lg:text-base font-semibold text-white capitalize font-heading">
                  {location.pathname === '/' ? 'Executive Dashboard' : location.pathname.substring(1).replace(/-/g, ' ')}
                </h1>
                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span className="hidden sm:inline-block text-xs text-slate-400 font-medium">
                  {currentDateFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Global Search trigger */}
            <button
              onClick={() => setGlobalSearchOpen(true)}
              className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#08111F] border border-white/10 text-xs text-slate-400 hover:text-white hover:border-[#00C2FF]/30 transition-all w-52 lg:w-64"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="flex-1 text-left">Search fleet, drivers, routes...</span>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-slate-400 border border-white/10">⌘K</kbd>
            </button>

            {/* Demo Mode Badge */}
            <div className="flex items-center gap-2">
              <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-[#00C2FF] border border-[#00C2FF]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C2FF] animate-pulse" />
                Local Storage Mode
              </span>

              <button
                onClick={() => {
                  if (confirm('Reset fleet data to initial state?')) {
                    resetToDemo();
                  }
                }}
                title="Reset sample data"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Notifications Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifDropdownOpen(!notifDropdownOpen);
                  setProfileDropdownOpen(false);
                }}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#00C2FF] ring-2 ring-[#0B1F3A]" />
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0F2742] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-[#0B1F3A]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Notifications</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00C2FF]/20 text-[#00C2FF]">
                        {unreadCount} new
                      </span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllNotificationsAsRead()}
                        className="text-xs text-[#00C2FF] hover:underline flex items-center gap-1 font-medium"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">No notifications</div>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setNotifDropdownOpen(false);
                            if (n.link) navigate(n.link);
                          }}
                          className={`p-3.5 hover:bg-white/5 cursor-pointer transition-colors ${
                            !n.read ? 'bg-blue-500/5' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-white">{n.title}</p>
                            <span className="text-[10px] text-slate-400 shrink-0">{formatDateTime(n.date)}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 border-t border-white/5 bg-[#0B1F3A] text-center">
                    <Link
                      to="/notifications"
                      onClick={() => setNotifDropdownOpen(false)}
                      className="text-xs text-[#00C2FF] hover:underline font-medium"
                    >
                      View all notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileDropdownOpen(!profileDropdownOpen);
                  setNotifDropdownOpen(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
              >
                <img
                  src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                  alt={profile.full_name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-[#00C2FF]/30"
                />
                <span className="text-xs font-semibold text-white hidden sm:inline-block max-w-[120px] truncate">
                  {profile.full_name.split(' ')[0]}
                </span>
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#0F2742] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 py-1.5 divide-y divide-white/5">
                  <div className="px-4 py-3">
                    <p className="text-xs font-bold text-white truncate">{profile.full_name}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{profile.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      View Profile
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      Fleet Settings
                    </Link>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT OUTLET */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* GLOBAL SEARCH MODAL */}
      {globalSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setGlobalSearchOpen(false)} />
          <div className="relative w-full max-w-xl bg-[#0F2742] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-[#0B1F3A]">
              <Search className="w-5 h-5 text-[#00C2FF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search vehicles, drivers, routes..."
                autoFocus
                className="w-full bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none"
              />
              <button onClick={() => setGlobalSearchOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-white/5">
              {searchResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {searchQuery ? 'No matching fleet records found.' : 'Search across all buses, drivers, and routes.'}
                </div>
              ) : (
                searchResults.map((res, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setGlobalSearchOpen(false);
                      setSearchQuery('');
                      navigate(res.path);
                    }}
                    className="p-3 hover:bg-white/5 rounded-xl cursor-pointer flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {res.type}
                        </span>
                        <span className="text-xs font-semibold text-white group-hover:text-[#00C2FF]">{res.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{res.sub}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
