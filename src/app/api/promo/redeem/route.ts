import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { firestore } from '@/lib/firebaseAdmin';

export const preferredRegion = 'sin1';

const JABODETABEK_CITY_CODES = [
  '31.01', '31.71', '31.72', '31.73', '31.74', '31.75', // DKI Jakarta
  '32.01', '32.71', '32.76', '32.16', '32.75',          // Kab/Kota Bogor, Depok, Kab/Kota Bekasi
  '36.03', '36.71', '36.74'                             // Kab/Kota Tangerang, Tangsel
];

function isCityJabodetabek(districtCode: string): boolean {
  if (!districtCode) return false;
  // districtCode is e.g. "32.75.01" (Kecamatan) or "32.75" (City)
  const parts = districtCode.split('.');
  if (parts.length >= 2) {
    const cityCode = `${parts[0]}.${parts[1]}`;
    return JABODETABEK_CITY_CODES.includes(cityCode);
  }
  return false;
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session.isLoggedIn || !session.token) {
    return NextResponse.json({
      status: 401,
      info: 'Sesi tidak valid. Silakan login kembali.',
      content: null
    });
  }

  if (!firestore) {
    return NextResponse.json({
      status: 500,
      info: 'Firestore tidak diinisialisasi',
      content: null
    });
  }

  try {
    const body = await request.json();
    const { promo_code, task } = body as {
      promo_code: string;
      task: Array<{
        task_code: string;
        base_price: number;
        total_price: number;
        promo_amount: number;
      }>;
    };

    if (!promo_code || !task || task.length === 0) {
      return NextResponse.json({
        status: 400,
        info: 'Parameter promo_code dan task wajib diisi.',
        content: null
      });
    }

    // 1. Fetch promo from Firestore
    const promoDoc = await firestore.collection('promos').doc(promo_code.toUpperCase()).get();
    if (!promoDoc.exists) {
      return NextResponse.json({
        status: 404,
        info: `Kode promo "${promo_code}" tidak ditemukan.`,
        content: null
      });
    }

    const promo = promoDoc.data();
    if (!promo) {
      return NextResponse.json({
        status: 500,
        info: 'Data promo kosong.',
        content: null
      });
    }

    // 2. Validate Active
    if (!promo.is_active) {
      return NextResponse.json({
        status: 400,
        info: `Kode promo "${promo_code}" sedang tidak aktif.`,
        content: null
      });
    }

    // 3. Validate Expired
    const now = new Date();
    const validToDate = new Date(promo.valid_to);
    if (validToDate < now) {
      return NextResponse.json({
        status: 400,
        info: `Kode promo "${promo_code}" telah kedaluwarsa.`,
        content: null
      });
    }

    // 4. Calculate total base price of all tasks
    const totalBasePrice = task.reduce((sum, t) => sum + (t.base_price || 0), 0);

    // 5. Validate Minimum Transaction
    if (totalBasePrice < (promo.min_transaction || 0)) {
      return NextResponse.json({
        status: 400,
        info: `Minimal transaksi untuk promo ini adalah Rp ${Number(promo.min_transaction).toLocaleString('id-ID')}.`,
        content: null
      });
    }

    // 6. Fetch task details from Anteraja API to check region & product constraints
    const apiBase = process.env.ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';
    const updatedTasks: any[] = [];
    let totalDiscount = 0;

    for (const t of task) {
      let productCode = 'ALL';
      let originCode = '';
      let destCode = '';

      // Try to query real order details if not mock token
      if (!session.token.startsWith('mock-token')) {
        try {
          const detailUrl = `${apiBase}/order/v2/task/dropoff/detail?task_code=${t.task_code}`;
          const detailRes = await fetch(detailUrl, {
            method: 'GET',
            headers: {
              token: session.token,
              appid: 'JV_APP',
              msgid: Date.now().toString(),
              imei: 'dev_device_uuid_12345',
              deviceUuid: 'dev_device_uuid_12345',
              source: 'MAA',
              Accept: 'application/json'
            }
          });

          if (detailRes.ok) {
            const detailBody = await detailRes.json();
            if (detailBody.status === 0 && detailBody.content) {
              productCode = detailBody.content.service_type || detailBody.content.product_code || 'ALL';
              originCode = detailBody.content.shipper_info?.district_code || '';
              destCode = detailBody.content.receiver_info?.district_code || '';
            }
          }
        } catch (err: any) {
          console.warn('Failed to fetch task details for promo validation:', err.message);
        }
      }

      // 7. Validate Product constraint
      if (promo.product_code !== 'ALL' && productCode !== 'ALL') {
        if (promo.product_code.toUpperCase() !== productCode.toUpperCase()) {
          return NextResponse.json({
            status: 400,
            info: `Promo ini hanya berlaku untuk pengiriman layanan ${promo.product_code}.`,
            content: null
          });
        }
      }

      // 8. Validate Region constraint (Jabodetabek)
      if (promo.region_scope === 'JABODETABEK' && originCode && destCode) {
        const originJabo = isCityJabodetabek(originCode);
        const destJabo = isCityJabodetabek(destCode);
        if (!originJabo || !destJabo) {
          return NextResponse.json({
            status: 400,
            info: 'Promo ini hanya berlaku untuk pengiriman dari dan ke wilayah JABODETABEK.',
            content: null
          });
        }
      }

      // 9. Calculate discount for this task
      let discount = 0;
      if (promo.discount_type === 'percentage') {
        discount = Math.floor((t.base_price * (promo.discount_value || 0)) / 100);
        if (promo.max_discount && discount > promo.max_discount) {
          discount = promo.max_discount;
        }
      } else {
        discount = promo.discount_value || 0;
      }

      // Discount cannot exceed base price
      if (discount > t.base_price) {
        discount = t.base_price;
      }

      totalDiscount += discount;

      updatedTasks.push({
        task_code: t.task_code,
        base_price: t.base_price,
        total_price: t.base_price - discount,
        promo_amount: discount
      });
    }

    return NextResponse.json({
      status: 0,
      info: 'OK',
      content: {
        promo_code: promo.code,
        total_promo: totalDiscount,
        task: updatedTasks
      }
    });

  } catch (error: any) {
    console.error('Error redeeming promo:', error.message);
    return NextResponse.json({
      status: 500,
      info: error.message || 'Terjadi kesalahan internal pada server.',
      content: null
    });
  }
}
