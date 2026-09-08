'use client';

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { createReview } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface ReviewModalProps {
  bookingId: number;
  listingId: number;
  listingTitle: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function ReviewModal({ bookingId, listingId, listingTitle, onClose, onSubmitted }: ReviewModalProps) {
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const labels = ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent'];

  const handleSubmit = async () => {
    if (rating === 0) { showToast('Please select a rating', 'error'); return; }
    if (comment.trim().length < 10) { showToast('Please write at least 10 characters', 'error'); return; }
    setSubmitting(true);
    try {
      await createReview(listingId, { booking_id: bookingId, rating, comment });
      showToast('Review submitted!', 'success');
      onSubmitted();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to submit review';
      showToast(msg.toLowerCase().includes('already') ? 'You already reviewed this stay' : msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-[#1a1a1a] rounded-[14px] shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#222222] dark:text-[#f0f0f0]">Leave a review</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f7f7f7] dark:hover:bg-[#2a2a2a] text-[#222222] dark:text-[#f0f0f0] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-[#6a6a6a] dark:text-[#a0a0a0] mb-6 line-clamp-2">{listingTitle}</p>

        {/* Star rating */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-[#222222] dark:text-[#f0f0f0] mb-3">Overall rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(n)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  size={32}
                  className={
                    n <= (hovered || rating)
                      ? 'fill-[#ff385c] text-[#ff385c]'
                      : 'text-[#dddddd] dark:text-[#444444]'
                  }
                />
              </button>
            ))}
          </div>
          {(hovered || rating) > 0 && (
            <p className="text-sm text-[#6a6a6a] dark:text-[#a0a0a0] mt-2">
              {labels[hovered || rating]}
            </p>
          )}
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#222222] dark:text-[#f0f0f0] mb-2">
            Your review
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Share your experience with future guests..."
            rows={4}
            className="w-full border border-[#dddddd] dark:border-[#3a3a3a] dark:bg-[#2a2a2a] dark:text-[#f0f0f0] rounded-[8px] p-3 text-sm outline-none focus:border-[#222222] dark:focus:border-[#f0f0f0] resize-none placeholder:text-[#b0b0b0]"
          />
          <p className="text-xs text-[#6a6a6a] dark:text-[#a0a0a0] mt-1 text-right">{comment.length}/500</p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="w-full bg-[#ff385c] hover:bg-[#e00b41] text-white font-semibold rounded-[8px] py-3 text-sm transition-colors disabled:bg-[#ffd1da] disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting…' : 'Submit review'}
        </button>
      </div>
    </div>
  );
}
