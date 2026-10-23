import { Suspense } from 'react';
import Link from 'next/link'; // used for back link
import { ArrowLeft, Star, Home } from 'lucide-react';
import Header from '@/components/navigation/Header';
import ReservationCard from '@/components/booking/ReservationCard';
import MobileReserveDrawer from '@/components/booking/MobileReserveDrawer';
import MobileImageCarousel from '@/components/listing/MobileImageCarousel';
import DynamicMap from '@/components/map/DynamicMap';
import ContactHostButton from '@/components/chat/ContactHostButton';
import type { Review } from '@/types';
import { API_URL } from '@/lib/constants';

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
  'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
];

async function getListing(id: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/listings/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getReviews(id: string): Promise<Review[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/listings/${id}/reviews`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function getImg(url: string | undefined, fallbackId: number) {
  return url || PLACEHOLDER_IMAGES[fallbackId % PLACEHOLDER_IMAGES.length];
}

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ check_in?: string; check_out?: string; guests?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const listing = await getListing(id);
  const reviews = await getReviews(id);

  if (!listing) {
    return (
      <div className="min-h-screen bg-canvas">
        <Suspense><Header /></Suspense>
        <div className="max-w-[1440px] mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold text-ink mb-2">Listing not found</h1>
          <Link href="/" className="text-primary hover:underline text-sm">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const images = listing.images?.length > 0 ? listing.images : [];
  const mainImg = getImg(images[0]?.image_url, listing.id);
  const gridImgs = [1, 2, 3, 4].map((i) => getImg(images[i]?.image_url, listing.id + i));

  return (
    <div className="min-h-screen bg-canvas">
      <Suspense><Header /></Suspense>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-6">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink hover:underline mb-4">
          <ArrowLeft size={16} /> Back to listings
        </Link>

        {/* Title */}
        <h1 className="text-[22px] font-medium text-ink mb-2">{listing.title}</h1>
        <div className="flex items-center gap-2 text-sm mb-6">
          {listing.rating > 0 && (
            <>
              <Star size={13} className="fill-ink text-ink" />
              <span className="font-semibold text-ink">{listing.rating.toFixed(2)}</span>
              <span className="text-ink">·</span>
              <span className="underline text-ink cursor-pointer">{listing.review_count} reviews</span>
              <span className="text-ink">·</span>
            </>
          )}
          <span className="underline text-ink cursor-pointer">{listing.location}</span>
        </div>

        {/* Photos — swipeable carousel on mobile, 4-col grid on md+ */}
        <div className="mb-8">
          <div className="md:hidden">
            <MobileImageCarousel
              images={[mainImg, ...gridImgs]}
              title={listing.title}
            />
          </div>
          <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[420px] rounded-[12px] overflow-hidden">
            <div className="col-span-2 row-span-2 overflow-hidden">
              <img src={mainImg} alt={listing.title} className="w-full h-full object-cover" />
            </div>
            {gridImgs.map((img, i) => (
              <div key={i} className="overflow-hidden">
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Body: stacks on mobile, side-by-side on lg+ */}
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left col */}
          <div className="flex-1 min-w-0">
            {/* Host + meta */}
            <div className="flex items-center justify-between pb-6 border-b border-hairline-soft">
              <div>
                <h2 className="text-[20px] font-semibold text-ink">
                  {listing.property_type} hosted by {listing.host?.name}
                </h2>
                <p className="text-muted text-sm mt-1">
                  {listing.max_guests} guests · {listing.bedrooms} bedroom{listing.bedrooms !== 1 ? 's' : ''} · {listing.beds} bed{listing.beds !== 1 ? 's' : ''} · {listing.bathrooms} bath{listing.bathrooms !== 1 ? 's' : ''}
                </p>
                <ContactHostButton listingId={listing.id} hostId={listing.host_id} />
              </div>
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-white font-semibold text-lg overflow-hidden shrink-0">
                {listing.host?.avatar_url ? (
                  <img src={listing.host.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  listing.host?.name?.[0]?.toUpperCase()
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="py-6 border-b border-hairline-soft grid grid-cols-1 gap-4">
              <div className="flex items-start gap-4">
                <Home size={24} className="text-ink shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-ink">Entire {listing.property_type.toLowerCase()}</p>
                  <p className="text-sm text-muted">You&apos;ll have the place to yourself</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <div className="py-6 border-b border-hairline-soft">
                <p className="text-body-text text-base leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* Amenities */}
            {listing.amenities?.length > 0 && (
              <div className="py-6 border-b border-hairline-soft">
                <h3 className="text-[21px] font-semibold text-ink mb-4">What this place offers</h3>
                <div className="grid grid-cols-2 gap-y-3">
                  {listing.amenities.map((a: { id: number; name: string }) => (
                    <div key={a.id} className="flex items-center gap-3 text-sm text-ink">
                      <span className="text-lg">✓</span>
                      {a.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            <div className="py-6 border-b border-hairline-soft">
              <h3 className="text-[21px] font-semibold text-ink mb-4">Where you&apos;ll be</h3>
              <p className="text-sm text-muted mb-4">{listing.location}</p>
              <DynamicMap
                latitude={listing.latitude}
                longitude={listing.longitude}
                title={listing.title}
              />
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="py-6">
                <div className="flex items-center gap-3 mb-6">
                  <Star size={20} className="fill-ink text-ink" />
                  <h3 className="text-[21px] font-semibold text-ink">
                    {listing.rating.toFixed(2)} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviews.slice(0, 6).map((review) => (
                    <div key={review.id}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
                          {review.user_avatar ? (
                            <img src={review.user_avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            review.user_name?.[0]?.toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">{review.user_name}</p>
                          <p className="text-xs text-muted">
                            {new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-body-text leading-relaxed line-clamp-4">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right col — sticky reservation */}
          <div className="w-[360px] shrink-0 hidden lg:block">
            <div className="sticky top-24">
              <ReservationCard
                listingId={listing.id}
                pricePerNight={listing.price_per_night}
                rating={listing.rating}
                reviewCount={listing.review_count}
                maxGuests={listing.max_guests}
                initialCheckIn={sp.check_in || ''}
                initialCheckOut={sp.check_out || ''}
                initialGuests={Number(sp.guests) || 1}
              />
            </div>
          </div>
        </div>

        {/* Mobile reserve drawer — full ReservationCard in a bottom sheet */}
        <MobileReserveDrawer
          listingId={listing.id}
          pricePerNight={listing.price_per_night}
          rating={listing.rating}
          reviewCount={listing.review_count}
          maxGuests={listing.max_guests}
          initialCheckIn={sp.check_in || ''}
          initialCheckOut={sp.check_out || ''}
          initialGuests={Number(sp.guests) || 1}
        />
      </main>
    </div>
  );
}
