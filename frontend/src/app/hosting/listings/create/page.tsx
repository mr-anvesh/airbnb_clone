import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/navigation/Header';
import ListingForm from '@/components/hosting/ListingForm';

export default function CreateListingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Suspense><Header /></Suspense>
      <main className="max-w-[800px] mx-auto px-6 py-10">
        <Link href="/hosting" className="inline-flex items-center gap-2 text-sm text-ink hover:underline mb-6">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <h1 className="text-[28px] font-bold text-ink mb-8">Create a new listing</h1>
        <ListingForm mode="create" />
      </main>
    </div>
  );
}
