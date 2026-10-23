'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createConversation, getConversations } from '@/lib/api';

export default function ContactHostButton({
  listingId,
  hostId,
}: {
  listingId: number;
  hostId: number;
}) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!currentUser || currentUser.id === hostId) return null;

  const handleContact = async () => {
    setLoading(true);
    try {
      await createConversation(listingId);
      // Dispatch a custom event so ChatBubble can open the conversation
      window.dispatchEvent(
        new CustomEvent('open-chat', { detail: { listingId } })
      );
    } catch {}
    setLoading(false);
  };

  return (
    <button
      onClick={handleContact}
      disabled={loading}
      className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline disabled:opacity-50 transition-colors mt-4"
    >
      <MessageCircle size={16} />
      {loading ? 'Opening chat...' : 'Contact host'}
    </button>
  );
}
