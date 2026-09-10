'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';

export interface RegionSelection {
  province: {
    code: string;
    name: string;
  };
  city: {
    name: string;
  };
  district: {
    code: string;
    name: string;
  };
  subdistrict: {
    name: string;
    postalCode: string;
    districtCode: string;
  };
}

interface CascadingRegionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: RegionSelection) => void;
  title?: string;
  initialSelection?: {
    provinceName?: string;
    cityName?: string;
    districtName?: string;
    districtCode?: string;
    postalCode?: string;
    subdistrictName?: string;
  } | null;
  filterJabodetabek?: boolean;
  filterCity?: string;
  filterProvince?: string;
}

type StepLevel = 'PROVINCE' | 'CITY' | 'DISTRICT' | 'SUBDISTRICT';

const JABODETABEK_CITIES = [
  'BEKASI',
  'BOGOR',
  'DEPOK',
  'TANGERANG',
  'TANGERANG SELATAN',
  'JAKARTA BARAT',
  'JAKARTA PUSAT',
  'JAKARTA SELATAN',
  'JAKARTA TIMUR',
  'JAKARTA UTARA',
  'KEPULAUAN SERIBU'
];

// In-memory module-level cache across picker instances
const regionsCache = {
  provinces: null as Array<{ name: string; code: string }> | null,
  cities: new Map<string, string[]>(),
  districts: new Map<string, Array<{ name: string; code: string }>>(),
  subdistricts: new Map<string, Array<{ name: string; postalCode: string; districtCode: string }>>(),
};

export default function CascadingRegionPicker({
  isOpen,
  onClose,
  onSelect,
  title = 'Pilih Wilayah Pengiriman',
  initialSelection,
  filterJabodetabek = false,
  filterCity,
  filterProvince,
}: CascadingRegionPickerProps) {
  // Current active step
  const [currentStep, setCurrentStep] = useState<StepLevel>('PROVINCE');

  // Selected state per hierarchy level
  const [selectedProvince, setSelectedProvince] = useState<{ code: string; name: string } | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<{ code: string; name: string } | null>(null);
  const [selectedSubdistrict, setSelectedSubdistrict] = useState<{ name: string; postalCode: string; districtCode: string } | null>(null);

  // Data lists per level
  const [provinces, setProvinces] = useState<Array<{ name: string; code: string }>>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<Array<{ name: string; code: string }>>([]);
  const [subdistricts, setSubdistricts] = useState<Array<{ name: string; postalCode: string; districtCode: string }>>([]);

  // Search input query
  const [searchQuery, setSearchQuery] = useState('');

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search input ref to focus automatically on level change
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── 1. Initialize when modal opens ──
  useEffect(() => {
    if (!isOpen) return;

    setSearchQuery('');
    setErrorMessage(null);

    // If initialSelection is provided and complete/partial, prefill
    if (initialSelection?.provinceName) {
      const provName = initialSelection.provinceName.toUpperCase().trim();
      setSelectedProvince({ code: '', name: provName });

      if (initialSelection.cityName) {
        const cityName = initialSelection.cityName.toUpperCase().trim();
        setSelectedCity(cityName);

        if (initialSelection.districtName) {
          const distName = initialSelection.districtName.toUpperCase().trim();
          const distCode = initialSelection.districtCode || '';
          setSelectedDistrict({ code: distCode, name: distName });

          if (initialSelection.subdistrictName && initialSelection.postalCode) {
            setSelectedSubdistrict({
              name: initialSelection.subdistrictName.toUpperCase().trim(),
              postalCode: initialSelection.postalCode,
              districtCode: distCode,
            });
            setCurrentStep('SUBDISTRICT');
          } else {
            setCurrentStep('SUBDISTRICT');
          }
        } else {
          setCurrentStep('DISTRICT');
        }
      } else {
        setCurrentStep('CITY');
      }
    } else {
      // Default to PROVINCE
      setCurrentStep('PROVINCE');
      setSelectedProvince(null);
      setSelectedCity(null);
      setSelectedDistrict(null);
      setSelectedSubdistrict(null);
    }
  }, [isOpen]);

  // Focus search input on step change
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isOpen]);

  // ── 2. Data Fetching with Cache ──

  // Fetch Provinces
  useEffect(() => {
    if (!isOpen) return;

    async function loadProvinces() {
      if (regionsCache.provinces && regionsCache.provinces.length > 0) {
        applyProvinceFilters(regionsCache.provinces);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch('/api/regions');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          regionsCache.provinces = json.data;
          applyProvinceFilters(json.data);
        } else {
          setErrorMessage('Gagal memuat daftar provinsi.');
        }
      } catch (err: any) {
        console.error('Error load provinces:', err);
        setErrorMessage('Gagal terhubung ke server.');
      } finally {
        setIsLoading(false);
      }
    }

    function applyProvinceFilters(list: Array<{ name: string; code: string }>) {
      let filtered = list;
      if (filterJabodetabek) {
        filtered = list.filter((p) => ['DKI JAKARTA', 'JAWA BARAT', 'BANTEN'].includes(p.name.toUpperCase()));
      } else if (filterProvince) {
        filtered = list.filter((p) => p.name.toUpperCase() === filterProvince.toUpperCase());
      }
      setProvinces(filtered);
    }

    loadProvinces();
  }, [isOpen, filterJabodetabek, filterProvince]);

  // Fetch Cities when province is selected or on step CITY
  useEffect(() => {
    if (!isOpen || !selectedProvince) {
      setCities([]);
      return;
    }

    const provName = selectedProvince.name;
    const cacheKey = provName.toUpperCase();

    async function loadCities() {
      if (regionsCache.cities.has(cacheKey)) {
        applyCityFilters(regionsCache.cities.get(cacheKey)!);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/regions?province=${encodeURIComponent(provName)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          regionsCache.cities.set(cacheKey, json.data);
          applyCityFilters(json.data);
        } else {
          setErrorMessage('Gagal memuat daftar kota.');
        }
      } catch (err: any) {
        console.error('Error load cities:', err);
        setErrorMessage('Gagal memuat data kota.');
      } finally {
        setIsLoading(false);
      }
    }

    function applyCityFilters(list: string[]) {
      let filtered = list;
      if (filterJabodetabek) {
        filtered = list.filter((c) => JABODETABEK_CITIES.includes(c.toUpperCase()));
      } else if (filterCity) {
        const normalizedUserCity = filterCity
          .toUpperCase()
          .replace(/^(KABUPATEN|KAB\.|KOTA)\s+/i, '')
          .replace(/\s+(KOTA|KABUPATEN)$/i, '')
          .trim();
        filtered = list.filter((c) => c.toUpperCase() === normalizedUserCity);
      }
      setCities(filtered);
    }

    loadCities();
  }, [isOpen, selectedProvince, filterJabodetabek, filterCity]);

  // Fetch Districts when city is selected
  useEffect(() => {
    if (!isOpen || !selectedProvince || !selectedCity) {
      setDistricts([]);
      return;
    }

    const cacheKey = `${selectedProvince.name.toUpperCase()}|${selectedCity.toUpperCase()}`;

    async function loadDistricts() {
      if (regionsCache.districts.has(cacheKey)) {
        setDistricts(regionsCache.districts.get(cacheKey)!);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch(
          `/api/regions?province=${encodeURIComponent(selectedProvince!.name)}&city=${encodeURIComponent(selectedCity!)}`
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          regionsCache.districts.set(cacheKey, json.data);
          setDistricts(json.data);
        } else {
          setErrorMessage('Gagal memuat daftar kecamatan.');
        }
      } catch (err: any) {
        console.error('Error load districts:', err);
        setErrorMessage('Gagal memuat data kecamatan.');
      } finally {
        setIsLoading(false);
      }
    }

    loadDistricts();
  }, [isOpen, selectedProvince, selectedCity]);

  // Fetch Subdistricts when district is selected
  useEffect(() => {
    if (!isOpen || !selectedProvince || !selectedCity || !selectedDistrict) {
      setSubdistricts([]);
      return;
    }

    const cacheKey = `${selectedProvince.name.toUpperCase()}|${selectedCity.toUpperCase()}|${selectedDistrict.name.toUpperCase()}`;

    async function loadSubdistricts() {
      if (regionsCache.subdistricts.has(cacheKey)) {
        setSubdistricts(regionsCache.subdistricts.get(cacheKey)!);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch(
          `/api/regions?province=${encodeURIComponent(selectedProvince!.name)}&city=${encodeURIComponent(
            selectedCity!
          )}&kecamatan=${encodeURIComponent(selectedDistrict!.name)}`
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          regionsCache.subdistricts.set(cacheKey, json.data);
          setSubdistricts(json.data);
        } else {
          setErrorMessage('Gagal memuat daftar kelurahan.');
        }
      } catch (err: any) {
        console.error('Error load subdistricts:', err);
        setErrorMessage('Gagal memuat data kelurahan.');
      } finally {
        setIsLoading(false);
      }
    }

    loadSubdistricts();
  }, [isOpen, selectedProvince, selectedCity, selectedDistrict]);

  // ── 3. Step Navigation & Backtracking Handlers ──

  const handleSelectProvince = (prov: { name: string; code: string }) => {
    // If selecting a different province, reset all children
    if (!selectedProvince || selectedProvince.name !== prov.name) {
      setSelectedProvince(prov);
      setSelectedCity(null);
      setSelectedDistrict(null);
      setSelectedSubdistrict(null);
    }
    // Auto advance
    setCurrentStep('CITY');
  };

  const handleSelectCity = (city: string) => {
    if (!selectedCity || selectedCity !== city) {
      setSelectedCity(city);
      setSelectedDistrict(null);
      setSelectedSubdistrict(null);
    }
    // Auto advance
    setCurrentStep('DISTRICT');
  };

  const handleSelectDistrict = (dist: { name: string; code: string }) => {
    if (!selectedDistrict || selectedDistrict.name !== dist.name) {
      setSelectedDistrict(dist);
      setSelectedSubdistrict(null);
    }
    // Auto advance
    setCurrentStep('SUBDISTRICT');
  };

  const handleSelectSubdistrict = (sub: { name: string; postalCode: string; districtCode: string }) => {
    setSelectedSubdistrict(sub);

    // Complete selection
    if (selectedProvince && selectedCity && selectedDistrict) {
      onSelect({
        province: selectedProvince,
        city: { name: selectedCity },
        district: selectedDistrict,
        subdistrict: sub,
      });
      onClose();
    }
  };

  // Tab click (Backtracking)
  const handleTabClick = (targetStep: StepLevel) => {
    if (targetStep === 'PROVINCE') {
      setCurrentStep('PROVINCE');
    } else if (targetStep === 'CITY' && selectedProvince) {
      setCurrentStep('CITY');
    } else if (targetStep === 'DISTRICT' && selectedProvince && selectedCity) {
      setCurrentStep('DISTRICT');
    } else if (targetStep === 'SUBDISTRICT' && selectedProvince && selectedCity && selectedDistrict) {
      setCurrentStep('SUBDISTRICT');
    }
  };

  // ── 4. Local Filtering by Search Query ──
  const filteredProvinces = useMemo(() => {
    if (!searchQuery.trim()) return provinces;
    const q = searchQuery.toLowerCase().trim();
    return provinces.filter((p) => p.name.toLowerCase().includes(q));
  }, [provinces, searchQuery]);

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return cities;
    const q = searchQuery.toLowerCase().trim();
    return cities.filter((c) => c.toLowerCase().includes(q));
  }, [cities, searchQuery]);

  const filteredDistricts = useMemo(() => {
    if (!searchQuery.trim()) return districts;
    const q = searchQuery.toLowerCase().trim();
    return districts.filter((d) => d.name.toLowerCase().includes(q) || d.code.includes(q));
  }, [districts, searchQuery]);

  const filteredSubdistricts = useMemo(() => {
    if (!searchQuery.trim()) return subdistricts;
    const q = searchQuery.toLowerCase().trim();
    return subdistricts.filter((s) => s.name.toLowerCase().includes(q) || s.postalCode.includes(q));
  }, [subdistricts, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-fade-in">
      {/* Bottom Sheet Container */}
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh] h-[640px] overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">location_on</span>
              <h3 className="font-extrabold text-gray-900 text-base">{title}</h3>
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

          {/* Stepper / Breadcrumbs Tab Indicator */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold scrollbar-none">
            {/* Tab 1: Provinsi */}
            <button
              type="button"
              onClick={() => handleTabClick('PROVINCE')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                currentStep === 'PROVINCE'
                  ? 'bg-primary text-white shadow-sm'
                  : selectedProvince
                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>{selectedProvince ? selectedProvince.name : '1. Provinsi'}</span>
              {selectedProvince && currentStep !== 'PROVINCE' && (
                <span className="material-symbols-outlined text-[14px]">check</span>
              )}
            </button>

            <span className="text-gray-300 shrink-0">›</span>

            {/* Tab 2: Kota */}
            <button
              type="button"
              onClick={() => handleTabClick('CITY')}
              disabled={!selectedProvince}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                currentStep === 'CITY'
                  ? 'bg-primary text-white shadow-sm'
                  : selectedCity
                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                  : selectedProvince
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
            >
              <span>{selectedCity ? selectedCity : '2. Kota/Kab'}</span>
              {selectedCity && currentStep !== 'CITY' && (
                <span className="material-symbols-outlined text-[14px]">check</span>
              )}
            </button>

            <span className="text-gray-300 shrink-0">›</span>

            {/* Tab 3: Kecamatan */}
            <button
              type="button"
              onClick={() => handleTabClick('DISTRICT')}
              disabled={!selectedCity}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                currentStep === 'DISTRICT'
                  ? 'bg-primary text-white shadow-sm'
                  : selectedDistrict
                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                  : selectedCity
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
            >
              <span>{selectedDistrict ? selectedDistrict.name : '3. Kecamatan'}</span>
              {selectedDistrict && currentStep !== 'DISTRICT' && (
                <span className="material-symbols-outlined text-[14px]">check</span>
              )}
            </button>

            <span className="text-gray-300 shrink-0">›</span>

            {/* Tab 4: Kelurahan */}
            <button
              type="button"
              onClick={() => handleTabClick('SUBDISTRICT')}
              disabled={!selectedDistrict}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                currentStep === 'SUBDISTRICT'
                  ? 'bg-primary text-white shadow-sm'
                  : selectedSubdistrict
                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                  : selectedDistrict
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
            >
              <span>{selectedSubdistrict ? `${selectedSubdistrict.name}` : '4. Kelurahan'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar per Active Step */}
        <div className="px-6 py-3 bg-gray-50/70 border-b border-gray-100 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
              search
            </span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder={
                currentStep === 'PROVINCE'
                  ? 'Cari Provinsi...'
                  : currentStep === 'CITY'
                  ? `Cari Kota/Kabupaten di ${selectedProvince?.name || ''}...`
                  : currentStep === 'DISTRICT'
                  ? `Cari Kecamatan di ${selectedCity || ''}...`
                  : `Cari Kelurahan atau Kode Pos di ${selectedDistrict?.name || ''}...`
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-9 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:border-primary/25 focus:ring-4 focus:ring-primary/5 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-gray-50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-gray-400">Memuat data wilayah...</p>
            </div>
          ) : errorMessage ? (
            <div className="py-12 px-4 text-center space-y-3">
              <span className="material-symbols-outlined text-rose-500 text-[36px]">error</span>
              <p className="text-xs font-semibold text-rose-600">{errorMessage}</p>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  if (currentStep === 'PROVINCE') setSelectedProvince(null);
                  else if (currentStep === 'CITY') setSelectedCity(null);
                  else if (currentStep === 'DISTRICT') setSelectedDistrict(null);
                  else if (currentStep === 'SUBDISTRICT') setSelectedSubdistrict(null);
                }}
                className="h-8 px-4 bg-primary text-white text-xs font-bold rounded-lg"
              >
                Muat Ulang
              </button>
            </div>
          ) : (
            <>
              {/* LEVEL 1: PROVINCES */}
              {currentStep === 'PROVINCE' && (
                <ul className="space-y-1 py-2">
                  {filteredProvinces.length > 0 ? (
                    filteredProvinces.map((prov) => {
                      const isSelected = selectedProvince?.name === prov.name;
                      return (
                        <li key={prov.code}>
                          <button
                            type="button"
                            onClick={() => handleSelectProvince(prov)}
                            className={`w-full px-4 py-3 text-left rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-800 hover:bg-gray-50 active:bg-gray-100'
                            }`}
                          >
                            <span>{prov.name}</span>
                            <span className="material-symbols-outlined text-gray-300 text-[18px]">chevron_right</span>
                          </button>
                        </li>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-xs font-semibold text-gray-400">
                      Provinsi "{searchQuery}" tidak ditemukan
                    </div>
                  )}
                </ul>
              )}

              {/* LEVEL 2: CITIES */}
              {currentStep === 'CITY' && (
                <ul className="space-y-1 py-2">
                  {filteredCities.length > 0 ? (
                    filteredCities.map((city) => {
                      const isSelected = selectedCity === city;
                      return (
                        <li key={city}>
                          <button
                            type="button"
                            onClick={() => handleSelectCity(city)}
                            className={`w-full px-4 py-3 text-left rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-800 hover:bg-gray-50 active:bg-gray-100'
                            }`}
                          >
                            <span>{city}</span>
                            <span className="material-symbols-outlined text-gray-300 text-[18px]">chevron_right</span>
                          </button>
                        </li>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-xs font-semibold text-gray-400">
                      Kota/Kabupaten "{searchQuery}" tidak ditemukan di {selectedProvince?.name}
                    </div>
                  )}
                </ul>
              )}

              {/* LEVEL 3: DISTRICTS */}
              {currentStep === 'DISTRICT' && (
                <ul className="space-y-1 py-2">
                  {filteredDistricts.length > 0 ? (
                    filteredDistricts.map((dist) => {
                      const isSelected = selectedDistrict?.name === dist.name;
                      return (
                        <li key={dist.code}>
                          <button
                            type="button"
                            onClick={() => handleSelectDistrict(dist)}
                            className={`w-full px-4 py-3 text-left rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-800 hover:bg-gray-50 active:bg-gray-100'
                            }`}
                          >
                            <div>
                              <span>{dist.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono ml-2">({dist.code})</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 text-[18px]">chevron_right</span>
                          </button>
                        </li>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-xs font-semibold text-gray-400">
                      Kecamatan "{searchQuery}" tidak ditemukan di {selectedCity}
                    </div>
                  )}
                </ul>
              )}

              {/* LEVEL 4: SUBDISTRICTS (KELURAHAN + KODE POS) */}
              {currentStep === 'SUBDISTRICT' && (
                <ul className="space-y-1 py-2">
                  {filteredSubdistricts.length > 0 ? (
                    filteredSubdistricts.map((sub, idx) => {
                      const isSelected =
                        selectedSubdistrict?.name === sub.name && selectedSubdistrict?.postalCode === sub.postalCode;
                      return (
                        <li key={`${sub.name}-${sub.postalCode}-${idx}`}>
                          <button
                            type="button"
                            onClick={() => handleSelectSubdistrict(sub)}
                            className={`w-full px-4 py-3 text-left rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-800 hover:bg-gray-50 active:bg-gray-100'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span>{sub.name}</span>
                              <span className="text-[10px] text-gray-400 font-normal">
                                Kec. {selectedDistrict?.name}, {selectedCity}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-extrabold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                                {sub.postalCode}
                              </span>
                              <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                            </div>
                          </button>
                        </li>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-xs font-semibold text-gray-400">
                      Kelurahan atau Kode Pos "{searchQuery}" tidak ditemukan di {selectedDistrict?.name}
                    </div>
                  )}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Footer info showing current selection path */}
        <div className="px-6 py-3 bg-gray-50/90 border-t border-gray-100 text-[11px] text-gray-500 font-semibold flex items-center justify-between shrink-0">
          <div className="truncate mr-2">
            <span className="text-gray-400 mr-1">Rute:</span>
            {selectedProvince ? selectedProvince.name : '—'}
            {selectedCity ? ` › ${selectedCity}` : ''}
            {selectedDistrict ? ` › ${selectedDistrict.name}` : ''}
          </div>
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary shrink-0">
            {currentStep === 'PROVINCE'
              ? 'Langkah 1/4'
              : currentStep === 'CITY'
              ? 'Langkah 2/4'
              : currentStep === 'DISTRICT'
              ? 'Langkah 3/4'
              : 'Langkah 4/4'}
          </span>
        </div>
      </div>
    </div>
  );
}
