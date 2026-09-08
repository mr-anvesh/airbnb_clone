'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Edit3, Trash2, Star, Home, Calendar } from 'lucide-react';
import Header from '@/components/navigation/Header';
import { getHostListings, getHostBookings, deleteListing } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import type { ListingCard, BookingResponse } from '@/types';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80';

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-surface-strong text-muted',
  COMPLETED: 'bg-blue-100 text-blue-800',
  PENDING:   'bg-yellow-100 text-yellow-800',
};

function HostingContent() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlTab       = searchParams.get('tab') as 'listings' | 'bookings' | null;
  const urlBookingId = searchParams.get('booking_id') ? Number(searchParams.get('booking_id')) : null;
  const urlListingId = searchParams.get('listing_id') ? Number(searchParams.get('listing_id')) : null;

  const [listings, setListings]   = useState<ListingCard[]>([]);
  const [bookings, setBookings]   = useState<BookingResponse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'listings' | 'bookings'>(urlTab || 'listings');

  // Refs for scrolling to a highlighted booking row
  const bookingRowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    Promise.all([getHostListings(), getHostBookings()])
      .then(([l, b]) => { setListings(l); setBookings(b); })
      .catch(() => showToast('Failed to load dashboard', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // When URL params arrive (from notification click), switch tab and scroll
  useEffect(() => {
    if (urlTab) setActiveTab(urlTab);
  }, [urlTab]);

  useEffect(() => {
    if (!urlBookingId || loading) return;
    // Give the DOM a tick to render the booking rows
    const timer = setTimeout(() => {
      const el = bookingRowRefs.current[urlBookingId];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => clearTimeout(timer);
  }, [urlBookingId, loading, activeTab]);

  const switchTab = (tab: 'listings' | 'bookings') => {
    setActiveTab(tab);
    // Keep other params but clear booking/listing highlight when manually switching
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    params.delete('booking_id');
    params.delete('listing_id');
    router.replace(`/hosting?${params.toString()}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
      showToast('Listing deleted', 'success');
    } catch {
      showToast('Failed to delete listing', 'error');
    } finally {
      setDeleting(null);
    }
  };

  if (currentUser && currentUser.role !== 'HOST') {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-ink mb-4">Host access required</h1>
        <p className="text-muted mb-6">Sign up as a host to access the dashboard.</p>
        <Link href="/" className="text-primary hover:underline text-sm">Back to home</Link>
      </div>
    );
  }

  return (
    <main className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-ink">Host dashboard</h1>
          <p className="text-muted text-sm mt-1">Welcome back, {currentUser?.name}</p>
        </div>
        <Link
          href="/hosting/listings/create"
          className="flex items-center gap-2 bg-primary hover:bg-primary-active text-white font-semibold rounded-[8px] px-5 py-3 text-sm transition-colors"
        >
          <Plus size={16} /> New listing
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="border border-hairline rounded-[14px] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-disabled flex items-center justify-center">
              <Home size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{listings.length}</p>
              <p className="text-xs text-muted">Total listings</p>
            </div>
          </div>
        </div>
        <div className="border border-hairline rounded-[14px] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-soft flex items-center justify-center">
              <Calendar size={18} className="text-ink" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{bookings.filter(b => b.status === 'CONFIRMED').length}</p>
              <p className="text-xs text-muted">Active bookings</p>
            </div>
          </div>
        </div>
        <div className="border border-hairline rounded-[14px] p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-soft flex items-center justify-center">
              <Star size={18} className="text-ink" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">
                {listings.length > 0
                  ? (listings.reduce((s, l) => s + l.rating, 0) / listings.length).toFixed(2)
                  : '–'}
              </p>
              <p className="text-xs text-muted">Avg rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-hairline-soft mb-6">
        <div className="flex gap-8">
          {(['listings', 'bookings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`pb-3 text-sm font-semibold capitalize border-b-2 transition-colors ${
                activeTab === tab ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {tab} ({tab === 'listings' ? listings.length : bookings.length})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-surface-strong animate-pulse rounded-[14px]" />)}
        </div>
      ) : activeTab === 'listings' ? (
        listings.length === 0 ? (
          <div className="text-center py-16">
            <Home size={40} className="text-hairline mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-ink mb-2">No listings yet</h3>
            <p className="text-muted text-sm mb-6">Create your first listing to start hosting</p>
            <Link href="/hosting/listings/create" className="bg-primary text-white font-semibold rounded-[8px] px-6 py-3 text-sm hover:bg-primary-active transition-colors">
              Create listing
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map(listing => (
              <div key={listing.id} className="flex gap-4 border border-hairline rounded-[14px] overflow-hidden hover:shadow-md transition-shadow">
                <div className="w-32 h-24 shrink-0 bg-surface-strong">
                  <img
                    src={listing.images?.[0]?.image_url || PLACEHOLDER}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                  />
                </div>
                <div className="flex-1 py-3 pr-4 flex items-center justify-between gap-4 min-w-0">
                  <div className="min-w-0">
                    <Link href={`/listings/${listing.id}`} className="text-base font-semibold text-ink hover:underline truncate block">
                      {listing.title}
                    </Link>
                    <p className="text-xs text-muted mt-0.5">{listing.location}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm font-semibold text-ink">${listing.price_per_night.toFixed(0)}/night</span>
                      {listing.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star size={11} className="fill-ink text-ink" />
                          <span className="text-xs text-ink">{listing.rating.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/hosting/listings/${listing.id}/edit`}
                      className="flex items-center gap-1.5 text-sm text-ink border border-hairline rounded-[8px] px-3 py-2 hover:bg-surface-soft transition-colors"
                    >
                      <Edit3 size={14} /> Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(listing.id)}
                      disabled={deleting === listing.id}
                      className="flex items-center gap-1.5 text-sm text-primary-error border border-hairline rounded-[8px] px-3 py-2 hover:bg-surface-soft transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      {deleting === listing.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        bookings.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={40} className="text-hairline mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-ink mb-2">No bookings yet</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => {
              const isHighlighted = urlBookingId === b.id ||
                (urlListingId != null && b.listing_id === urlListingId);
              return (
                <div
                  key={b.id}
                  ref={el => { bookingRowRefs.current[b.id] = el; }}
                  className={`flex items-center justify-between border rounded-[14px] p-4 transition-all duration-500 ${
                    isHighlighted
                      ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/30'
                      : 'border-hairline hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink">Booking #{b.id}</p>
                      {isHighlighted && (
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(b.check_in).toLocaleDateString()} – {new Date(b.check_out).toLocaleDateString()}
                      {' · '}{b.guests} guest{b.guests !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-ink">${b.total_price.toFixed(0)}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[b.status] || 'bg-surface-strong text-muted'}`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </main>
  );
}

export default function HostingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Suspense><Header /></Suspense>
      <Suspense fallback={
        <div className="max-w-[1280px] mx-auto px-6 py-10 space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-surface-strong animate-pulse rounded-[14px]" />)}
        </div>
      }>
        <HostingContent />
      </Suspense>
    </div>
  );
}
