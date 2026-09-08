import { API_URL } from './constants';
import type {
  User,
  ListingCard,
  ListingDetail,
  ListingsResponse,
  BookingResponse,
  BookingWithListing,
  AvailabilityResponse,
  Review,
  WishlistWithListing,
  Amenity,
  ListingCreate,
  ListingUpdate,
  SearchParams,
  LoginRequest,
  SignupRequest,
  TokenResponse,
} from '@/types';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  requireAuth = false
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (requireAuth) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.message || err?.detail || 'Login failed');
  }
  return res.json();
}

export async function signup(data: SignupRequest): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.message || err?.detail || 'Signup failed');
  }
  return res.json();
}

export async function getMe(): Promise<User> {
  return apiFetch<User>('/api/v1/auth/me', {}, true);
}

export async function uploadImage(file: File): Promise<string> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/api/v1/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || 'Upload failed');
  }
  const data = await res.json();
  const url: string = data.url;
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}

export async function getUser(id: number): Promise<User> {
  return apiFetch<User>(`/api/v1/users/${id}`);
}

export async function getListings(params: SearchParams = {}): Promise<ListingsResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const qs = query.toString();
  return apiFetch<ListingsResponse>(`/api/v1/listings${qs ? `?${qs}` : ''}`);
}

export async function getListing(id: number): Promise<ListingDetail> {
  return apiFetch<ListingDetail>(`/api/v1/listings/${id}`);
}

export async function getAmenities(): Promise<Amenity[]> {
  return apiFetch<Amenity[]>('/api/v1/listings/amenities');
}

export async function checkAvailability(
  listingId: number,
  checkIn: string,
  checkOut: string
): Promise<AvailabilityResponse> {
  return apiFetch<AvailabilityResponse>(
    `/api/v1/listings/${listingId}/availability?check_in=${checkIn}&check_out=${checkOut}`
  );
}

export async function createListing(data: ListingCreate): Promise<ListingDetail> {
  return apiFetch<ListingDetail>('/api/v1/listings', {
    method: 'POST',
    body: JSON.stringify(data),
  }, true);
}

export async function updateListing(id: number, data: ListingUpdate): Promise<ListingDetail> {
  return apiFetch<ListingDetail>(`/api/v1/listings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, true);
}

export async function deleteListing(id: number): Promise<void> {
  return apiFetch<void>(`/api/v1/listings/${id}`, { method: 'DELETE' }, true);
}

export async function getHostListings(): Promise<ListingCard[]> {
  return apiFetch<ListingCard[]>('/api/v1/host/listings', {}, true);
}

export async function createBooking(data: {
  listing_id: number;
  check_in: string;
  check_out: string;
  guests: number;
}): Promise<BookingResponse> {
  return apiFetch<BookingResponse>('/api/v1/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  }, true);
}

export async function getBooking(id: number): Promise<BookingResponse> {
  return apiFetch<BookingResponse>(`/api/v1/bookings/${id}`, {}, true);
}

export async function cancelBooking(id: number): Promise<BookingResponse> {
  return apiFetch<BookingResponse>(`/api/v1/bookings/${id}/cancel`, { method: 'POST' }, true);
}

export async function getMyBookings(): Promise<BookingWithListing[]> {
  return apiFetch<BookingWithListing[]>('/api/v1/me/bookings', {}, true);
}

export async function getHostBookings(): Promise<BookingResponse[]> {
  return apiFetch<BookingResponse[]>('/api/v1/host/bookings', {}, true);
}

export async function getReviews(listingId: number): Promise<Review[]> {
  return apiFetch<Review[]>(`/api/v1/listings/${listingId}/reviews`);
}

export async function createReview(
  listingId: number,
  data: { booking_id: number; rating: number; comment: string }
): Promise<Review> {
  return apiFetch<Review>(`/api/v1/listings/${listingId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, true);
}

export async function getWishlist(): Promise<WishlistWithListing[]> {
  return apiFetch<WishlistWithListing[]>('/api/v1/wishlist', {}, true);
}

export async function addToWishlist(listingId: number): Promise<void> {
  return apiFetch<void>(`/api/v1/wishlist/${listingId}`, { method: 'POST' }, true);
}

export async function removeFromWishlist(listingId: number): Promise<void> {
  return apiFetch<void>(`/api/v1/wishlist/${listingId}`, { method: 'DELETE' }, true);
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

export async function getNotifications(): Promise<Notification[]> {
  return apiFetch<Notification[]>('/api/v1/notifications', {}, true);
}

export async function markNotificationRead(id: number): Promise<Notification> {
  return apiFetch<Notification>(`/api/v1/notifications/${id}/read`, { method: 'POST' }, true);
}

export async function markAllNotificationsRead(): Promise<void> {
  return apiFetch<void>('/api/v1/notifications/read-all', { method: 'POST' }, true);
}
