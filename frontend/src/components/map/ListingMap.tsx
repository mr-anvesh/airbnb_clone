'use client';

import { useEffect } from 'react';

interface ListingMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

function MapInner({ latitude, longitude, title }: ListingMapProps) {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');
    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MapContainer, TileLayer, Marker, Popup, Circle } =
    require('react-leaflet') as typeof import('react-leaflet');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet');

  const customIcon = L.divIcon({
    className: '',
    html: `<div style="
      width: 20px;
      height: 20px;
      background: #ff385c;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={13}
      className="w-full h-full rounded-[12px]"
      scrollWheelZoom={false}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Circle
        center={[latitude, longitude]}
        radius={400}
        pathOptions={{
          color: '#ff385c',
          fillColor: '#ff385c',
          fillOpacity: 0.1,
          weight: 1.5,
        }}
      />
      <Marker position={[latitude, longitude]} icon={customIcon}>
        <Popup>
          <span className="text-sm font-medium">{title}</span>
        </Popup>
      </Marker>
    </MapContainer>
  );
}

export default function ListingMap(props: ListingMapProps) {
  return (
    <div className="h-80 w-full rounded-[12px] overflow-hidden border border-[#ebebeb] dark:border-[#3a3a3a]">
      <MapInner {...props} />
    </div>
  );
}
