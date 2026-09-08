'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import Header from '@/components/navigation/Header';
import ListingForm from '@/components/hosting/ListingForm';
import { getListing } from '@/lib/api';
import type { ListingDetail } from '@/types';

export default function EditListingPage() {
  const params = useParams();
  const id = Number(params.id);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getListing(id)
      .then(setListing)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-canvas">
      <Suspense><Header /></Suspense>
      <main className="max-w-[800px] mx-auto px-6 py-10">
        <Link href="/hosting" className="inline-flex items-center gap-2 text-sm text-ink hover:underline mb-6">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <h1 className="text-[28px] font-bold text-ink mb-8">Edit listing</h1>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-surface-strong animate-pulse rounded-[14px]" />)}
          </div>
        ) : listing ? (
          <ListingForm listing={listing} mode="edit" />
        ) : (
          <p className="text-muted">Listing not found.</p>
        )}
      </main>
    </div>
  );
}
