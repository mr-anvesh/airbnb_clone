'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ListingCard as ListingCardType } from '@/types';
import { addToWishlist, removeFromWishlist } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

interface ListingCardProps {
  listing: ListingCardType;
  isWishlisted?: boolean;
  checkIn?: string;
  checkOut?: string;
}

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80',
  'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=600&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80',
  'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=600&q=80',
];

function getPlaceholder(id: number) {
  return PLACEHOLDER_IMAGES[id % PLACEHOLDER_IMAGES.length];
}

export default function ListingCard({ listing, isWishlisted = false, checkIn, checkOut }: ListingCardProps) {
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const [wishlisted, setWishlisted] = useState(isWishlisted);
  const [imgIndex, setImgIndex] = useState(0);

  const images = listing.images?.length > 0
    ? listing.images.map(i => i.image_url)
    : [getPlaceholder(listing.id)];

  const isGuestFavorite = listing.rating >= 4.8 && listing.review_count >= 5;

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      showToast('Sign in to save listings', 'error');
      return;
    }
    try {
      if (wishlisted) {
        await removeFromWishlist(listing.id);
        setWishlisted(false);
        showToast('Removed from wishlist');
      } else {
        await addToWishlist(listing.id);
        setWishlisted(true);
        showToast('Saved to wishlist', 'success');
      }
    } catch {
      showToast('Failed to update wishlist', 'error');
    }
  };

  const prevImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImgIndex(i => (i - 1 + images.length) % images.length);
  };

  const nextImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImgIndex(i => (i + 1) % images.length);
  };

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Link href={`/listings/${listing.id}${checkIn ? `?check_in=${checkIn}&check_out=${checkOut}` : ''}`} className="group block">
      <div>
        {/* Image */}
        <div className="relative overflow-hidden rounded-[14px] aspect-[4/3] bg-[#e5e5e5] dark:bg-[#2c2c2c]">
          <img
            src={images[imgIndex]}
            alt={listing.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            onError={(e) => { (e.target as HTMLImageElement).src = getPlaceholder(listing.id); }}
          />

          {/* Carousel nav */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImg}
                className={`absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm transition-opacity ${imgIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <ChevronLeft size={14} className="text-[#222222]" />
              </button>
              <button
                onClick={nextImg}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm transition-opacity ${imgIndex === images.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <ChevronRight size={14} className="text-[#222222]" />
              </button>
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {images.map((_, i) => (
                  <div key={i} className={`rounded-full transition-all ${i === imgIndex ? 'w-1.5 h-1.5 bg-white' : 'w-1 h-1 bg-white/60'}`} />
                ))}
              </div>
            </>
          )}

          {/* Guest favorite */}
          {isGuestFavorite && (
            <div className="absolute top-3 left-3 bg-white text-[#222222] text-[11px] font-semibold rounded-full px-2.5 py-1 shadow-sm">
              Guest favorite
            </div>
          )}

          {/* Heart */}
          <button
            onClick={toggleWishlist}
            className="absolute top-3 right-3 p-1.5 transition-transform hover:scale-110"
            aria-label="Save to wishlist"
          >
            <Heart
              size={22}
              className={wishlisted ? 'fill-[#ff385c] text-[#ff385c]' : 'fill-black/25 text-white'}
              strokeWidth={1.5}
            />
          </button>
        </div>

        {/* Meta */}
        <div className="mt-3 px-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#222222] dark:text-[#f2f2f2] truncate leading-snug">
                {listing.title}
              </p>
              <p className="text-sm text-[#6a6a6a] dark:text-[#a8a8a8] truncate mt-0.5">
                {listing.location}
              </p>
              {nights ? (
                <p className="text-sm text-[#6a6a6a] dark:text-[#a8a8a8] mt-0.5">
                  {new Date(checkIn!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' – '}
                  {new Date(checkOut!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              ) : (
                <p className="text-sm text-[#6a6a6a] dark:text-[#a8a8a8] capitalize mt-0.5">
                  {listing.property_type.toLowerCase()}
                </p>
              )}
            </div>
            {listing.rating > 0 && (
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                <Star size={12} className="fill-[#222222] dark:fill-[#f2f2f2] text-[#222222] dark:text-[#f2f2f2]" />
                <span className="text-sm font-medium text-[#222222] dark:text-[#f2f2f2]">
                  {listing.rating.toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <p className="mt-1.5 text-sm text-[#222222] dark:text-[#f2f2f2]">
            <span className="font-semibold">${listing.price_per_night.toLocaleString()}</span>
            <span className="text-[#6a6a6a] dark:text-[#a8a8a8] font-normal"> night</span>
            {nights && (
              <span className="text-[#6a6a6a] dark:text-[#a8a8a8] font-normal">
                {' · '}${(listing.price_per_night * nights).toLocaleString()} total
              </span>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
