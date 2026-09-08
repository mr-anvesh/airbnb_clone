'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  images: string[];
  title: string;
}

export default function MobileImageCarousel({ images, title }: Props) {
  const [idx, setIdx] = useState(0);

  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(images.length - 1, i + 1));

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-[#e5e5e5]">
      <img
        src={images[idx]}
        alt={title}
        className="w-full h-full object-cover"
      />

      {/* Prev */}
      {idx > 0 && (
        <button
          onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow"
        >
          <ChevronLeft size={18} className="text-[#222]" />
        </button>
      )}

      {/* Next */}
      {idx < images.length - 1 && (
        <button
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow"
        >
          <ChevronRight size={18} className="text-[#222]" />
        </button>
      )}

      {/* Counter */}
      <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-semibold rounded-full px-2.5 py-1">
        {idx + 1} / {images.length}
      </div>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`rounded-full transition-all ${i === idx ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/60'}`}
          />
        ))}
      </div>
    </div>
  );
}
