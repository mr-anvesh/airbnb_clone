'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, CreditCard, Lock } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/navigation/Header';
import { getListing, checkAvailability, createBooking } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import type { ListingDetail, PriceBreakdown } from '@/types';

function ConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const listingId = Number(searchParams.get('listing_id'));
  const checkIn = searchParams.get('check_in') || '';
  const checkOut = searchParams.get('check_out') || '';
  const guests = Number(searchParams.get('guests') || 1);

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [guestCount] = useState(guests);

  useEffect(() => {
    if (!listingId) return;
    Promise.all([
      getListing(listingId),
      checkIn && checkOut ? checkAvailability(listingId, checkIn, checkOut) : Promise.resolve(null),
    ])
      .then(([l, avail]) => {
        setListing(l);
        setBreakdown(avail?.price_breakdown || null);
      })
      .catch(() => showToast('Failed to load booking details', 'error'))
      .finally(() => setLoading(false));
  }, [listingId, checkIn, checkOut]);

  const handleConfirm = async () => {
    if (!listingId || !checkIn || !checkOut) {
      showToast('Missing booking details', 'error');
      return;
    }
    setBooking(true);
    try {
      await createBooking({ listing_id: listingId, check_in: checkIn, check_out: checkOut, guests: guestCount });
      showToast('Booking confirmed!', 'success');
      router.push('/trips');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking failed';
      showToast(msg.includes('not available') ? 'These dates are no longer available' : msg, 'error');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-16 flex justify-center">
        <div className="animate-pulse text-muted">Loading booking details...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-16 text-center">
        <p className="text-ink mb-4">Could not load listing.</p>
        <Link href="/" className="text-primary hover:underline text-sm">Back to home</Link>
      </div>
    );
  }

  const imgUrl = listing.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80';
  const nights = breakdown?.nights || (checkIn && checkOut ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000) : 0);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <Link href={`/listings/${listingId}`} className="inline-flex items-center gap-2 text-sm text-ink hover:underline mb-6">
        <ArrowLeft size={16} /> Back
      </Link>

      <h1 className="text-[28px] font-bold text-ink mb-8">Confirm and pay</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: booking form */}
        <div>
          {/* Trip details */}
          <div className="border border-hairline rounded-[14px] p-6 mb-6">
            <h2 className="text-[21px] font-semibold text-ink mb-4">Your trip</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-ink">Dates</p>
                <p className="text-sm text-muted">
                  {checkIn ? new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '–'}
                  {' – '}
                  {checkOut ? new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '–'}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Guests</p>
                <p className="text-sm text-muted">{guestCount} guest{guestCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Mock payment */}
          <div className="border border-hairline rounded-[14px] p-6 mb-6">
            <h2 className="text-[21px] font-semibold text-ink mb-4">Pay with</h2>
            <div className="border border-ink rounded-[8px] p-4 flex items-center gap-3">
              <CreditCard size={20} className="text-ink" />
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">•••• •••• •••• 4242</p>
                <p className="text-xs text-muted">Visa · Expires 12/28</p>
              </div>
              <span className="text-xs bg-surface-soft px-2 py-1 rounded text-muted">Demo</span>
            </div>
            <p className="text-xs text-muted mt-3">
              This is a demo payment. No real charge will be made.
            </p>
          </div>

          {/* Cancellation policy */}
          <div className="border border-hairline rounded-[14px] p-6 mb-6">
            <h2 className="text-[21px] font-semibold text-ink mb-2">Cancellation policy</h2>
            <p className="text-sm text-body-text">
              Free cancellation before check-in. This booking is for demonstration purposes.
            </p>
          </div>

          {/* Ground rules */}
          <div className="mb-8">
            <p className="text-xs text-muted">
              By selecting the button below, I agree to the Host&apos;s House Rules, Ground rules for guests,
              Airbnb&apos;s Rebooking and Refund Policy, and that Airbnb can charge my payment method if I&apos;m responsible for damage.
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handleConfirm}
            disabled={booking}
            className="w-full bg-primary hover:bg-primary-active text-white font-semibold rounded-[8px] py-4 text-base transition-colors disabled:bg-primary-disabled disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {booking ? (
              'Confirming...'
            ) : (
              <>
                <Lock size={16} />
                Confirm and pay
              </>
            )}
          </button>
        </div>

        {/* Right: listing summary card */}
        <div>
          <div className="border border-hairline rounded-[14px] p-6 sticky top-24">
            {/* Listing */}
            <div className="flex gap-4 pb-6 border-b border-hairline-soft">
              <div className="w-28 h-20 rounded-[8px] overflow-hidden bg-surface-strong shrink-0">
                <img src={imgUrl} alt={listing.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted capitalize">{listing.property_type.toLowerCase()}</p>
                <p className="text-sm font-medium text-ink line-clamp-2">{listing.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star size={11} className="fill-ink text-ink" />
                  <span className="text-xs text-ink">{listing.rating.toFixed(2)}</span>
                  <span className="text-xs text-muted">· {listing.review_count} reviews</span>
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="pt-6 space-y-3">
              <h3 className="text-[21px] font-semibold text-ink mb-4">Price details</h3>
              {breakdown ? (
                <>
                  <div className="flex justify-between text-sm text-ink">
                    <span>${listing.price_per_night.toFixed(0)} × {breakdown.nights} night{breakdown.nights !== 1 ? 's' : ''}</span>
                    <span>${breakdown.nightly_subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-ink">
                    <span>Cleaning fee</span>
                    <span>${breakdown.cleaning_fee.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-ink">
                    <span>Airbnb service fee</span>
                    <span>${breakdown.service_fee.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-ink pt-3 border-t border-hairline-soft">
                    <span>Total (USD)</span>
                    <span>${breakdown.total.toFixed(0)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm text-ink">
                    <span>${listing.price_per_night.toFixed(0)} × {nights} night{nights !== 1 ? 's' : ''}</span>
                    <span>${(listing.price_per_night * nights).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-ink pt-3 border-t border-hairline-soft">
                    <span>Estimated total</span>
                    <span>${(listing.price_per_night * nights).toFixed(0)}+</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Suspense><Header /></Suspense>
      <Suspense fallback={<div className="p-16 text-center text-muted">Loading...</div>}>
        <ConfirmContent />
      </Suspense>
    </div>
  );
}
