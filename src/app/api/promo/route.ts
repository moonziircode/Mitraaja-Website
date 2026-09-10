import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllActivePromos } from '@/lib/promo-db';
import { rankEligiblePromos, calculatePromoDiscount } from '@/lib/promo-engine';

export const preferredRegion = 'sin1';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);

    const originCode = searchParams.get('originCode') || searchParams.get('origin') || '';
    const destinationCode = searchParams.get('destinationCode') || searchParams.get('destination') || '';
    const shippingCostStr = searchParams.get('shippingCost') || searchParams.get('deliveryPrice') || '0';
    const shippingCost = Number(shippingCostStr) || 0;
    const searchKey = searchParams.get('search_key');

    const allPromos = await getAllActivePromos();

    // Sesi mitra login untuk verifikasi registrasi mitra
    const mitraLocation = session.districtCode || undefined;

    // Jika origin dan destination disediakan, lakukan auto-filtering & ranking
    if (originCode && destinationCode) {
      const eligiblePromos = rankEligiblePromos(allPromos, {
        shippingCost,
        mitraLocation,
        origin: originCode,
        destination: destinationCode,
      });

      return NextResponse.json({
        status: 0,
        info: 'OK',
        content: eligiblePromos,
        mitraEligible: mitraLocation ? true : false,
      });
    }

    // Default: Kembalikan seluruh promo yang aktif
    const list = allPromos
      .filter((p) => {
        if (!searchKey) return true;
        const key = searchKey.toLowerCase();
        return (
          p.code.toLowerCase().includes(key) ||
          p.name.toLowerCase().includes(key) ||
          (p.description && p.description.toLowerCase().includes(key))
        );
      })
      .map((p) => ({
        code: p.code,
        name: p.name,
        title: p.name,
        description: p.description || '',
        discount_type: p.discount_type,
        discount_value: p.discount_value,
        max_discount: p.max_discount,
        valid_to: p.end_at ? new Date(p.end_at).toISOString() : '',
      }));

    return NextResponse.json({
      status: 0,
      info: 'OK',
      content: list,
    });
  } catch (error: any) {
    console.error('Error in GET /api/promo:', error);
    return NextResponse.json({
      status: 500,
      info: error.message || 'Gagal memuat promo',
      content: [],
    });
  }
}
