'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CATEGORIES } from '@/lib/constants';

export default function CategoryTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelect = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId === 'all') {
      params.delete('property_type');
    } else {
      params.set('property_type', categoryId);
    }
    params.delete('page');
    router.push(`/?${params.toString()}`);
  };

  const active = searchParams.get('property_type') || 'all';

  return (
    <div className="border-b border-[#ebebeb] dark:border-[#2d2d2d] bg-white dark:bg-[#161616] sticky top-[80px] z-30">
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="flex gap-8 overflow-x-auto scrollbar-hide py-3" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map((cat) => {
            const isActive = (cat.id === 'all' && active === 'all') || cat.id === active;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelect(cat.id)}
                className={`flex flex-col items-center gap-1.5 pb-2 shrink-0 transition-colors border-b-2 ${
                  isActive
                    ? 'border-[#222222] dark:border-[#f2f2f2] text-[#222222] dark:text-[#f2f2f2]'
                    : 'border-transparent text-[#6a6a6a] dark:text-[#a8a8a8] hover:text-[#222222] dark:hover:text-[#f2f2f2] hover:border-[#dddddd] dark:hover:border-[#3d3d3d]'
                }`}
              >
                <span className="text-2xl leading-none">{cat.icon}</span>
                <span className="text-xs font-medium whitespace-nowrap">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
