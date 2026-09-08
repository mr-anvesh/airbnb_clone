'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Minus, Plus, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { checkAvailability } from '@/lib/api';
import type { PriceBreakdown } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import DateRangePicker from '@/components/search/DateRangePicker';

interface ReservationCardProps {
  listingId: number;
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  maxGuests: number;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
}

export default function ReservationCard({
  listingId,
  pricePerNight,
  rating,
  reviewCount,
  maxGuests,
  initialCheckIn = '',
  initialCheckOut = '',
  initialGuests = 1,
}: ReservationCardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [guests, setGuests] = useState(initialGuests);
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);


  const handleCheckAvailability = async () => {
    if (!checkIn || !checkOut) {
      showToast('Please select check-in and check-out dates', 'error');
      return;
    }
    setChecking(true);
    try {
      const res = await checkAvailability(listingId, checkIn, checkOut);
      setAvailable(res.available);
      setBreakdown(res.price_breakdown);
      if (!res.available) showToast('These dates are not available', 'error');
    } catch {
      showToast('Failed to check availability', 'error');
    } finally {
      setChecking(false);
    }
  };

  const handleReserve = () => {
    if (!checkIn || !checkOut) {
      showToast('Please select dates', 'error');
      return;
    }
    const params = new URLSearchParams({
      listing_id: String(listingId),
      check_in: checkIn,
      check_out: checkOut,
      guests: String(guests),
    });
    router.push(`/booking/confirm?${params.toString()}`);
  };

  useEffect(() => {
    if (checkIn && checkOut) {
      setBreakdown(null);
      setAvailable(null);
    }
  }, [checkIn, checkOut]);

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div
      className="bg-canvas rounded-[14px] border border-hairline p-6"
      style={{ boxShadow: 'rgba(0,0,0,0.12) 0 6px 16px' }}
    >
      {/* Price + rating */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <span className="text-[22px] font-semibold text-ink">${pricePerNight.toFixed(0)}</span>
          <span className="text-muted text-base"> night</span>
        </div>
        {rating > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <Star size={13} className="fill-ink text-ink" />
            <span className="font-semibold text-ink">{rating.toFixed(2)}</span>
            <span className="text-muted">· {reviewCount} reviews</span>
          </div>
        )}
      </div>

      {/* Date picker trigger */}
      <div className="mb-3 relative" ref={calendarRef}>
        <button
          onClick={() => setShowCalendar(v => !v)}
          className="w-full border border-[#dddddd] dark:border-[#3d3d3d] rounded-[8px] overflow-hidden hover:border-[#222222] dark:hover:border-[#f2f2f2] transition-colors"
        >
          <div className="grid grid-cols-2 divide-x divide-[#dddddd] dark:divide-[#3d3d3d]">
            <div className="p-3 text-left">
              <p className="text-[9px] font-bold text-[#222222] dark:text-[#f2f2f2] uppercase tracking-widest mb-1">Check-in</p>
              <p className={`text-sm font-medium ${checkIn ? 'text-[#222222] dark:text-[#f2f2f2]' : 'text-[#b0b0b0] dark:text-[#5a5a5a]'}`}>
                {checkIn ? format(parseISO(checkIn), 'MMM d, yyyy') : 'Add date'}
              </p>
            </div>
            <div className="p-3 text-left">
              <p className="text-[9px] font-bold text-[#222222] dark:text-[#f2f2f2] uppercase tracking-widest mb-1">Checkout</p>
              <p className={`text-sm font-medium ${checkOut ? 'text-[#222222] dark:text-[#f2f2f2]' : 'text-[#b0b0b0] dark:text-[#5a5a5a]'}`}>
                {checkOut ? format(parseISO(checkOut), 'MMM d, yyyy') : 'Add date'}
              </p>
            </div>
          </div>
        </button>

        {/* Calendar dropdown */}
        {showCalendar && (
          <div
            className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+6px)] bg-white dark:bg-[#1e1e1e] border border-[#dddddd] dark:border-[#3d3d3d] rounded-[20px] p-4 z-50 shadow-xl"
            style={{ width: '520px', maxWidth: '95vw' }}
          >
            <DateRangePicker
              checkIn={checkIn}
              checkOut={checkOut}
              onChange={(ci, co) => {
                setCheckIn(ci);
                setCheckOut(co);
                setBreakdown(null);
                setAvailable(null);
                if (ci && co) setShowCalendar(false);
              }}
            />
          </div>
        )}

      </div>

      {/* Guests */}
      <div className="border border-[#dddddd] dark:border-[#3d3d3d] rounded-[8px] p-3 mb-3 relative">
        <label className="block text-[9px] font-bold text-[#222222] dark:text-[#f2f2f2] uppercase tracking-widest mb-1">
          Guests
        </label>
        <button
          onClick={() => setShowGuestPicker((v) => !v)}
          className="flex items-center justify-between w-full text-sm text-[#222222] dark:text-[#f2f2f2]"
        >
          <span>{guests} guest{guests !== 1 ? 's' : ''}</span>
          <ChevronDown size={16} className={showGuestPicker ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {showGuestPicker && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1e1e1e] border border-[#dddddd] dark:border-[#3d3d3d] rounded-[12px] p-4 shadow-lg z-10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#222222] dark:text-[#f2f2f2]">Guests</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGuests(Math.max(1, guests - 1))}
                  className="w-8 h-8 rounded-full border border-[#dddddd] dark:border-[#3d3d3d] flex items-center justify-center hover:border-[#222222] dark:hover:border-[#f2f2f2] transition-colors text-[#222222] dark:text-[#f2f2f2]"
                >
                  <Minus size={14} />
                </button>
                <span className="text-sm w-4 text-center text-[#222222] dark:text-[#f2f2f2]">{guests}</span>
                <button
                  onClick={() => setGuests(Math.min(maxGuests, guests + 1))}
                  className="w-8 h-8 rounded-full border border-[#dddddd] dark:border-[#3d3d3d] flex items-center justify-center hover:border-[#222222] dark:hover:border-[#f2f2f2] transition-colors text-[#222222] dark:text-[#f2f2f2]"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-[#6a6a6a] dark:text-[#a8a8a8] mt-2">Max {maxGuests} guests</p>
          </div>
        )}
      </div>

      {/* CTA buttons */}
      {!breakdown ? (
        <button
          onClick={handleCheckAvailability}
          disabled={checking || !checkIn || !checkOut}
          className="w-full bg-primary hover:bg-primary-active text-white font-semibold rounded-[8px] py-3.5 text-base transition-colors disabled:bg-primary-disabled disabled:cursor-not-allowed"
        >
          {checking ? 'Checking...' : 'Check availability'}
        </button>
      ) : available ? (
        <button
          onClick={handleReserve}
          className="w-full bg-primary hover:bg-primary-active text-white font-semibold rounded-[8px] py-3.5 text-base transition-colors"
        >
          Reserve
        </button>
      ) : (
        <button
          disabled
          className="w-full bg-primary-disabled text-white font-semibold rounded-[8px] py-3.5 text-base cursor-not-allowed"
        >
          Not available
        </button>
      )}

      <p className="text-center text-sm text-muted mt-3">You won&apos;t be charged yet</p>

      {/* Price breakdown */}
      {breakdown && available && (
        <div className="mt-4 pt-4 border-t border-hairline-soft space-y-3">
          <div className="flex justify-between text-sm text-ink">
            <span>${pricePerNight.toFixed(0)} × {breakdown.nights} night{breakdown.nights !== 1 ? 's' : ''}</span>
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
            <span>Total before taxes</span>
            <span>${breakdown.total.toFixed(0)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
