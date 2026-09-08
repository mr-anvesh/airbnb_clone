'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CategoryTabs from '@/components/search/CategoryTabs';
import ListingGrid from '@/components/listing/ListingGrid';
import { SkeletonGrid } from '@/components/ui/Skeleton';
import { getListings, getWishlist } from '@/lib/api';
import type { ListingCard } from '@/types';

const PAGE_SIZE = 20;

function HomeContentInner() {
  const searchParams = useSearchParams();

  const location    = searchParams.get('location')      || '';
  const checkIn     = searchParams.get('check_in')      || '';
  const checkOut    = searchParams.get('check_out')      || '';
  const guests      = searchParams.get('guests')        || '';
  const propertyType = searchParams.get('property_type') || '';

  const [listings, setListings]       = useState<ListingCard[]>([]);
  const [wishlistedIds, setWishlistedIds] = useState<Set<number>>(new Set());
  const [page, setPage]               = useState(1);
  const [hasNext, setHasNext]         = useState(false);
  const [total, setTotal]             = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sentinel element at the bottom of the grid
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Prevent duplicate fetches
  const fetchingRef = useRef(false);

  // Build a stable search-key so we can reset when the query changes
  const searchKey = `${location}|${checkIn}|${checkOut}|${guests}|${propertyType}`;
  const prevSearchKey = useRef(searchKey);

  const fetchPage = useCallback(async (pageNum: number, reset: boolean) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const isFirst = pageNum === 1;
    if (isFirst) setInitialLoading(true);
    else setLoadingMore(true);

    try {
      const params: Record<string, string | number> = { page: pageNum, page_size: PAGE_SIZE };
      if (location)      params.location      = location;
      if (checkIn)       params.check_in      = checkIn;
      if (checkOut)      params.check_out     = checkOut;
      if (guests)        params.guests        = Number(guests);
      if (propertyType)  params.property_type = propertyType;

      const data = await getListings(params);
      setListings(prev => reset ? data.items : [...prev, ...data.items]);
      setHasNext(data.has_next);
      setTotal(data.total);
      setPage(pageNum);
    } catch {
      // silently ignore; leave existing listings intact
    } finally {
      if (isFirst) setInitialLoading(false);
      else setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [location, checkIn, checkOut, guests, propertyType]);

  // Reset + initial fetch whenever search params change
  useEffect(() => {
    const changed = prevSearchKey.current !== searchKey;
    prevSearchKey.current = searchKey;
    if (changed) setListings([]);
    fetchPage(1, true);
  }, [searchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wishlist IDs (best-effort)
  useEffect(() => {
    getWishlist()
      .then(items => setWishlistedIds(new Set(items.map(w => w.listing_id))))
      .catch(() => {});
  }, []);

  // IntersectionObserver — trigger next page when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNext && !fetchingRef.current && !loadingMore) {
          fetchPage(page + 1, false);
        }
      },
      { rootMargin: '200px' } // start loading 200px before the bottom
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNext, page, loadingMore, fetchPage]);

  return (
    <>
      <CategoryTabs />

      <div className="max-w-[1440px] mx-auto px-6 py-8">
        {/* Search summary */}
        {(location || propertyType) && !initialLoading && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-ink">
              {total} home{total !== 1 ? 's' : ''}
              {location ? ` in ${location}` : ''}
            </h2>
            {checkIn && checkOut && (
              <p className="text-sm text-muted mt-1">
                {checkIn} – {checkOut}
                {guests ? ` · ${guests} guests` : ''}
              </p>
            )}
          </div>
        )}

        {initialLoading ? (
          <SkeletonGrid count={12} />
        ) : (
          <>
            <ListingGrid
              listings={listings}
              wishlistedIds={wishlistedIds}
              checkIn={checkIn || undefined}
              checkOut={checkOut || undefined}
            />

            {/* Sentinel + load-more indicator */}
            <div ref={sentinelRef} className="flex justify-center items-center mt-12 h-12">
              {loadingMore && (
                <div className="flex items-center gap-3 text-muted text-sm">
                  <span className="w-5 h-5 border-2 border-hairline border-t-primary rounded-full animate-spin" />
                  Loading more…
                </div>
              )}
              {!hasNext && listings.length > 0 && (
                <p className="text-sm text-muted">
                  All {total} listing{total !== 1 ? 's' : ''} loaded
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function HomeContent() {
  return (
    <Suspense fallback={<SkeletonGrid count={12} />}>
      <HomeContentInner />
    </Suspense>
  );
}
