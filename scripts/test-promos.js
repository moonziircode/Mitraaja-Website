const { Pool } = require('pg');

const SUPABASE_POOLER_URL =
  process.env.SUPABASE_POSTGRES_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://postgres.wqpomgyktrndktsmojqg:Ftzmt6vN1tZFniyQ@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: SUPABASE_POOLER_URL,
  ssl: { rejectUnauthorized: false },
});

// Import or replicate normalization and calculation engine for Node environment testing
function normalizeLocation(input) {
  if (!input) {
    return { provinceCode: null, cityCode: null, canonicalKeys: [] };
  }
  let districtCode = null;
  let cityCode = null;
  let cityName = null;
  let provinceCode = null;
  let provinceName = null;
  let rawText = '';

  if (typeof input === 'string') {
    rawText = input;
    const codeMatch = input.match(/\b(\d{2}\.\d{2}(?:\.\d{2})?)\b/);
    if (codeMatch) districtCode = codeMatch[1];
  } else {
    districtCode = input.districtCode || null;
    cityCode = input.cityCode || null;
    cityName = input.cityName || null;
    provinceCode = input.provinceCode || null;
    provinceName = input.provinceName || null;
    rawText = [input.districtName, input.cityName, input.provinceName, input.rawText].filter(Boolean).join(', ');
  }

  if (districtCode) {
    const parts = districtCode.split('.');
    if (parts.length >= 1 && !provinceCode) provinceCode = parts[0];
    if (parts.length >= 2 && !cityCode) cityCode = `${parts[0]}.${parts[1]}`;
  }
  if (cityCode && !provinceCode) provinceCode = cityCode.split('.')[0];

  const keys = new Set();
  if (provinceCode) keys.add(provinceCode);
  if (cityCode) keys.add(cityCode);
  if (districtCode) keys.add(districtCode);

  const textToScan = `${rawText} ${cityName || ''} ${provinceName || ''}`.toUpperCase();

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
    keys.add('32.73');
    keys.add('32.04');
    keys.add('BANDUNG');
    if (!provinceCode) provinceCode = '32';
  }

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

  if (cityCode === '36.03' || cityCode === '36.71' || cityCode === '36.74' || textToScan.includes('TANGERANG')) {
    keys.add('36.03');
    keys.add('36.71');
    keys.add('36.74');
    keys.add('TANGERANG');
    keys.add('TANGERANG SELATAN');
    if (!provinceCode) provinceCode = '36';
  }

  if (cityCode === '32.16' || cityCode === '32.75' || textToScan.includes('BEKASI')) {
    keys.add('32.16');
    keys.add('32.75');
    keys.add('BEKASI');
    keys.add('KOTA BEKASI');
    keys.add('KABUPATEN BEKASI');
    if (!provinceCode) provinceCode = '32';
  }

  if (cityCode === '32.77' || textToScan.includes('CIMAHI')) {
    keys.add('32.77');
    keys.add('CIMAHI');
    if (!provinceCode) provinceCode = '32';
  }

  if (cityCode === '35.78' || textToScan.includes('SURABAYA')) {
    keys.add('35.78');
    keys.add('SURABAYA');
    if (!provinceCode) provinceCode = '35';
  }

  if (provinceCode === '32' || textToScan.includes('JAWA BARAT')) {
    keys.add('32');
    keys.add('JAWA BARAT');
    keys.add('JAWA_BARAT');
    if (!provinceCode) provinceCode = '32';
  }

  return {
    provinceCode,
    cityCode,
    canonicalKeys: Array.from(keys),
  };
}

function calculatePromoDiscount({ promo, shippingCost, mitraLocation, origin, destination }) {
  if (!promo.is_active) {
    return { eligible: false, finalDiscount: 0, finalShippingCost: shippingCost };
  }

  // Check mitra location
  if (promo.mitra_scope === 'CITY_OR_REGENCY' && mitraLocation) {
    const norm = normalizeLocation(mitraLocation);
    const target = (promo.mitra_cities || []).map((c) => c.toUpperCase());
    if (!norm.canonicalKeys.some((k) => target.includes(k.toUpperCase()))) {
      return { eligible: false, reason: 'Mitra bukan dari Bandung', finalDiscount: 0, finalShippingCost: shippingCost };
    }
  }

  // Check origin
  if (promo.origin_scope === 'CITY_OR_REGENCY') {
    const norm = normalizeLocation(origin);
    const target = (promo.origin_cities || []).map((c) => c.toUpperCase());
    if (!norm.canonicalKeys.some((k) => target.includes(k.toUpperCase()))) {
      return { eligible: false, reason: 'Origin bukan Bandung/Bandung Barat', finalDiscount: 0, finalShippingCost: shippingCost };
    }
  }

  // Check destination
  if (promo.destination_scope === 'PROVINCE') {
    const norm = normalizeLocation(destination);
    const targetProv = (promo.destination_province || '').toUpperCase();
    if (norm.provinceCode !== targetProv && !norm.canonicalKeys.some((k) => k.toUpperCase() === targetProv)) {
      return { eligible: false, reason: 'Destination bukan provinsi tujuan', finalDiscount: 0, finalShippingCost: shippingCost };
    }
  } else if (promo.destination_scope === 'CITY_OR_REGENCY') {
    const norm = normalizeLocation(destination);
    const target = (promo.destination_cities || []).map((c) => c.toUpperCase());
    if (!norm.canonicalKeys.some((k) => target.includes(k.toUpperCase()))) {
      return { eligible: false, reason: 'Destination bukan target promo', finalDiscount: 0, finalShippingCost: shippingCost };
    }
  }

  let gross = 0;
  if (promo.discount_type === 'PERCENTAGE') {
    gross = Math.floor((shippingCost * promo.discount_value) / 100);
  } else {
    gross = promo.discount_value;
  }

  let finalDiscount = gross;
  if (promo.max_discount !== null && promo.max_discount > 0) {
    finalDiscount = Math.min(finalDiscount, promo.max_discount);
  }
  finalDiscount = Math.min(finalDiscount, shippingCost);

  return {
    eligible: true,
    promoCode: promo.code,
    grossDiscount: gross,
    maxDiscount: promo.max_discount,
    finalDiscount,
    finalShippingCost: shippingCost - finalDiscount,
  };
}

async function runTests() {
  console.log('=== MENJALANKAN AUTOMATED UNIT TEST PROMO SYSTEM ===\n');

  const res = await pool.query('SELECT * FROM promos WHERE is_active = true;');
  const promos = res.rows.map((r) => ({
    ...r,
    discount_value: Number(r.discount_value),
    max_discount: r.max_discount !== null ? Number(r.max_discount) : null,
    mitra_cities: Array.isArray(r.mitra_cities) ? r.mitra_cities : JSON.parse(r.mitra_cities || '[]'),
    origin_cities: Array.isArray(r.origin_cities) ? r.origin_cities : JSON.parse(r.origin_cities || '[]'),
    destination_cities: Array.isArray(r.destination_cities) ? r.destination_cities : JSON.parse(r.destination_cities || '[]'),
  }));

  const mitraBandung = { cityCode: '32.73', cityName: 'Kota Bandung' };
  const mitraJakarta = { cityCode: '31.74', cityName: 'Jakarta Selatan' };

  let passedCount = 0;
  let totalCount = 0;

  function assert(testName, condition, details = '') {
    totalCount++;
    if (condition) {
      console.log(`PASS [${testName}]`);
      passedCount++;
    } else {
      console.error(`FAIL [${testName}]: ${details}`);
    }
  }

  function getEligible(origin, dest, cost = 10000, mitra = mitraBandung) {
    return promos
      .filter((p) => calculatePromoDiscount({ promo: p, shippingCost: cost, mitraLocation: mitra, origin, destination: dest }).eligible)
      .map((p) => p.code)
      .sort();
  }

  // TEST 1: Bandung -> Jakarta
  const t1 = getEligible('32.73.01', '31.74.01');
  assert('TEST 1: Bandung -> Jakarta', t1.includes('diskonjatabek') && t1.includes('diskon10') && !t1.includes('diskonbdg') && !t1.includes('diskonjabar'), `Got: ${t1}`);

  // TEST 2: Bandung -> Tangerang
  const t2 = getEligible('32.73.01', '36.71.01');
  assert('TEST 2: Bandung -> Tangerang', t2.includes('diskonjatabek') && t2.includes('diskon10') && !t2.includes('diskonbdg'), `Got: ${t2}`);

  // TEST 3: Bandung -> Bekasi (Bekasi in Jawa Barat)
  const t3 = getEligible('32.73.01', '32.75.01');
  assert('TEST 3: Bandung -> Bekasi', t3.includes('diskonjatabek') && t3.includes('diskon10') && t3.includes('diskonjabar'), `Got: ${t3}`);

  // TEST 4: Bandung -> Bandung
  const t4 = getEligible('32.73.01', '32.73.02');
  assert('TEST 4: Bandung -> Bandung', t4.includes('diskonbdg') && t4.includes('diskon10') && t4.includes('diskonjabar'), `Got: ${t4}`);

  // TEST 5: Bandung -> Bandung Barat
  const t5 = getEligible('32.73.01', '32.17.01');
  assert('TEST 5: Bandung -> Bandung Barat', t5.includes('diskonbdg') && t5.includes('diskon10') && t5.includes('diskonjabar'), `Got: ${t5}`);

  // TEST 6: Bandung Barat -> Bandung
  const t6 = getEligible('32.17.01', '32.73.01');
  assert('TEST 6: Bandung Barat -> Bandung', t6.includes('diskonbdg') && t6.includes('diskon10') && t6.includes('diskonjabar'), `Got: ${t6}`);

  // TEST 7: Bandung -> Cimahi (Cimahi is Jawa Barat 32.77)
  const t7 = getEligible('32.73.01', '32.77.01');
  assert('TEST 7: Bandung -> Cimahi', t7.includes('diskon10') && t7.includes('diskonjabar') && !t7.includes('diskonjatabek') && !t7.includes('diskonbdg'), `Got: ${t7}`);

  // TEST 8: Bandung -> Surabaya (Surabaya is Jawa Timur 35.78)
  const t8 = getEligible('32.73.01', '35.78.01');
  assert('TEST 8: Bandung -> Surabaya', t8.includes('diskon10') && !t8.includes('diskonjatabek') && !t8.includes('diskonbdg') && !t8.includes('diskonjabar'), `Got: ${t8}`);

  // TEST 9: Jakarta -> Bandung (Origin bukan Bandung)
  const t9 = getEligible('31.74.01', '32.73.01');
  assert('TEST 9: Jakarta -> Bandung', t9.length === 0, `Expected 0, Got: ${t9}`);

  // TEST 10: Bandung -> Jakarta, ongkir 20.000, diskonjatabek -> 7.000
  const pJatabek = promos.find((p) => p.code === 'diskonjatabek');
  const calc10 = calculatePromoDiscount({ promo: pJatabek, shippingCost: 20000, mitraLocation: mitraBandung, origin: '32.73.01', destination: '31.74.01' });
  assert('TEST 10: Bandung -> Jakarta ongkir 20k diskonjatabek', calc10.finalDiscount === 7000 && calc10.finalShippingCost === 13000, `Discount: ${calc10.finalDiscount}`);

  // TEST 11: Bandung -> Bandung, ongkir 20.000, diskonbdg -> max 3.000
  const pBdg = promos.find((p) => p.code === 'diskonbdg');
  const calc11 = calculatePromoDiscount({ promo: pBdg, shippingCost: 20000, mitraLocation: mitraBandung, origin: '32.73.01', destination: '32.73.01' });
  assert('TEST 11: Bandung -> Bandung ongkir 20k diskonbdg capped 3k', calc11.finalDiscount === 3000 && calc11.finalShippingCost === 17000, `Discount: ${calc11.finalDiscount}`);

  // TEST 12: Bandung -> Bandung, ongkir 5.000, diskonbdg -> 1.750
  const calc12 = calculatePromoDiscount({ promo: pBdg, shippingCost: 5000, mitraLocation: mitraBandung, origin: '32.73.01', destination: '32.73.01' });
  assert('TEST 12: Bandung -> Bandung ongkir 5k diskonbdg = 1750', calc12.finalDiscount === 1750 && calc12.finalShippingCost === 3250, `Discount: ${calc12.finalDiscount}`);

  // TEST 13: Mitra Jakarta mencoba menggunakan promo Bandung -> Jakarta
  const t13 = getEligible('32.73.01', '31.74.01', 20000, mitraJakarta);
  assert('TEST 13: Mitra Terdaftar Jakarta (Bukan Bandung) Ditolak', t13.length === 0, `Expected 0, Got: ${t13}`);

  console.log(`\nHasil Pengujian: ${passedCount}/${totalCount} Test Passed!`);
  await pool.end();

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  pool.end();
  process.exit(1);
});
