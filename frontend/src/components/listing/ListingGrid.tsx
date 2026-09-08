import type { ListingCard as ListingCardType } from '@/types';
import ListingCard from './ListingCard';

interface ListingGridProps {
  listings: ListingCardType[];
  wishlistedIds?: Set<number>;
  checkIn?: string;
  checkOut?: string;
}

export default function ListingGrid({ listings, wishlistedIds, checkIn, checkOut }: ListingGridProps) {
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-[#222222] dark:text-[#f2f2f2] mb-2">No listings found</h3>
        <p className="text-[#6a6a6a] dark:text-[#a8a8a8] text-sm max-w-xs">
          Try adjusting your search criteria or explore all available properties.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          isWishlisted={wishlistedIds?.has(listing.id)}
          checkIn={checkIn}
          checkOut={checkOut}
        />
      ))}
    </div>
  );
}
