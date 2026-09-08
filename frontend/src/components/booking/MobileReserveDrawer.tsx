'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import ReservationCard from './ReservationCard';

interface Props {
  listingId: number;
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  maxGuests: number;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
}

export default function MobileReserveDrawer({
  listingId,
  pricePerNight,
  rating,
  reviewCount,
  maxGuests,
  initialCheckIn = '',
  initialCheckOut = '',
  initialGuests = 1,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Fixed bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-canvas border-t border-hairline px-6 py-4 z-40">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-semibold text-ink">${pricePerNight.toFixed(0)}</span>
            <span className="text-muted text-sm"> night</span>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="bg-primary text-white font-semibold rounded-[8px] px-6 py-3 text-sm hover:bg-primary-active transition-colors"
          >
            Reserve
          </button>
        </div>
      </div>

      {/* Bottom sheet overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div className="relative bg-canvas rounded-t-[20px] w-full max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <h2 className="text-base font-semibold text-ink">Reserve</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-soft transition-colors text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-4 pb-8">
              <ReservationCard
                listingId={listingId}
                pricePerNight={pricePerNight}
                rating={rating}
                reviewCount={reviewCount}
                maxGuests={maxGuests}
                initialCheckIn={initialCheckIn}
                initialCheckOut={initialCheckOut}
                initialGuests={initialGuests}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
