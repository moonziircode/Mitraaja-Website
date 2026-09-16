import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const preferredRegion = 'sin1';

// Anteraja MAA API base headers
function makeMaaHeaders(token: string) {
  return {
    token,
    appid: 'JV_APP',
    msgid: Date.now().toString(),
    imei: 'dev_device_uuid_12345',
    deviceUuid: 'dev_device_uuid_12345',
    hardwareSerialNo: 'dev_serial',
    manufacture: 'Apple',
    model: 'Macbook',
    os: 'macOS',
    osVersion: '14.0',
    appVersion: '2.2.4',
    mv: '1.1',
    source: 'MAA',
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

// Resolve district name or kelurahan code to Anteraja kecamatan code
function resolveDistrictCode(district: string): string {
  const lower = district.toLowerCase().trim();
  if (lower.includes('pamulang')) return '36.74.03';
  if (lower.includes('palmerah')) return '31.73.06';
  if (lower.includes('kuningan')) return '31.74.02';
  if (lower.includes('kebayoran')) return '31.74.07';
  
  // If it's a Kelurahan code like 11.01.01.2001, trim to 11.01.01 (Kecamatan)
  if (/^\d{2}\.\d{2}\.\d{2}(\.\d+)?$/.test(district)) {
    return district.split('.').slice(0, 3).join('.');
  }
  
  return district;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // Check authentication
    if (!session.isLoggedIn || !session.token || session.token.startsWith('mock-token')) {
      return NextResponse.json(
        { success: false, message: 'Sesi tidak valid. Silakan login kembali.' },
        { status: 401 }
      );
    }

    const payload = await request.json();
    const { sender, recipient, selectedService } = payload;
    const pkg = payload.package;

    if (!sender || !recipient || !pkg || !selectedService) {
      return NextResponse.json(
        { success: false, message: 'Data pengirim, penerima, paket, dan layanan wajib diisi.' },
        { status: 400 }
      );
    }

    // Comprehensive validation for sender & recipient
    if (!sender.name?.trim() || !sender.phone?.trim() || !sender.address?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Nama, telepon, dan alamat lengkap pengirim wajib diisi.' },
        { status: 400 }
      );
    }
    if (!recipient.name?.trim() || !recipient.phone?.trim() || !recipient.address?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Nama, telepon, dan alamat lengkap penerima wajib diisi.' },
        { status: 400 }
      );
    }

    // Validate package
    if (!pkg.itemName?.trim() || !pkg.dimensions || pkg.weight <= 0 || pkg.dimensions.length <= 0 || pkg.dimensions.width <= 0 || pkg.dimensions.height <= 0) {
      return NextResponse.json(
        { success: false, message: 'Nama barang, berat (> 0 kg), dan dimensi paket (> 0 cm) wajib diisi.' },
        { status: 400 }
      );
    }

    if (!selectedService.product_code || !selectedService.delivery_price) {
      return NextResponse.json(
        { success: false, message: 'Layanan pengiriman dan tarif ongkos kirim belum dipilih.' },
        { status: 400 }
      );
    }

    // Calculate chargeable weight
    const volumetricWeight = (pkg.dimensions.length * pkg.dimensions.width * pkg.dimensions.height) / 6000;
    const chargeableWeight = Math.max(pkg.weight, volumetricWeight);

    // Build the payload for POST /task/dropoff
    // The API uses a mix of camelCase and snake_case field names.
    // We send BOTH naming conventions to ensure compatibility (tested empirically).
    const senderCode = resolveDistrictCode(sender.districtCode || sender.district);
    const recipientCode = resolveDistrictCode(recipient.districtCode || recipient.district);

    // Format coordinates & regional details
    const senderGeoloc = sender.geoloc || (sender.latitude && sender.longitude ? `${sender.latitude},${sender.longitude}` : '');
    const recipientGeoloc = recipient.geoloc || (recipient.latitude && recipient.longitude ? `${recipient.latitude},${recipient.longitude}` : '');

    const senderDistrictName = sender.districtName || sender.district_name || sender.district || '';
    const senderSubdistrict = sender.subdistrict || sender.subdistrict_name || sender.kelurahan || '';
    const senderCity = sender.city || sender.cityName || sender.city_name || '';
    const senderProvince = sender.province || sender.provinceName || sender.province_name || sender.proviceName || '';
    const senderPostcode = (sender.postalCode || sender.postcode || sender.postal_code || '').trim();

    const recipientDistrictName = recipient.districtName || recipient.district_name || recipient.district || '';
    const recipientSubdistrict = recipient.subdistrict || recipient.subdistrict_name || recipient.kelurahan || '';
    const recipientCity = recipient.city || recipient.cityName || recipient.city_name || '';
    const recipientProvince = recipient.province || recipient.provinceName || recipient.province_name || recipient.proviceName || '';
    const recipientPostcode = (recipient.postalCode || recipient.postcode || recipient.postal_code || '').trim();

    const orderPayload: Record<string, unknown> = {
      // Agent identity
      agent_staff_id: session.nia,
      agentStaffId: session.nia,

      // Service type — send all known field-name variants
      serviceType: selectedService.product_code,
      service_type: selectedService.product_code,
      product_code: selectedService.product_code,
      productCode: selectedService.product_code,
      type: selectedService.product_code,
      servicetype: selectedService.product_code,

      // Item info — both camelCase and snake_case
      itemName: pkg.itemName,
      item_name: pkg.itemName,

      // Weight — use Number() to ensure it's a proper numeric type
      weight: Number(chargeableWeight),
      parcel_total_weight: Number(chargeableWeight),

      // Price
      deliveryPrice: Number(selectedService.delivery_price),
      delivery_price: Number(selectedService.delivery_price),

      // Item value
      itemValue: Number(pkg.value),
      item_value: Number(pkg.value),

      // Note (catatan instruksi kurir)
      note: payload.note || pkg.note || '',

      // Promo tracking (jika ada)
      ...(payload.promoCode ? {
        promo_code: payload.promoCode,
        promoCode: payload.promoCode,
        promo_amount: Number(payload.promoAmount || 0),
        total_price: Number(payload.totalPrice || selectedService.delivery_price),
      } : {}),

      // Sender info
      shipperInfo: {
        name: sender.name,
        phone: sender.phone,
        address: sender.address,
        districtCode: senderCode,
        district_code: senderCode,
        districtName: senderDistrictName,
        district_name: senderDistrictName,
        subdistrict: senderSubdistrict,
        subdistrict_name: senderSubdistrict,
        cityName: senderCity,
        city_name: senderCity,
        proviceName: senderProvince,
        provice_name: senderProvince,
        provinceName: senderProvince,
        province_name: senderProvince,
        postcode: senderPostcode,
        zip: senderPostcode,
        geoloc: senderGeoloc || undefined,
        latitude: sender.latitude ?? null,
        longitude: sender.longitude ?? null,
      },
      shipper_info: {
        name: sender.name,
        phone: sender.phone,
        address: sender.address,
        districtCode: senderCode,
        district_code: senderCode,
        districtName: senderDistrictName,
        district_name: senderDistrictName,
        subdistrict: senderSubdistrict,
        subdistrict_name: senderSubdistrict,
        cityName: senderCity,
        city_name: senderCity,
        proviceName: senderProvince,
        provice_name: senderProvince,
        provinceName: senderProvince,
        province_name: senderProvince,
        postcode: senderPostcode,
        zip: senderPostcode,
        geoloc: senderGeoloc || undefined,
        latitude: sender.latitude ?? null,
        longitude: sender.longitude ?? null,
      },

      // Receiver info
      receiverInfo: {
        name: recipient.name,
        phone: recipient.phone,
        address: recipient.address,
        districtCode: recipientCode,
        district_code: recipientCode,
        districtName: recipientDistrictName,
        district_name: recipientDistrictName,
        subdistrict: recipientSubdistrict,
        subdistrict_name: recipientSubdistrict,
        cityName: recipientCity,
        city_name: recipientCity,
        proviceName: recipientProvince,
        provice_name: recipientProvince,
        provinceName: recipientProvince,
        province_name: recipientProvince,
        postcode: recipientPostcode,
        zip: recipientPostcode,
        geoloc: recipientGeoloc || undefined,
        latitude: recipient.latitude ?? null,
        longitude: recipient.longitude ?? null,
      },
      receiver_info: {
        name: recipient.name,
        phone: recipient.phone,
        address: recipient.address,
        districtCode: recipientCode,
        district_code: recipientCode,
        districtName: recipientDistrictName,
        district_name: recipientDistrictName,
        subdistrict: recipientSubdistrict,
        subdistrict_name: recipientSubdistrict,
        cityName: recipientCity,
        city_name: recipientCity,
        proviceName: recipientProvince,
        provice_name: recipientProvince,
        provinceName: recipientProvince,
        province_name: recipientProvince,
        postcode: recipientPostcode,
        zip: recipientPostcode,
        geoloc: recipientGeoloc || undefined,
        latitude: recipient.latitude ?? null,
        longitude: recipient.longitude ?? null,
      },

      // Items detail (tanpa asuransi)
      items: [
        {
          itemName: pkg.itemName,
          item_name: pkg.itemName,
          itemDesc: pkg.itemDesc || pkg.itemName,
          item_desc: pkg.itemDesc || pkg.itemName,
          itemCategory: pkg.category || 'Lainnya',
          item_category: pkg.category || 'Lainnya',
          declaredValue: Number(pkg.value),
          declared_value: Number(pkg.value),
          weight: Number(pkg.weight),
          width: Number(pkg.dimensions.width),
          length: Number(pkg.dimensions.length),
          height: Number(pkg.dimensions.height),
          fragile: Boolean(pkg.fragile),
        },
      ],
    };

    // POST to Anteraja drop-off endpoint
    const apiBase = process.env.ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';
    const url = `${apiBase}/task/dropoff`;

    const res = await fetch(url, {
      method: 'POST',
      headers: makeMaaHeaders(session.token),
      body: JSON.stringify([orderPayload]),
    });

    const body = await res.json();

    if (body.status !== 0 || !body.content || body.content.length === 0) {
      const errorInfo = body.info || 'Gagal membuat order.';
      const validationErrors = body.content && typeof body.content === 'object' && !Array.isArray(body.content)
        ? Object.entries(body.content).map(([k, v]) => `${k}: ${v}`).join(', ')
        : '';
      return NextResponse.json(
        {
          success: false,
          message: validationErrors ? `${errorInfo} (${validationErrors})` : errorInfo,
        },
        { status: 400 }
      );
    }

    const task = body.content[0];
    const taskCode = task.task_code;
    const waybillNo = task.waybill_no;

    return NextResponse.json(
      {
        success: true,
        taskCode,
        awb: waybillNo || taskCode, // Use waybill if available, otherwise task_code
        paymentStatus: task.payment_status,
        taskStatus: task.task_status,
        deliveryPrice: task.delivery_price,
        totalDeliveryPrice: task.total_delivery_price,
        expiredAt: task.expired_at,
        shipperInfo: task.shipper_info,
        receiverInfo: task.receiver_info,
        message: waybillNo
          ? `Order berhasil! AWB: ${waybillNo}`
          : `Order berhasil dibuat! Kode Order: ${taskCode}. AWB akan digenerate setelah pembayaran dikonfirmasi.`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memproses pembuatan order';
    console.error('[POST /api/orders/create] Error:', message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
