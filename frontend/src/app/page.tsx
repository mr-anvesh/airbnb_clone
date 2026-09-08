import Header from '@/components/navigation/Header';
import HomeContent from '@/components/home/HomeContent';
import { Suspense } from 'react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#161616]">
      <Suspense>
        <Header />
      </Suspense>
      <main>
        <HomeContent />
      </main>
    </div>
  );
}
