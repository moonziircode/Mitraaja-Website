import { PromoRecord } from './promo-db';

export interface LocationScopeInput {
  districtCode?: string | null;
  cityCode?: string | null;
  cityName?: string | null;
  provinceCode?: string | null;
  provinceName?: string | null;
  districtName?: string | null;
  rawText?: string | null;
}

export type LocationInput = LocationScopeInput | string | null | undefined;

export interface NormalizedLocation {
  provinceCode: string | null;
  provinceName: string | null;
  cityCode: string | null;
  cityName: string | null;
  canonicalKeys: string[];
}

export interface PromoCalculationResult {
  eligible: boolean;
  ineligibleReason?: string;
  promoCode: string;
  promoName: string;
  promoDescription?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountPercentage?: number;
  grossDiscount: number;
  maxDiscount: number | null;
  finalDiscount: number;
  finalShippingCost: number;
  isRecommended?: boolean;
}

/**
 * Normalisasi data lokasi menjadi kode dan token kanonikal untuk pencocokan ID wilayah
 */
export function normalizeLocation(input: LocationInput): NormalizedLocation {
  if (!input) {
    return {
      provinceCode: null,
      provinceName: null,
      cityCode: null,
      cityName: null,
      canonicalKeys: [],
    };
  }

  let districtCode: string | null = null;
  let cityCode: string | null = null;
  let cityName: string | null = null;
  let provinceCode: string | null = null;
  let provinceName: string | null = null;
  let rawText = '';

  if (typeof input === 'string') {
    rawText = input;
    // Check if string contains districtCode pattern e.g. "32.73.01" or "32.73"
    const codeMatch = input.match(/\b(\d{2}\.\d{2}(?:\.\d{2})?)\b/);
    if (codeMatch) {
      districtCode = codeMatch[1];
    }
  } else {
    districtCode = input.districtCode || null;
    cityCode = input.cityCode || null;
    cityName = input.cityName || null;
    provinceCode = input.provinceCode || null;
    provinceName = input.provinceName || null;
    rawText = [input.districtName, input.cityName, input.provinceName, input.rawText]
      .filter(Boolean)
      .join(', ');
  }

  // Extract from districtCode if available (e.g. "32.73.01")
  if (districtCode) {
    const parts = districtCode.split('.');
    if (parts.length >= 1 && !provinceCode) {
      provinceCode = parts[0];
    }
    if (parts.length >= 2 && !cityCode) {
      cityCode = `${parts[0]}.${parts[1]}`;
    }
  }

  if (cityCode && !provinceCode) {
    provinceCode = cityCode.split('.')[0];
  }

  const keys: Set<string> = new Set();

  if (provinceCode) keys.add(provinceCode);
  if (cityCode) keys.add(cityCode);
  if (districtCode) keys.add(districtCode);

  const textToScan = `${rawText} ${cityName || ''} ${provinceName || ''}`.toUpperCase();

  // Explicit City / Regency Mapping
  if (cityCode === '32.17' || textToScan.includes('BANDUNG BARAT')) {
    keys.add('32.17');
    keys.add('BANDUNG_BARAT');
    keys.add('KABUPATEN BANDUNG BARAT');
    if (!cityCode) cityCode = '32.17';
    if (!provinceCode) provinceCode = '32';
  } else if (cityCode === '32.73' || textToScan.includes('KOTA BANDUNG')) {
    keys.add('32.73');
    keys.add('BANDUNG');
    keys.add('KOTA BANDUNG');
    if (!cityCode) cityCode = '32.73';
    if (!provinceCode) provinceCode = '32';
  } else if (cityCode === '32.04' || textToScan.includes('KABUPATEN BANDUNG') || textToScan.includes('KAB. BANDUNG')) {
    keys.add('32.04');
    keys.add('BANDUNG');
    keys.add('KABUPATEN BANDUNG');
    if (!cityCode) cityCode = '32.04';
    if (!provinceCode) provinceCode = '32';
  } else if (textToScan.includes('BANDUNG')) {
    // Generic fallback Bandung
    keys.add('32.73');
    keys.add('32.04');
    keys.add('BANDUNG');
    if (!provinceCode) provinceCode = '32';
  }

  // Jakarta Mapping
  if (provinceCode === '31' || textToScan.includes('JAKARTA')) {
    keys.add('31');
    keys.add('JAKARTA');
    keys.add('DKI JAKARTA');
    if (textToScan.includes('SELATAN') || cityCode === '31.74') keys.add('31.74');
    if (textToScan.includes('TIMUR') || cityCode === '31.75') keys.add('31.75');
    if (textToScan.includes('PUSAT') || cityCode === '31.71') keys.add('31.71');
    if (textToScan.includes('BARAT') || cityCode === '31.73') keys.add('31.73');
    if (textToScan.includes('UTARA') || cityCode === '31.72') keys.add('31.72');
    if (!provinceCode) provinceCode = '31';
  }

  // Tangerang Mapping
  if (cityCode === '36.03' || cityCode === '36.71' || cityCode === '36.74' || textToScan.includes('TANGERANG')) {
    keys.add('36.03');
    keys.add('36.71');
    keys.add('36.74');
    keys.add('TANGERANG');
    keys.add('TANGERANG SELATAN');
    if (!provinceCode) provinceCode = '36';
  }

  // Bekasi Mapping
  if (cityCode === '32.16' || cityCode === '32.75' || textToScan.includes('BEKASI')) {
    keys.add('32.16');
    keys.add('32.75');
    keys.add('BEKASI');
    keys.add('KOTA BEKASI');
    keys.add('KABUPATEN BEKASI');
    if (!provinceCode) provinceCode = '32';
  }

  // Cimahi Mapping
  if (cityCode === '32.77' || textToScan.includes('CIMAHI')) {
    keys.add('32.77');
    keys.add('CIMAHI');
    if (!provinceCode) provinceCode = '32';
  }

  // Surabaya Mapping
  if (cityCode === '35.78' || textToScan.includes('SURABAYA')) {
    keys.add('35.78');
    keys.add('SURABAYA');
    if (!provinceCode) provinceCode = '35';
  }

  // Jawa Barat Mapping
  if (provinceCode === '32' || textToScan.includes('JAWA BARAT')) {
    keys.add('32');
    keys.add('JAWA BARAT');
    keys.add('JAWA_BARAT');
    if (!provinceCode) provinceCode = '32';
  }

  return {
    provinceCode,
    provinceName: provinceName || (provinceCode === '32' ? 'Jawa Barat' : provinceCode === '31' ? 'DKI Jakarta' : null),
    cityCode,
    cityName,
    canonicalKeys: Array.from(keys),
  };
}

/**
 * 1. Validasi Lokasi Registrasi Mitra
 */
export function isMitraEligible(promo: PromoRecord, mitraLocInput?: LocationInput): { eligible: boolean; reason?: string } {
  if (promo.mitra_scope === 'ALL') {
    return { eligible: true };
  }

  if (!mitraLocInput) {
    return {
      eligible: false,
      reason: 'Data lokasi registrasi mitra tidak ditemukan dalam sesi.',
    };
  }

  const norm = normalizeLocation(mitraLocInput);
  const targetCities = (promo.mitra_cities || []).map((c) => c.toUpperCase());

  // Check if any canonical key of mitra matches target cities
  const isMatch = norm.canonicalKeys.some((k) => targetCities.includes(k.toUpperCase()));

  if (!isMatch) {
    return {
      eligible: false,
      reason: 'Promo ini khusus untuk mitra yang terdaftar di wilayah Kota Bandung atau Kabupaten Bandung Barat.',
    };
  }

  return { eligible: true };
}

/**
 * 2. Validasi Asal Pengiriman (Origin)
 */
export function isOriginEligible(promo: PromoRecord, originInput?: LocationInput): { eligible: boolean; reason?: string } {
  if (promo.origin_scope === 'ALL') {
    return { eligible: true };
  }

  if (!originInput) {
    return {
      eligible: false,
      reason: 'Lokasi asal pengiriman (origin) belum dipilih.',
    };
  }

  const norm = normalizeLocation(originInput);
  const targetCities = (promo.origin_cities || []).map((c) => c.toUpperCase());

  const isMatch = norm.canonicalKeys.some((k) => targetCities.includes(k.toUpperCase()));

  if (!isMatch) {
    return {
      eligible: false,
      reason: 'Promo ini hanya berlaku untuk pengiriman dengan asal (origin) Bandung atau Bandung Barat.',
    };
  }

  return { eligible: true };
}

/**
 * 3. Validasi Tujuan Pengiriman (Destination)
 */
export function isDestinationEligible(promo: PromoRecord, destInput?: LocationInput): { eligible: boolean; reason?: string } {
  if (promo.destination_scope === 'ALL_CITY') {
    return { eligible: true };
  }

  if (!destInput) {
    return {
      eligible: false,
      reason: 'Lokasi tujuan pengiriman (destination) belum dipilih.',
    };
  }

  const norm = normalizeLocation(destInput);

  if (promo.destination_scope === 'PROVINCE') {
    const targetProvince = (promo.destination_province || '').toUpperCase();
    const isProvMatch =
      norm.provinceCode === targetProvince ||
      norm.canonicalKeys.some((k) => k.toUpperCase() === targetProvince);

    if (!isProvMatch) {
      return {
        eligible: false,
        reason: `Promo ini hanya berlaku untuk tujuan provinsi ${promo.destination_province === '32' ? 'Jawa Barat' : promo.destination_province}.`,
      };
    }
    return { eligible: true };
  }

  // CITY_OR_REGENCY
  const targetCities = (promo.destination_cities || []).map((c) => c.toUpperCase());
  const isCityMatch = norm.canonicalKeys.some((k) => targetCities.includes(k.toUpperCase()));

  if (!isCityMatch) {
    return {
      eligible: false,
      reason: 'Tujuan pengiriman tidak termasuk dalam cakupan promo ini.',
    };
  }

  return { eligible: true };
}

/**
 * 4. Engine Kalkulasi Diskon Utama
 */
export function calculatePromoDiscount({
  promo,
  shippingCost,
  mitraLocation,
  origin,
  destination,
}: {
  promo: PromoRecord;
  shippingCost: number;
  mitraLocation?: LocationInput;
  origin?: LocationInput;
  destination?: LocationInput;
}): PromoCalculationResult {
  const code = promo.code.toLowerCase();
  const name = promo.name;
  const description = promo.description;
  const discountType = promo.discount_type;
  const discountValue = Number(promo.discount_value);
  const maxDiscount = promo.max_discount !== null && promo.max_discount !== undefined ? Number(promo.max_discount) : null;

  // Cek Status Aktif
  if (!promo.is_active) {
    return {
      eligible: false,
      ineligibleReason: 'Promo sedang tidak aktif.',
      promoCode: code,
      promoName: name,
      promoDescription: description,
      discountType,
      discountPercentage: discountType === 'PERCENTAGE' ? discountValue : undefined,
      grossDiscount: 0,
      maxDiscount,
      finalDiscount: 0,
      finalShippingCost: shippingCost,
    };
  }

  // Cek Tanggal Berlaku
  const now = new Date();
  if (promo.start_at && new Date(promo.start_at) > now) {
    return {
      eligible: false,
      ineligibleReason: 'Periode promo belum dimulai.',
      promoCode: code,
      promoName: name,
      promoDescription: description,
      discountType,
      discountPercentage: discountType === 'PERCENTAGE' ? discountValue : undefined,
      grossDiscount: 0,
      maxDiscount,
      finalDiscount: 0,
      finalShippingCost: shippingCost,
    };
  }

  if (promo.end_at && new Date(promo.end_at) < now) {
    return {
      eligible: false,
      ineligibleReason: 'Promo telah kedaluwarsa.',
      promoCode: code,
      promoName: name,
      promoDescription: description,
      discountType,
      discountPercentage: discountType === 'PERCENTAGE' ? discountValue : undefined,
      grossDiscount: 0,
      maxDiscount,
      finalDiscount: 0,
      finalShippingCost: shippingCost,
    };
  }

  // Validasi Lapis 1: Lokasi Registrasi Mitra
  if (mitraLocation !== undefined) {
    const mitraCheck = isMitraEligible(promo, mitraLocation);
    if (!mitraCheck.eligible) {
      return {
        eligible: false,
        ineligibleReason: mitraCheck.reason,
        promoCode: code,
        promoName: name,
        promoDescription: description,
        discountType,
        discountPercentage: discountType === 'PERCENTAGE' ? discountValue : undefined,
        grossDiscount: 0,
        maxDiscount,
        finalDiscount: 0,
        finalShippingCost: shippingCost,
      };
    }
  }

  // Validasi Lapis 2: Origin Pengirim
  const originCheck = isOriginEligible(promo, origin);
  if (!originCheck.eligible) {
    return {
      eligible: false,
      ineligibleReason: originCheck.reason,
      promoCode: code,
      promoName: name,
      promoDescription: description,
      discountType,
      discountPercentage: discountType === 'PERCENTAGE' ? discountValue : undefined,
      grossDiscount: 0,
      maxDiscount,
      finalDiscount: 0,
      finalShippingCost: shippingCost,
    };
  }

  // Validasi Lapis 3: Destination Penerima
  const destCheck = isDestinationEligible(promo, destination);
  if (!destCheck.eligible) {
    return {
      eligible: false,
      ineligibleReason: destCheck.reason,
      promoCode: code,
      promoName: name,
      promoDescription: description,
      discountType,
      discountPercentage: discountType === 'PERCENTAGE' ? discountValue : undefined,
      grossDiscount: 0,
      maxDiscount,
      finalDiscount: 0,
      finalShippingCost: shippingCost,
    };
  }

  // Hitung Nominal Diskon
  let grossDiscount = 0;
  if (discountType === 'PERCENTAGE') {
    grossDiscount = Math.floor((shippingCost * discountValue) / 100);
  } else {
    grossDiscount = discountValue;
  }

  let finalDiscount = grossDiscount;
  if (maxDiscount !== null && maxDiscount > 0) {
    finalDiscount = Math.min(finalDiscount, maxDiscount);
  }

  // Diskon tidak boleh melebihi biaya ongkir
  finalDiscount = Math.min(finalDiscount, Math.max(0, shippingCost));
  const finalShippingCost = Math.max(0, shippingCost - finalDiscount);

  return {
    eligible: true,
    promoCode: code,
    promoName: name,
    promoDescription: description,
    discountType,
    discountPercentage: discountType === 'PERCENTAGE' ? discountValue : undefined,
    grossDiscount,
    maxDiscount,
    finalDiscount,
    finalShippingCost,
  };
}

/**
 * Menyaring promo yang memenuhi syarat dan mengurutkannya berdasarkan nominal diskon riil tertinggi
 */
export function rankEligiblePromos(
  promos: PromoRecord[],
  params: {
    shippingCost: number;
    mitraLocation?: LocationInput;
    origin?: LocationInput;
    destination?: LocationInput;
  }
): PromoCalculationResult[] {
  const evaluated: PromoCalculationResult[] = [];

  for (const promo of promos) {
    const res = calculatePromoDiscount({
      promo,
      shippingCost: params.shippingCost,
      mitraLocation: params.mitraLocation,
      origin: params.origin,
      destination: params.destination,
    });
    if (res.eligible) {
      evaluated.push(res);
    }
  }

  // Sort by actual discount amount descending
  evaluated.sort((a, b) => b.finalDiscount - a.finalDiscount);

  // Mark highest discount as recommended
  if (evaluated.length > 0) {
    evaluated[0].isRecommended = true;
  }

  return evaluated;
}
