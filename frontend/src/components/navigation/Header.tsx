'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Bell, Menu, User, Sun, Moon, MessageCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import AuthModal from '@/components/auth/AuthModal';
import DateRangePicker from '@/components/search/DateRangePicker';
import { getNotifications, markNotificationRead, markAllNotificationsRead, type Notification } from '@/lib/api';

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [checkIn, setCheckIn] = useState(searchParams.get('check_in') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('check_out') || '');
  const [guests, setGuests] = useState(Number(searchParams.get('guests') || 0));
  const [activeSearchField, setActiveSearchField] = useState<'location' | 'checkin' | 'checkout' | 'guests' | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setActiveSearchField(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch notifications when logged in as host
  useEffect(() => {
    if (!currentUser) { setNotifications([]); return; }
    getNotifications().then(setNotifications).catch(() => {});
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleOpenNotifications = () => {
    setShowNotifications(v => !v);
    setShowUserMenu(false);
  };

  const handleMarkRead = async (id: number) => {
    try {
      const updated = await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? updated : n));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (checkIn) params.set('check_in', checkIn);
    if (checkOut) params.set('check_out', checkOut);
    if (guests > 0) params.set('guests', String(guests));
    router.push(`/?${params.toString()}`);
    setActiveSearchField(null);
    setShowMobileSearch(false);
  };

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
    setShowUserMenu(false);
  };

  const fmtDate = (d: string) => { try { return format(parseISO(d), 'MMM d'); } catch { return ''; } };

  const searchLabel = () => {
    const parts: string[] = [];
    parts.push(location || 'Anywhere');
    parts.push(checkIn && checkOut ? `${fmtDate(checkIn)} – ${fmtDate(checkOut)}` : 'Any week');
    parts.push(guests > 0 ? `${guests} guest${guests > 1 ? 's' : ''}` : 'Add guests');
    return parts.join(' · ');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-canvas border-b border-hairline" style={{ height: '80px' }}>
        <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 shrink-0">
            <svg viewBox="0 0 32 32" width="32" height="32" fill="#ff385c">
              <path d="M16 1c2.008 0 3.463.963 4.751 3.269l.533 1.025c1.954 3.83 6.114 12.54 7.1 14.836l.145.353c.667 1.591.91 2.472.96 3.396l.01.415.001.228c0 4.062-2.877 6.478-6.357 6.478-2.224 0-4.556-1.258-6.153-3.482l-.335-.497-.335.497c-1.553 2.055-3.795 3.32-5.998 3.475l-.155.007c-3.48 0-6.357-2.416-6.357-6.478l.001-.228.010-.415c.05-.924.293-1.805.960-3.396l.145-.353c.985-2.295 5.145-11.005 7.1-14.836l.533-1.025C12.537 1.963 13.992 1 16 1zm0 2c-1.239 0-2.053.539-2.987 2.21l-.523 1.006c-1.926 3.756-6.07 12.44-7.055 14.733l-.143.347c-.535 1.279-.727 1.998-.768 2.826l-.009.392-.001.223c0 2.962 1.951 4.478 4.357 4.478 1.947 0 3.84-1.292 5.01-3.4l.616-1.208.616 1.208c1.217 2.226 3.163 3.4 5.01 3.4 2.406 0 4.357-1.516 4.357-4.478l-.001-.223-.009-.392c-.04-.828-.233-1.547-.768-2.826l-.143-.347C24.13 18.656 19.986 9.972 18.51 6.216l-.523-1.006C16.053 3.539 15.239 3 16 3z"/>
            </svg>
            <span className="text-primary font-bold text-xl hidden sm:block">airbnb</span>
          </Link>

          {/* Desktop search bar */}
          <div className="hidden md:flex flex-1 max-w-[640px] mx-auto" ref={searchRef}>
            {activeSearchField ? (
              <div className="w-full relative">
                {/* Bar */}
                <div className="bg-white dark:bg-[#1e1e1e] border border-[#dddddd] dark:border-[#3d3d3d] rounded-full flex items-center"
                  style={{ height: '58px', boxShadow: 'rgba(0,0,0,0.08) 0 2px 12px' }}>

                  {/* WHERE */}
                  <div
                    onClick={() => setActiveSearchField('location')}
                    className={`flex-[1.4] px-5 h-full flex flex-col justify-center cursor-pointer rounded-l-full transition-colors ${activeSearchField === 'location' ? 'bg-[#f7f7f7] dark:bg-[#2c2c2c]' : 'hover:bg-[#f7f7f7] dark:hover:bg-[#252525]'}`}
                  >
                    <span className="text-[9px] font-bold text-[#222222] dark:text-[#f2f2f2] uppercase tracking-widest">Where</span>
                    <input
                      autoFocus={activeSearchField === 'location'}
                      type="text"
                      placeholder="Search destinations"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="text-sm text-[#222222] dark:text-[#f2f2f2] placeholder:text-[#b0b0b0] dark:placeholder:text-[#5a5a5a] outline-none bg-transparent w-full leading-tight mt-0.5"
                      onClick={(e) => { e.stopPropagation(); setActiveSearchField('location'); }}
                    />
                  </div>

                  <div className="w-px h-7 bg-[#e0e0e0] dark:bg-[#3a3a3a]" />

                  {/* CHECK IN */}
                  <div
                    onClick={() => setActiveSearchField('checkin')}
                    className={`flex-1 px-5 h-full flex flex-col justify-center cursor-pointer transition-colors ${activeSearchField === 'checkin' ? 'bg-[#f7f7f7] dark:bg-[#2c2c2c]' : 'hover:bg-[#f7f7f7] dark:hover:bg-[#252525]'}`}
                  >
                    <span className="text-[9px] font-bold text-[#222222] dark:text-[#f2f2f2] uppercase tracking-widest">Check in</span>
                    <span className={`text-sm leading-tight mt-0.5 ${checkIn ? 'text-[#222222] dark:text-[#f2f2f2] font-medium' : 'text-[#b0b0b0] dark:text-[#5a5a5a]'}`}>
                      {checkIn ? fmtDate(checkIn) : 'Add dates'}
                    </span>
                  </div>

                  <div className="w-px h-7 bg-[#e0e0e0] dark:bg-[#3a3a3a]" />

                  {/* CHECK OUT */}
                  <div
                    onClick={() => setActiveSearchField('checkout')}
                    className={`flex-1 px-5 h-full flex flex-col justify-center cursor-pointer transition-colors ${activeSearchField === 'checkout' ? 'bg-[#f7f7f7] dark:bg-[#2c2c2c]' : 'hover:bg-[#f7f7f7] dark:hover:bg-[#252525]'}`}
                  >
                    <span className="text-[9px] font-bold text-[#222222] dark:text-[#f2f2f2] uppercase tracking-widest">Check out</span>
                    <span className={`text-sm leading-tight mt-0.5 ${checkOut ? 'text-[#222222] dark:text-[#f2f2f2] font-medium' : 'text-[#b0b0b0] dark:text-[#5a5a5a]'}`}>
                      {checkOut ? fmtDate(checkOut) : 'Add dates'}
                    </span>
                  </div>

                  <div className="w-px h-7 bg-[#e0e0e0] dark:bg-[#3a3a3a]" />

                  {/* WHO */}
                  <div
                    onClick={() => setActiveSearchField('guests')}
                    className={`flex-1 px-5 h-full flex flex-col justify-center cursor-pointer transition-colors ${activeSearchField === 'guests' ? 'bg-[#f7f7f7] dark:bg-[#2c2c2c]' : 'hover:bg-[#f7f7f7] dark:hover:bg-[#252525]'}`}
                  >
                    <span className="text-[9px] font-bold text-[#222222] dark:text-[#f2f2f2] uppercase tracking-widest">Who</span>
                    <span className={`text-sm leading-tight mt-0.5 ${guests > 0 ? 'text-[#222222] dark:text-[#f2f2f2] font-medium' : 'text-[#b0b0b0] dark:text-[#5a5a5a]'}`}>
                      {guests > 0 ? `${guests} guest${guests > 1 ? 's' : ''}` : 'Add guests'}
                    </span>
                  </div>

                  {/* Search button */}
                  <button
                    onClick={handleSearch}
                    className="mr-2 ml-1 flex items-center gap-2 bg-[#ff385c] hover:bg-[#e00b41] text-white font-semibold rounded-full px-4 py-2.5 transition-colors text-sm shrink-0"
                  >
                    <Search size={14} />
                    <span className="hidden lg:block">Search</span>
                  </button>
                </div>

                {/* Calendar dropdown */}
                {(activeSearchField === 'checkin' || activeSearchField === 'checkout') && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] bg-white dark:bg-[#1e1e1e] border border-[#dddddd] dark:border-[#3d3d3d] rounded-[24px] p-5 z-50"
                    style={{ width: '680px', boxShadow: 'rgba(0,0,0,0.15) 0 4px 24px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DateRangePicker
                      checkIn={checkIn}
                      checkOut={checkOut}
                      onChange={(ci, co) => {
                        setCheckIn(ci);
                        setCheckOut(co);
                        if (ci && co) setActiveSearchField('guests');
                        else if (ci && !co) setActiveSearchField('checkout');
                      }}
                    />
                  </div>
                )}

                {/* Guests dropdown */}
                {activeSearchField === 'guests' && (
                  <div
                    className="absolute right-0 top-[calc(100%+8px)] bg-white dark:bg-[#1e1e1e] border border-[#dddddd] dark:border-[#3d3d3d] rounded-[24px] p-6 z-50 w-72"
                    style={{ boxShadow: 'rgba(0,0,0,0.15) 0 4px 24px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#222222] dark:text-[#f2f2f2]">Guests</p>
                        <p className="text-xs text-[#6a6a6a] dark:text-[#a8a8a8]">Ages 13 or above</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setGuests(Math.max(0, guests - 1)); }}
                          disabled={guests === 0}
                          className="w-8 h-8 rounded-full border border-[#dddddd] dark:border-[#3d3d3d] flex items-center justify-center hover:border-[#222222] dark:hover:border-[#f2f2f2] text-[#222222] dark:text-[#f2f2f2] disabled:opacity-30 transition-colors text-lg"
                        >−</button>
                        <span className="text-sm w-5 text-center text-[#222222] dark:text-[#f2f2f2] font-medium">{guests}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setGuests(guests + 1); }}
                          className="w-8 h-8 rounded-full border border-[#dddddd] dark:border-[#3d3d3d] flex items-center justify-center hover:border-[#222222] dark:hover:border-[#f2f2f2] text-[#222222] dark:text-[#f2f2f2] transition-colors text-lg"
                        >+</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Collapsed pill */
              <button
                onClick={() => setActiveSearchField('location')}
                className="w-full flex items-center bg-white dark:bg-[#1e1e1e] border border-[#dddddd] dark:border-[#3d3d3d] rounded-full shadow-sm hover:shadow-md transition-shadow text-left"
                style={{ height: '48px' }}
              >
                <Search size={14} className="ml-4 shrink-0 text-[#6a6a6a] dark:text-[#a8a8a8]" />
                <span className="flex-1 px-3 text-sm font-medium text-[#222222] dark:text-[#f2f2f2] truncate">
                  {searchLabel()}
                </span>
                <span className="mr-1.5 flex items-center justify-center w-8 h-8 rounded-full bg-[#ff385c] text-white shrink-0">
                  <Search size={13} />
                </span>
              </button>
            )}
          </div>

          {/* Mobile search button */}
          <button
            className="md:hidden flex items-center gap-2 border border-hairline bg-canvas text-ink rounded-full px-4 py-2 shadow-sm text-sm font-medium"
            onClick={() => setShowMobileSearch(true)}
          >
            <Search size={14} />
            <span>Search</span>
          </button>

          {/* Right side */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Notification bell — mounted guard prevents SSR/client mismatch */}
            {mounted && currentUser && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={handleOpenNotifications}
                  className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f7f7f7] dark:hover:bg-[#2c2c2c] transition-colors text-[#222222] dark:text-[#f2f2f2]"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-[#ff385c] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div
                    className="fixed left-2 right-2 top-[72px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white dark:bg-[#1e1e1e] border border-[#dddddd] dark:border-[#3d3d3d] rounded-[16px] z-50 overflow-hidden"
                    style={{ boxShadow: 'rgba(0,0,0,0.12) 0 2px 20px' }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#ebebeb] dark:border-[#2d2d2d]">
                      <h3 className="text-sm font-semibold text-[#222222] dark:text-[#f2f2f2]">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-[#ff385c] hover:underline font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* List */}
                    <div className="max-h-[360px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell size={28} className="text-[#dddddd] dark:text-[#3d3d3d] mx-auto mb-2" />
                          <p className="text-sm text-[#6a6a6a] dark:text-[#a8a8a8]">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <button
                            key={n.id}
                            onClick={async () => {
                              if (!n.is_read) await handleMarkRead(n.id);
                              if (n.link) {
                                setShowNotifications(false);
                                router.push(n.link);
                              }
                            }}
                            className={`w-full text-left px-4 py-3 border-b border-[#f2f2f2] dark:border-[#2d2d2d] last:border-0 transition-colors hover:bg-[#f7f7f7] dark:hover:bg-[#2c2c2c] ${
                              !n.is_read ? 'bg-[#fff8f8] dark:bg-[#1a1a1a]' : ''
                            } ${n.link ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <div className="flex items-start gap-2.5">
                              {!n.is_read && (
                                <div className="w-2 h-2 rounded-full bg-[#ff385c] shrink-0 mt-1.5" />
                              )}
                              <div className={!n.is_read ? '' : 'ml-4'}>
                                <p className="text-xs font-semibold text-[#222222] dark:text-[#f2f2f2] leading-snug">
                                  {n.title}
                                </p>
                                <p className="text-xs text-[#6a6a6a] dark:text-[#a8a8a8] mt-0.5 leading-snug line-clamp-2">
                                  {n.message}
                                </p>
                                <p className="text-[10px] text-[#929292] dark:text-[#6e6e6e] mt-1">
                                  {new Date(n.created_at).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f7f7f7] dark:hover:bg-[#2c2c2c] transition-colors text-[#222222] dark:text-[#f2f2f2]"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-2 border border-hairline rounded-full px-3 py-2 hover:shadow-md transition-shadow bg-canvas"
              >
                <Menu size={18} className="text-ink" />
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
                  {mounted && currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : mounted && currentUser ? (
                    currentUser.name[0].toUpperCase()
                  ) : (
                    <User size={16} />
                  )}
                </div>
              </button>

              {mounted && showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-canvas border border-hairline rounded-[12px] py-1 z-50" style={{ boxShadow: 'rgba(0,0,0,0.12) 0 2px 16px' }}>
                  {currentUser ? (
                    <>
                      <div className="px-4 py-3 border-b border-hairline-soft">
                        <p className="text-sm font-semibold text-ink">{currentUser.name}</p>
                        <p className="text-xs text-muted">{currentUser.email}</p>
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-surface-strong text-muted">
                          {currentUser.role}
                        </span>
                      </div>
                      <div className="px-2 py-1">
                        <Link href="/trips" className="block px-2 py-2 text-sm text-ink hover:bg-surface-soft rounded-lg transition-colors" onClick={() => setShowUserMenu(false)}>My trips</Link>
                        <button
                          className="w-full text-left flex items-center gap-2 px-2 py-2 text-sm text-ink hover:bg-surface-soft rounded-lg transition-colors"
                          onClick={() => { setShowUserMenu(false); window.dispatchEvent(new CustomEvent('open-chat')); }}
                        >
                          <MessageCircle size={15} />
                          Messages
                        </button>
                        <Link href="/wishlist" className="block px-2 py-2 text-sm text-ink hover:bg-surface-soft rounded-lg transition-colors" onClick={() => setShowUserMenu(false)}>Wishlists</Link>
                        {currentUser.role === 'HOST' && (
                          <Link href="/hosting" className="block px-2 py-2 text-sm text-ink hover:bg-surface-soft rounded-lg transition-colors" onClick={() => setShowUserMenu(false)}>Host dashboard</Link>
                        )}
                      </div>
                      <div className="border-t border-hairline-soft px-2 py-1">
                        <button onClick={() => { logout(); setShowUserMenu(false); }} className="w-full text-left px-2 py-2 text-sm text-ink hover:bg-surface-soft rounded-lg transition-colors">
                          Log out
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="px-2 py-1">
                        <button onClick={() => openAuth('signup')} className="w-full text-left px-2 py-2 text-sm font-semibold text-ink hover:bg-surface-soft rounded-lg transition-colors">Sign up</button>
                        <button onClick={() => openAuth('login')} className="w-full text-left px-2 py-2 text-sm text-ink hover:bg-surface-soft rounded-lg transition-colors">Log in</button>
                      </div>
                      <div className="border-t border-hairline-soft px-2 py-1">
                        <Link href="/hosting" className="block px-2 py-2 text-sm text-ink hover:bg-surface-soft rounded-lg transition-colors" onClick={() => setShowUserMenu(false)}>Airbnb your home</Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search overlay */}
        {showMobileSearch && (
          <div className="fixed inset-0 bg-white dark:bg-[#161616] z-50 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setShowMobileSearch(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#2c2c2c] text-[#222222] dark:text-[#f2f2f2] text-lg"
                >✕</button>
                <h2 className="text-base font-semibold text-[#222222] dark:text-[#f2f2f2]">Search</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#6a6a6a] dark:text-[#a8a8a8] mb-1.5 uppercase tracking-widest">Where</label>
                  <input
                    type="text"
                    placeholder="Search destinations"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full border border-[#dddddd] dark:border-[#3d3d3d] bg-white dark:bg-[#1e1e1e] text-[#222222] dark:text-[#f2f2f2] rounded-[12px] px-4 py-3.5 text-sm outline-none focus:border-[#222222] dark:focus:border-[#f2f2f2] placeholder:text-[#b0b0b0] transition-colors"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6a6a6a] dark:text-[#a8a8a8] mb-1.5 uppercase tracking-widest">When</label>
                  <div className="border border-[#dddddd] dark:border-[#3d3d3d] bg-white dark:bg-[#1e1e1e] rounded-[16px] p-4">
                    <DateRangePicker
                      checkIn={checkIn}
                      checkOut={checkOut}
                      onChange={(ci, co) => { setCheckIn(ci); setCheckOut(co); }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6a6a6a] dark:text-[#a8a8a8] mb-1.5 uppercase tracking-widest">Who</label>
                  <div className="flex items-center justify-between border border-[#dddddd] dark:border-[#3d3d3d] bg-white dark:bg-[#1e1e1e] rounded-[12px] px-4 py-3.5">
                    <span className="text-sm text-[#222222] dark:text-[#f2f2f2]">
                      {guests > 0 ? `${guests} guest${guests > 1 ? 's' : ''}` : 'Add guests'}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setGuests(Math.max(0, guests - 1))}
                        disabled={guests === 0}
                        className="w-8 h-8 rounded-full border border-[#dddddd] dark:border-[#3d3d3d] flex items-center justify-center text-[#222222] dark:text-[#f2f2f2] disabled:opacity-30 hover:border-[#222222] dark:hover:border-[#f2f2f2] transition-colors"
                      >−</button>
                      <span className="text-sm font-medium text-[#222222] dark:text-[#f2f2f2] w-4 text-center">{guests}</span>
                      <button
                        onClick={() => setGuests(guests + 1)}
                        className="w-8 h-8 rounded-full border border-[#dddddd] dark:border-[#3d3d3d] flex items-center justify-center text-[#222222] dark:text-[#f2f2f2] hover:border-[#222222] dark:hover:border-[#f2f2f2] transition-colors"
                      >+</button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSearch}
                className="mt-6 w-full bg-[#ff385c] hover:bg-[#e00b41] text-white rounded-[12px] py-4 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Search size={16} />
                Search
              </button>
            </div>
          </div>
        )}
      </header>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} initialMode={authMode} />}
    </>
  );
}
