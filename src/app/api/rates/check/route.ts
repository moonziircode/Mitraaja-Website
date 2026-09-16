import { NextRequest, NextResponse } from 'next/server';
import { anterajaClient } from '@/lib/anteraja-client';
import { getSession } from '@/lib/auth';
import { getAllActivePromos, getPromoByCode } from '@/lib/promo-db';
import { calculatePromoDiscount, rankEligiblePromos } from '@/lib/promo-engine';

export const preferredRegion = 'sin1';

export async function POST(request: NextRequest) {
  const session = await getSession();

  try {
    const body = await request.json();
    const { origin, destination, weight, originCode, destinationCode, promoCode } = body as {
      origin: string;
      destination: string;
      weight: number;
      originCode?: string;
      destinationCode?: string;
      promoCode?: string;
    };

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
      // If code is like 11.01.01.2001 (Kelurahan), trim to 11.01.01 (Kecamatan)
      if (/^\d{2}\.\d{2}\.\d{2}(\.\d+)?$/.test(val)) {
        return val.split('.').slice(0, 3).join('.');
      }
      return val;
    };

    const originCodeFinal = resolveCode(originCode || origin);
    const destinationCodeFinal = resolveCode(destinationCode || destination);

    // Helper to enrich rates with authoritative promo engine calculations
    const enrichRatesWithPromos = async (rawRates: any[]) => {
      const mitraLocation = session.districtCode || undefined;
      let allActivePromos: any[] = [];
      try {
        allActivePromos = await getAllActivePromos();
      } catch (dbErr) {
        console.error('[Rates Check] Failed to fetch active promos:', dbErr);
      }

      let specificPromo: any = null;
      let promoErrorMsg: string | null = null;
      const cleanPromoCode = (promoCode || '').trim().toLowerCase();

      if (cleanPromoCode) {
        try {
          specificPromo = await getPromoByCode(cleanPromoCode);
          if (!specificPromo) {
            promoErrorMsg = `Kode promo "${promoCode}" tidak ditemukan.`;
          }
        } catch (err: any) {
          promoErrorMsg = 'Gagal memvalidasi kode promo.';
        }
      }

      const enriched = rawRates.map((rate: any) => {
        const shippingCost = Number(rate.delivery_price) || 0;

        // Rank eligible promos for this specific service
        const eligiblePromos = rankEligiblePromos(allActivePromos, {
          shippingCost,
          mitraLocation,
          origin: originCodeFinal,
          destination: destinationCodeFinal,
        });

        const recommendedPromo = eligiblePromos.length > 0 ? eligiblePromos[0] : null;

        let appliedPromoData: any = null;
        let ratePromoError: string | null = promoErrorMsg;

        if (specificPromo) {
          const calc = calculatePromoDiscount({
            promo: specificPromo,
            shippingCost,
            mitraLocation,
            origin: originCodeFinal,
            destination: destinationCodeFinal,
          });

          if (calc.eligible) {
            appliedPromoData = {
              promo_code: specificPromo.code,
              promo_name: specificPromo.name,
              discount_amount: calc.finalDiscount,
              final_price: calc.finalShippingCost,
              discount_percentage: calc.discountPercentage,
              max_discount: calc.maxDiscount,
            };
            ratePromoError = null;
          } else {
            ratePromoError = calc.ineligibleReason || 'Kode promo tidak memenuhi syarat untuk rute ini.';
          }
        }

        return {
          ...rate,
          applied_promo: appliedPromoData,
          promo_error: ratePromoError,
          eligible_promos: eligiblePromos,
          recommended_promo: recommendedPromo,
        };
      });

      const primary = enriched[0] || null;
      return {
        rates: enriched,
        applied_promo: primary?.applied_promo || null,
        promo_error: primary?.promo_error || promoErrorMsg,
        eligible_promos: primary?.eligible_promos || [],
        recommended_promo: primary?.recommended_promo || null,
      };
    };

    // If active session token is present, fetch real rates
    if (session.isLoggedIn && session.token && !session.token.startsWith('mock-token')) {
      try {
        const rates = await anterajaClient.getRates(originCodeFinal, destinationCodeFinal, weight, session.token);
        const promoResult = await enrichRatesWithPromos(rates);
        return NextResponse.json({
          success: true,
          content: promoResult.rates,
          applied_promo: promoResult.applied_promo,
          promo_error: promoResult.promo_error,
          eligible_promos: promoResult.eligible_promos,
          recommended_promo: promoResult.recommended_promo,
        });
      } catch (err: any) {
        console.error('Gagal mengambil tarif riil Anteraja:', err.message);
        
        let errorMessage = err.message || 'Gagal mengambil tarif riil Anteraja. Pastikan rute valid.';
        if (errorMessage.includes('Status: 401')) {
          errorMessage = 'Sesi login telah berakhir. Silakan Logout dan Login kembali.';
        }

        return NextResponse.json(
          { success: false, info: errorMessage },
          { status: 400 }
        );
      }
    }

    // Filter mock rates realistically
    if (weight > 300) {
      return NextResponse.json(
        { success: false, info: 'Berat tertagih melebihi batas maksimal 300 kg' },
        { status: 400 }
      );
    }

    const isSameRegency = /^\d{2}\.\d{2}/.test(originCodeFinal) && /^\d{2}\.\d{2}/.test(destinationCodeFinal) && originCodeFinal.substring(0, 5) === destinationCodeFinal.substring(0, 5);
    const isSameProvince = /^\d{2}\./.test(originCodeFinal) && /^\d{2}\./.test(destinationCodeFinal) && originCodeFinal.substring(0, 2) === destinationCodeFinal.substring(0, 2);

    const mockRates = [];

    if (weight <= 50) {
      mockRates.push({
        product_code: 'REG',
        product_name: 'Anteraja Regular',
        duration: '1-2 Day',
        weight: weight,
        delivery_price: 11500 * weight,
        status: 'ACTIVE',
        pickup_start: null as string | null,
        pickup_end: null as string | null
      });
    }

    if (isSameProvince && weight <= 50) {
      mockRates.push({
        product_code: 'ND',
        product_name: 'Anteraja Next Day',
        duration: '1 Day',
        weight: weight,
        delivery_price: 15300 * weight,
        status: 'ACTIVE',
        pickup_start: null,
        pickup_end: null
      });
    }

    if (isSameRegency && weight <= 10) {
      mockRates.push({
        product_code: 'SD',
        product_name: 'Anteraja Same Day',
        duration: '0 Day',
        weight: weight,
        delivery_price: 22500 * weight,
        status: 'ACTIVE',
        pickup_start: '00:00:00',
        pickup_end: '14:00:00'
      });
    }

    if (mockRates.length === 0) {
      return NextResponse.json(
        { success: false, info: 'Tidak ada layanan yang tersedia untuk rute dan berat tersebut.' },
        { status: 400 }
      );
    }

    const promoResult = await enrichRatesWithPromos(mockRates);
    return NextResponse.json({
      success: true,
      content: promoResult.rates,
      applied_promo: promoResult.applied_promo,
      promo_error: promoResult.promo_error,
      eligible_promos: promoResult.eligible_promos,
      recommended_promo: promoResult.recommended_promo,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, info: err.message || 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

