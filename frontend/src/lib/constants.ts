// SSR (server-side): use internal Docker hostname; browser: use public URL or relative path
export const API_URL =
  typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL || 'http://nginx')
    : (process.env.NEXT_PUBLIC_API_URL || '');

export const PROPERTY_TYPES = [
  'APARTMENT',
  'HOUSE',
  'VILLA',
  'CABIN',
  'COTTAGE',
  'STUDIO',
  'LOFT',
  'BUNGALOW',
  'UNIQUE',
];

export const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🏠' },
  { id: 'APARTMENT', label: 'Apartments', icon: '🏢' },
  { id: 'VILLA', label: 'Villas', icon: '🏰' },
  { id: 'CABIN', label: 'Cabins', icon: '🌲' },
  { id: 'HOUSE', label: 'Houses', icon: '🏡' },
  { id: 'COTTAGE', label: 'Cottages', icon: '🏘️' },
  { id: 'STUDIO', label: 'Studios', icon: '🎨' },
  { id: 'LOFT', label: 'Lofts', icon: '🏗️' },
  { id: 'BUNGALOW', label: 'Bungalows', icon: '🌴' },
  { id: 'UNIQUE', label: 'Unique', icon: '✨' },
];
