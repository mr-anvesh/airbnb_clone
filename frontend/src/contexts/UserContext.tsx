'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User } from '@/types';
import { API_URL } from '@/lib/constants';

interface UserContextValue {
  currentUser: User | null;
  users: User[];
  switchUser: (userId: number) => void;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  users: [],
  switchUser: () => {},
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('userId');
    if (stored) setCurrentUserId(Number(stored));

    fetch(`${API_URL}/api/v1/users`, {
      headers: { 'X-User-Id': stored || '1' },
    })
      .then((r) => r.json())
      .then((data: User[]) => {
        setUsers(data);
        const storedId = Number(localStorage.getItem('userId') || '1');
        const found = data.find((u) => u.id === storedId);
        if (!found && data.length > 0) {
          setCurrentUserId(data[0].id);
          localStorage.setItem('userId', String(data[0].id));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const switchUser = useCallback((userId: number) => {
    setCurrentUserId(userId);
    localStorage.setItem('userId', String(userId));
    window.location.reload();
  }, []);

  const currentUser = users.find((u) => u.id === currentUserId) || null;

  return (
    <UserContext.Provider value={{ currentUser, users, switchUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
