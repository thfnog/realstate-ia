'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// We dynamically import the entire map implementation to avoid SSR issues
const MapImplementation = dynamic(() => import('./MapImplementation'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-xs text-text-tertiary">Carregando mapa interativo...</div>
});

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  address?: string;
  isAdmin?: boolean;
}

export default function MapPicker(props: MapPickerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-64 bg-slate-100 rounded-xl" />;

  return <MapImplementation {...props} />;
}

