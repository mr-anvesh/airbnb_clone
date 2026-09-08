'use client';

import dynamic from 'next/dynamic';

const ListingMap = dynamic(() => import('./ListingMap'), { ssr: false });

interface Props {
  latitude: number;
  longitude: number;
  title: string;
}

export default function DynamicMap(props: Props) {
  return <ListingMap {...props} />;
}
