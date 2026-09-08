'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Heart, Star } from 'lucide-react';
import Header from '@/components/navigation/Header';
import { getWishlist, removeFromWishlist } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import type { WishlistWithListing } from '@/types';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80';

export default function WishlistPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<WishlistWithListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  useEffect(() => {
    getWishlist()
      .then(setItems)
      .catch(() => showToast('Failed to load wishlist', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (listingId: number) => {
    setRemoving(listingId);
    try {
      await removeFromWishlist(listingId);
      setItems((prev) => prev.filter((i) => i.listing_id !== listingId));
      showToast('Removed from wishlist');
    } catch {
      showToast('Failed to remove', 'error');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Suspense><Header /></Suspense>
      <main className="max-w-[1280px] mx-auto px-6 py-10">
        <h1 className="text-[28px] font-bold text-ink mb-2">Wishlists</h1>
        <p className="text-muted text-sm mb-8">Your saved places</p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] rounded-[14px] bg-surface-strong" />
                <div className="mt-3 space-y-2">
                  <div className="h-4 bg-surface-strong rounded w-3/4" />
                  <div className="h-3 bg-surface-strong rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <Heart size={48} className="text-hairline mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-ink mb-2">No saved places yet</h2>
            <p className="text-muted text-sm mb-6">
              As you search, click the heart icon to save your favourite places
            </p>
            <Link href="/" className="bg-primary text-white font-semibold rounded-[8px] px-6 py-3 text-sm hover:bg-primary-active transition-colors">
              Start exploring
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {items.map((item) => (
              <div key={item.id} className="group">
                <div className="relative">
                  <Link href={`/listings/${item.listing_id}`}>
                    <div className="relative overflow-hidden rounded-[14px] aspect-[4/3] bg-surface-strong">
                      <img
                        src={item.listing_image || PLACEHOLDER}
                        alt={item.listing_title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                      />
                    </div>
                  </Link>
                  <button
                    onClick={() => handleRemove(item.listing_id)}
                    disabled={removing === item.listing_id}
                    className="absolute top-3 right-3 p-1.5 disabled:opacity-50"
                    aria-label="Remove from wishlist"
                  >
                    <Heart size={22} className="fill-primary text-primary" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="mt-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link href={`/listings/${item.listing_id}`} className="text-sm font-semibold text-ink truncate block hover:underline">
                        {item.listing_title}
                      </Link>
                      <p className="text-sm text-muted truncate">{item.listing_location}</p>
                    </div>
                    {item.listing_rating > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Star size={13} className="fill-ink text-ink" />
                        <span className="text-sm font-medium text-ink">{item.listing_rating.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink">
                    <span className="font-semibold">${item.listing_price.toFixed(0)}</span>
                    <span className="text-muted"> night</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
