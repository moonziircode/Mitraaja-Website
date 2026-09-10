import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPromoByCode } from '@/lib/promo-db';
import { calculatePromoDiscount, isMitraEligible } from '@/lib/promo-engine';

export const preferredRegion = 'sin1';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session.isLoggedIn || !session.token) {
    return NextResponse.json({
      status: 401,
      info: 'Sesi tidak valid. Silakan login kembali.',
      content: null,
    });
  }

  try {
    const body = await request.json();
    const { promo_code, task, originCode, destinationCode, origin, destination } = body as {
      promo_code: string;
      task?: Array<{
        task_code: string;
        base_price: number;
        total_price: number;
        promo_amount: number;
      }>;
      originCode?: string;
      destinationCode?: string;
      origin?: any;
      destination?: any;
    };

    if (!promo_code) {
      return NextResponse.json({
        status: 400,
        info: 'Parameter promo_code wajib diisi.',
        content: null,
      });
    }

    const promo = await getPromoByCode(promo_code);
    if (!promo) {
      return NextResponse.json({
        status: 404,
        info: `Kode promo "${promo_code}" tidak ditemukan.`,
        content: null,
      });
    }

    // 1. Validasi Lokasi Registrasi Mitra (Sesi Login)
    const mitraLocation = session.districtCode || undefined;
    const mitraCheck = isMitraEligible(promo, mitraLocation);
    if (!mitraCheck.eligible) {
      return NextResponse.json({
        status: 403,
        info: mitraCheck.reason || 'Promo ini hanya berlaku untuk mitra yang terdaftar di wilayah Bandung / Bandung Barat.',
        content: null,
      });
    }

    // 2. Hitung Total Base Price
    const taskList = task && task.length > 0 ? task : [{ task_code: 'TASK-1', base_price: 0, total_price: 0, promo_amount: 0 }];
    const totalBasePrice = taskList.reduce((sum, t) => sum + (t.base_price || 0), 0);

    // 3. Tentukan Origin dan Destination
    const originInput = originCode || origin;
    const destInput = destinationCode || destination;

    // 4. Hitung Diskon Otoritatif di Backend
    const calc = calculatePromoDiscount({
      promo,
      shippingCost: totalBasePrice,
      mitraLocation,
      origin: originInput,
      destination: destInput,
    });

    if (!calc.eligible) {
      return NextResponse.json({
        status: 400,
        info: calc.ineligibleReason || 'Kode promo tidak memenuhi syarat untuk pengiriman ini.',
        content: null,
      });
    }

    // Update task pricing
    const updatedTasks = taskList.map((t) => {
      const taskDiscount = Math.min(calc.finalDiscount, t.base_price);
      return {
        task_code: t.task_code,
        base_price: t.base_price,
        total_price: Math.max(0, t.base_price - taskDiscount),
        promo_amount: taskDiscount,
      };
    });

    return NextResponse.json({
      status: 0,
      info: 'OK',
      content: {
        promo_code: promo.code,
        promo_name: promo.name,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        max_discount: promo.max_discount,
        total_promo: calc.finalDiscount,
        final_shipping_cost: calc.finalShippingCost,
        task: updatedTasks,
      },
    });
  } catch (error: any) {
    console.error('Error redeeming promo:', error);
    return NextResponse.json({
      status: 500,
      info: error.message || 'Terjadi kesalahan internal server.',
      content: null,
    });
  }
}
