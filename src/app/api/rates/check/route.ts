import { NextRequest, NextResponse } from 'next/server';
import { anterajaClient } from '@/lib/anteraja-client';
import { getSession } from '@/lib/auth';

export const preferredRegion = 'sin1';

export async function POST(request: NextRequest) {
  const session = await getSession();

  try {
    const body = await request.json();
    const { origin, destination, weight } = body as { origin: string; destination: string; weight: number };

    if (!origin || !destination || !weight) {
      return NextResponse.json(
        { success: false, info: 'Parameter origin, destination, dan weight wajib diisi.' },
        { status: 400 }
      );
    }

    // Resolve keywords to Anteraja administrative codes
    const resolveCode = (val: string) => {
      const lower = val.toLowerCase().trim();
      if (lower.includes('pamulang')) return '36.74.03';
      if (lower.includes('palmerah')) return '31.73.06';
      if (/^\d{2}\.\d{2}\.\d{2}$/.test(val)) return val;
      return val;
    };

    const originCode = resolveCode(origin);
    const destinationCode = resolveCode(destination);

    // If active session token is present, fetch real rates
    if (session.isLoggedIn && session.token && !session.token.startsWith('mock-token')) {
      try {
        const rates = await anterajaClient.getRates(originCode, destinationCode, weight, session.token);
        return NextResponse.json({ success: true, content: rates });
      } catch (err: any) {
        console.error('Gagal mengambil tarif riil Anteraja, beralih ke simulasi:', err.message);
      }
    }

    // Fallback to simulated/mock rates
    const mockRates = [
      {
        product_code: 'REG',
        product_name: 'Anteraja Regular',
        duration: '1-2 Day',
        weight: weight,
        delivery_price: 11500 * weight,
        status: 'ACTIVE',
        pickup_start: null,
        pickup_end: null
      },
      {
        product_code: 'ND',
        product_name: 'Anteraja Next Day',
        duration: '1 Day',
        weight: weight,
        delivery_price: 15300 * weight,
        status: 'ACTIVE',
        pickup_start: null,
        pickup_end: null
      },
      {
        product_code: 'SD',
        product_name: 'Anteraja Same Day',
        duration: '0 Day',
        weight: weight,
        delivery_price: 22500 * weight,
        status: 'ACTIVE',
        pickup_start: '00:00:00',
        pickup_end: '14:00:00'
      }
    ];

    return NextResponse.json({ success: true, content: mockRates });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, info: err.message || 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
