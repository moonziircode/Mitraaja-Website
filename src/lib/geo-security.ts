/**
 * Modul Keamanan & Verifikasi Geolocation (Anti-Fake GPS)
 * Memastikan titik koordinat riil dengan akurasi tinggi dan mendeteksi pemalsuan lokasi (Fake GPS).
 */

export interface VerifiedLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  isMockDetected: boolean;
  timestamp: number;
}

export class GeoSecurityError extends Error {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED' | 'FAKE_GPS_DETECTED' | 'LOW_ACCURACY';

  constructor(message: string, code: GeoSecurityError['code']) {
    super(message);
    this.name = 'GeoSecurityError';
    this.code = code;
  }
}

/**
 * Deteksi manipulasi Geolocation API (Browser extension spoofing atau mock location).
 */
function inspectForTampering(): boolean {
  if (typeof window === 'undefined' || !navigator.geolocation) return false;

  try {
    // 1. Periksa apakah getCurrentPosition telah di-override oleh extension (bukan native code)
    const fnStr = Function.prototype.toString.call(navigator.geolocation.getCurrentPosition);
    if (!fnStr.includes('[native code]')) {
      return true; // Terindikasi Fake GPS extension
    }

    const watchStr = Function.prototype.toString.call(navigator.geolocation.watchPosition);
    if (!watchStr.includes('[native code]')) {
      return true;
    }
  } catch {
    // Abaikan jika browser membatasi inspeksi prototype
  }

  return false;
}

/**
 * Dapatkan posisi koordinat terkini dengan penegakan akurasi tinggi dan validasi anti-fake GPS.
 * @param maxAllowedAccuracyMeters Maksimal radius toleransi akurasi dalam meter (default: 150m)
 */
export async function getStrictAccurateLocation(maxAllowedAccuracyMeters: number = 150): Promise<VerifiedLocation> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new GeoSecurityError(
      'Perangkat atau browser Anda tidak mendukung fitur Geolocation GPS.',
      'NOT_SUPPORTED'
    );
  }

  // Cek apakah API Geolocation telah dimanipulasi oleh ekstensi Fake GPS
  if (inspectForTampering()) {
    throw new GeoSecurityError(
      'Terdeteksi ekstensi atau script pengubah lokasi (Fake GPS). Nonaktifkan ekstensi pemalsu lokasi untuk melanjutkan.',
      'FAKE_GPS_DETECTED'
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // 1. Cek flag mock bawaan browser/Android WebView
        const isMocked = Boolean(
          (position as any).mocked === true ||
          (position.coords as any).isMock === true ||
          (position.coords as any).mockLocation === true
        );

        if (isMocked) {
          return reject(
            new GeoSecurityError(
              'Terdeteksi penggunaan Mock Location / Fake GPS pada perangkat. Nonaktifkan aplikasi Fake GPS sekarang!',
              'FAKE_GPS_DETECTED'
            )
          );
        }

        // 2. Validasi rentang koordinat matematis
        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number' ||
          isNaN(latitude) ||
          isNaN(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180 ||
          (latitude === 0 && longitude === 0)
        ) {
          return reject(
            new GeoSecurityError(
              'Titik koordinat yang diterima tidak valid.',
              'POSITION_UNAVAILABLE'
            )
          );
        }

        // 3. Akurasi 0 meter hampir pasti merupakan hasil injeksi fake GPS buatan (karena GPS riil selalu memiliki dispersi)
        if (accuracy === 0) {
          return reject(
            new GeoSecurityError(
              'Akurasi 0 meter terindikasi injeksi koordinat palsu (Fake GPS).',
              'FAKE_GPS_DETECTED'
            )
          );
        }

        // 4. Validasi batas maksimal toleransi akurasi (mencegah fallback IP geolocation yang tidak akurat)
        if (accuracy > maxAllowedAccuracyMeters) {
          return reject(
            new GeoSecurityError(
              `Akurasi sinyal GPS terlalu rendah (±${Math.round(accuracy)}m). Sistem mewajibkan akurasi di bawah ${maxAllowedAccuracyMeters}m. Pastikan GPS perangkat aktif dalam mode Akurasi Tinggi.`,
              'LOW_ACCURACY'
            )
          );
        }

        resolve({
          latitude,
          longitude,
          accuracy: Math.round(accuracy * 100) / 100,
          isMockDetected: false,
          timestamp: position.timestamp || Date.now(),
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(
              new GeoSecurityError(
                'Izin akses lokasi ditolak. Anda WAJIB mengizinkan akses lokasi pada browser untuk dapat menggunakan sistem.',
                'PERMISSION_DENIED'
              )
            );
            break;
          case error.POSITION_UNAVAILABLE:
            reject(
              new GeoSecurityError(
                'Sinyal GPS / lokasi tidak dapat ditemukan. Pastikan layanan lokasi GPS pada perangkat Anda sudah menyala.',
                'POSITION_UNAVAILABLE'
              )
            );
            break;
          case error.TIMEOUT:
            reject(
              new GeoSecurityError(
                'Waktu pencarian koordinat GPS habis. Pastikan perangkat Anda memiliki sinyal GPS yang baik.',
                'TIMEOUT'
              )
            );
            break;
          default:
            reject(
              new GeoSecurityError(
                `Gagal mengambil koordinat lokasi: ${error.message}`,
                'POSITION_UNAVAILABLE'
              )
            );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // Wajib posisi baru, bukan cache lama
      }
    );
  });
}
