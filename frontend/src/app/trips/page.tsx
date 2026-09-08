'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Users, XCircle } from 'lucide-react';
import Header from '@/components/navigation/Header';
import { getMyBookings, cancelBooking } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import type { BookingWithListing, BookingStatus } from '@/types';

const STATUS_STYLES: Record<BookingStatus, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-surface-strong text-muted',
  COMPLETED: 'bg-blue-100 text-blue-800',
};

const PLACEHOLDER = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80';

export default function TripsPage() {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<BookingWithListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<number | null>(null);

  useEffect(() => {
    getMyBookings()
      .then(setBookings)
      .catch(() => showToast('Failed to load trips', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this booking?')) return;
    setCancelling(id);
    try {
      const updated = await cancelBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: updated.status } : b)));
      showToast('Booking cancelled', 'success');
    } catch {
      showToast('Failed to cancel booking', 'error');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Suspense><Header /></Suspense>
      <main className="max-w-[1280px] mx-auto px-6 py-10">
        <h1 className="text-[28px] font-bold text-ink mb-2">Trips</h1>
        <p className="text-muted text-sm mb-8">Your upcoming and past trips</p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-surface-strong animate-pulse rounded-[14px]" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🧳</div>
            <h2 className="text-xl font-semibold text-ink mb-2">No trips yet</h2>
            <p className="text-muted text-sm mb-6">Time to start planning your next adventure</p>
            <Link href="/" className="bg-primary text-white font-semibold rounded-[8px] px-6 py-3 text-sm hover:bg-primary-active transition-colors">
              Start exploring
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="flex gap-5 border border-hairline rounded-[14px] overflow-hidden hover:shadow-md transition-shadow">
                <div className="w-40 h-32 shrink-0 bg-surface-strong">
                  <img
                    src={b.listing_image || PLACEHOLDER}
                    alt={b.listing_title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                  />
                </div>
                <div className="flex-1 py-4 pr-4 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/listings/${b.listing_id}`} className="text-base font-semibold text-ink hover:underline truncate block">
                        {b.listing_title}
                      </Link>
                      <div className="flex items-center gap-1 text-xs text-muted mt-0.5">
                        <MapPin size={11} />
                        <span>{b.listing_location}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[b.status]}`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted">
                    <div className="flex items-center gap-1">
                      <Calendar size={13} />
                      <span>
                        {new Date(b.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' – '}
                        {new Date(b.check_out).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={13} />
                      <span>{b.guests} guest{b.guests !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm font-semibold text-ink">${b.total_price.toFixed(0)} total</p>
                    {b.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={cancelling === b.id}
                        className="flex items-center gap-1 text-sm text-primary-error hover:underline disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        {cancelling === b.id ? 'Cancelling...' : 'Cancel booking'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
