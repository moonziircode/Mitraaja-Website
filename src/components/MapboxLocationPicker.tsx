'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

interface MapboxLocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (coords: LocationCoordinates) => void;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialAddress?: string;
  title?: string;
}

// Fallback center for Indonesia (Jabodetabek center if none specified)
const DEFAULT_LAT = -6.2088;
const DEFAULT_LNG = 106.8456;
const DEFAULT_ZOOM = 14;

export default function MapboxLocationPicker({
  isOpen,
  onClose,
  onConfirm,
  initialLatitude,
  initialLongitude,
  initialAddress = '',
  title = 'Tentukan Titik Lokasi Presisi',
}: MapboxLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const [coords, setCoords] = useState<LocationCoordinates>({
    latitude: initialLatitude || DEFAULT_LAT,
    longitude: initialLongitude || DEFAULT_LNG,
  });

  const [isLocating, setIsLocating] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Initialize Map
  useEffect(() => {
    if (!isOpen) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setIsMapReady(false);
      setMapError(null);
      setGeoMessage(null);
      return;
    }

    if (!token) {
      setMapError('Token Mapbox belum dikonfigurasi. Silakan tambahkan NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN di file .env.local.');
      return;
    }

    // Set initial center
    const hasInitial =
      typeof initialLatitude === 'number' &&
      typeof initialLongitude === 'number' &&
      !isNaN(initialLatitude) &&
      !isNaN(initialLongitude);

    const centerLat = hasInitial ? initialLatitude : DEFAULT_LAT;
    const centerLng = hasInitial ? initialLongitude : DEFAULT_LNG;

    setCoords({ latitude: centerLat, longitude: centerLng });

    mapboxgl.accessToken = token;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      try {
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [centerLng, centerLat],
          zoom: hasInitial ? 15 : DEFAULT_ZOOM,
          attributionControl: false,
        });

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

        map.on('load', () => {
          setIsMapReady(true);
          map.resize();
        });

        // Center Pin updates coordinates on move
        const handleMove = () => {
          const center = map.getCenter();
          setCoords({
            latitude: Number(center.lat.toFixed(6)),
            longitude: Number(center.lng.toFixed(6)),
          });
        };

        map.on('move', handleMove);

        map.on('error', (e) => {
          console.error('Mapbox error:', e);
          if (e.error?.message?.includes('Forbidden') || e.error?.message?.includes('Unauthorized')) {
            setMapError('Token Mapbox tidak valid atau akses ditolak. Periksa NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.');
          }
        });

        mapRef.current = map;

        // If no initial coordinate but initialAddress exists, try Geocoding
        if (!hasInitial && initialAddress.trim()) {
          geocodeAddress(initialAddress.trim(), map);
        }
      } catch (err: any) {
        console.error('Failed to initialize Mapbox:', err);
        setMapError('Gagal menginisialisasi peta Mapbox.');
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, token]);

  // Geocode address fallback
  const geocodeAddress = async (query: string, mapInstance: mapboxgl.Map) => {
    if (!token) return;
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?country=id&limit=1&access_token=${token}`
      );
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        mapInstance.flyTo({ center: [lng, lat], zoom: 15 });
        setCoords({ latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) });
      }
    } catch (err) {
      console.warn('Geocoding fallback failed:', err);
    }
  };

  // Browser Geolocation
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoMessage('Perangkat/browser Anda tidak mendukung fitur lokasi GPS.');
      return;
    }

    setIsLocating(true);
    setGeoMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));

        setCoords({ latitude: lat, longitude: lng });

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 16,
            essential: true,
          });
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoMessage('Izin akses lokasi ditolak oleh browser. Silakan geser peta secara manual.');
        } else {
          setGeoMessage('Gagal mendeteksi lokasi perangkat. Silakan geser peta secara manual.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, []);

  const handleConfirm = () => {
    // Coordinate validation
    const { latitude, longitude } = coords;
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      alert('Titik koordinat tidak valid.');
      return;
    }

    onConfirm({ latitude, longitude });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-fade-in">
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl border border-gray-100 shadow-2xl flex flex-col h-[85vh] max-h-[680px] overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">pin_drop</span>
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm md:text-base leading-tight">{title}</h3>
              <p className="text-[10px] text-gray-400 font-semibold truncate max-w-[260px] md:max-w-xs">
                Geser peta hingga pin tepat berada di lokasi tujuan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center"
            aria-label="Tutup"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Map Container Body */}
        <div className="relative flex-1 bg-gray-100 overflow-hidden">
          {mapError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-rose-50/70">
              <span className="material-symbols-outlined text-rose-500 text-[40px]">map</span>
              <p className="text-xs font-semibold text-rose-700 max-w-xs">{mapError}</p>
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 bg-gray-900 text-white rounded-xl text-xs font-bold"
              >
                Tutup Peta
              </button>
            </div>
          ) : (
            <>
              {/* Mapbox Canvas */}
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* CENTER PIN (Overlay) */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative -translate-y-4 flex flex-col items-center animate-bounce-subtle">
                  <span
                    className="material-symbols-outlined text-primary text-[38px] drop-shadow-md"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    location_on
                  </span>
                  {/* Pin shadow on ground */}
                  <div className="w-2.5 h-1 bg-black/30 rounded-full blur-[1px] -mt-1" />
                </div>
              </div>

              {/* Loading Indicator */}
              {!isMapReady && (
                <div className="absolute inset-0 bg-gray-50/80 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className="w-7 h-7 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-gray-500">Memuat peta Mapbox...</p>
                </div>
              )}

              {/* Floating "Gunakan Lokasi Saya" Button */}
              <div className="absolute top-3 right-3 z-10">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="h-9 px-3 bg-white/95 hover:bg-white text-gray-700 border border-gray-200/80 shadow-md rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[16px] text-primary ${isLocating ? 'animate-spin' : ''}`}>
                    my_location
                  </span>
                  <span>{isLocating ? 'Mencari...' : 'Lokasi Saya'}</span>
                </button>
              </div>

              {/* Notice / Permission warning banner */}
              {geoMessage && (
                <div className="absolute top-14 left-3 right-3 z-10 bg-amber-50/95 border border-amber-200/90 text-amber-800 text-[11px] font-semibold px-3 py-2 rounded-xl shadow-md flex items-start gap-2 animate-fade-in">
                  <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0 mt-0.5">info</span>
                  <span className="flex-1">{geoMessage}</span>
                  <button
                    type="button"
                    onClick={() => setGeoMessage(null)}
                    className="text-amber-500 hover:text-amber-800 text-[14px]"
                  >
                    ✕
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Coordinate & Confirmation */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 shrink-0 space-y-3">
          <div className="flex items-center justify-between text-xs bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-400 text-[18px]">gps_fixed</span>
              <div>
                <span className="text-[10px] uppercase font-extrabold text-gray-400 block tracking-wider">
                  Koordinat Terpilih
                </span>
                <span className="font-mono font-bold text-gray-800">
                  {coords.latitude}, {coords.longitude}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              Akurat
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!!mapError}
              className="flex-[2] h-11 bg-primary hover:bg-primary-light text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              <span>Konfirmasi Lokasi Ini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
