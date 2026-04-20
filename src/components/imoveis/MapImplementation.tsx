'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapImplementationProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  address?: string;
  isAdmin?: boolean;
}

// Fix marker icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Helper component that can use the useMap hook
function ChangeView({ center, isAdmin = true }: { center: [number, number], isAdmin?: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0) {
      map.setView(center, isAdmin ? 15 : 13);
    }
  }, [center, map, isAdmin]);
  return null;
}

export default function MapImplementation({ lat, lng, onChange, address, isAdmin = true }: MapImplementationProps) {
  const [position, setPosition] = useState<[number, number] | null>(lat && lng ? [lat, lng] : null);

  const defaultCenter: [number, number] = position || [-23.1895, -47.2151]; // Indaiatuba

  const handleGeocode = async () => {
    if (!address) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setPosition([newLat, newLng]);
        onChange(newLat, newLng);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
  };

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          <span>Arraste o pin para ajustar</span>
          {address && (
            <button 
              type="button" 
              onClick={handleGeocode}
              className="text-primary hover:underline hover:text-primary-hover flex items-center gap-1"
            >
              🧭 Buscar Endereço
            </button>
          )}
        </div>
      )}
      
      <div className="h-64 w-full rounded-2xl overflow-hidden border border-border-light shadow-inner relative z-0">
        <MapContainer 
          center={defaultCenter} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {position && isAdmin && <Marker 
            position={position} 
            icon={DefaultIcon}
            draggable={true} 
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const pos = marker.getLatLng();
                const newPos: [number, number] = [pos.lat, pos.lng];
                setPosition(newPos);
                onChange(newPos[0], newPos[1]);
              }
            }} 
          />}
          <ChangeView center={defaultCenter} isAdmin={isAdmin} />
        </MapContainer>
      </div>
    </div>
  );
}
