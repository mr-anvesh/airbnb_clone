export type UserRole = 'GUEST' | 'HOST';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
}

export interface ListingImage {
  id: number;
  image_url: string;
  display_order: number;
}

export interface Amenity {
  id: number;
  name: string;
}

export interface HostBrief {
  id: number;
  name: string;
  avatar_url: string | null;
}

export interface ListingCard {
  id: number;
  title: string;
  location: string;
  property_type: string;
  price_per_night: number;
  rating: number;
  review_count: number;
  images: ListingImage[];
}

export interface ListingDetail {
  id: number;
  host_id: number;
  title: string;
  description: string;
  property_type: string;
  location: string;
  latitude: number;
  longitude: number;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  images: ListingImage[];
  amenities: Amenity[];
  host: HostBrief;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface BookingResponse {
  id: number;
  listing_id: number;
  guest_id: number;
  check_in: string;
  check_out: string;
  guests: number;
  nightly_price: number;
  nights: number;
  cleaning_fee: number;
  service_fee: number;
  total_price: number;
  status: BookingStatus;
  created_at: string;
}

export interface BookingWithListing extends BookingResponse {
  listing_title: string;
  listing_location: string;
  listing_image: string | null;
}

export interface PriceBreakdown {
  nightly_price: number;
  nights: number;
  nightly_subtotal: number;
  cleaning_fee: number;
  service_fee: number;
  total: number;
}

export interface AvailabilityResponse {
  available: boolean;
  price_breakdown: PriceBreakdown | null;
}

export interface Review {
  id: number;
  listing_id: number;
  user_id: number;
  booking_id: number;
  rating: number;
  comment: string;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
}

export interface WishlistItem {
  id: number;
  user_id: number;
  listing_id: number;
  created_at: string;
}

export interface WishlistWithListing extends WishlistItem {
  listing_title: string;
  listing_location: string;
  listing_price: number;
  listing_rating: number;
  listing_image: string | null;
}

export interface ListingsResponse {
  items: ListingCard[];
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
}

export interface ListingCreate {
  title: string;
  description: string;
  property_type: string;
  location: string;
  latitude: number;
  longitude: number;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenity_ids: number[];
  images: { image_url: string; display_order: number }[];
}

export interface ListingUpdate extends Partial<ListingCreate> {}

export interface ConversationResponse {
  id: number;
  listing_id: number;
  guest_id: number;
  host_id: number;
  listing_title: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface SearchParams {
  location?: string;
  check_in?: string;
  check_out?: string;
  guests?: number;
  min_price?: number;
  max_price?: number;
  property_type?: string;
  amenities?: string;
  page?: number;
  page_size?: number;
}
