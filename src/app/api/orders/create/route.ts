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

// Resolve district name to Anteraja district code
function resolveDistrictCode(district: string): string {
  const lower = district.toLowerCase().trim();
  if (lower.includes('pamulang')) return '36.74.03';
  if (lower.includes('palmerah')) return '31.73.06';
  if (lower.includes('kuningan')) return '31.74.02';
  if (lower.includes('kebayoran')) return '31.74.07';
  // If it's already a code like 31.73.06, return as-is
  if (/^\d{2}\.\d{2}\.\d{2}$/.test(district)) return district;
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

    // Calculate chargeable weight
    const volumetricWeight = (pkg.dimensions.length * pkg.dimensions.width * pkg.dimensions.height) / 6000;
    const chargeableWeight = Math.max(pkg.weight, volumetricWeight);

    // Build the payload for POST /task/dropoff
    // The API uses a mix of camelCase and snake_case field names.
    // We send BOTH naming conventions to ensure compatibility (tested empirically).
    const senderCode = resolveDistrictCode(sender.district);
    const recipientCode = resolveDistrictCode(recipient.district);

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

      // Sender info
      shipperInfo: {
        name: sender.name,
        phone: sender.phone,
        address: sender.address,
        districtCode: senderCode,
        district_code: senderCode,
        postcode: sender.postalCode,
      },
      shipper_info: {
        name: sender.name,
        phone: sender.phone,
        address: sender.address,
        districtCode: senderCode,
        district_code: senderCode,
        postcode: sender.postalCode,
      },

      // Receiver info
      receiverInfo: {
        name: recipient.name,
        phone: recipient.phone,
        address: recipient.address,
        districtCode: recipientCode,
        district_code: recipientCode,
        postcode: recipient.postalCode,
      },
      receiver_info: {
        name: recipient.name,
        phone: recipient.phone,
        address: recipient.address,
        districtCode: recipientCode,
        district_code: recipientCode,
        postcode: recipient.postalCode,
      },

      // Insurance
      useInsurance: false,
      use_insurance: false,

      // Items detail
      items: [
        {
          itemName: pkg.itemName,
          item_name: pkg.itemName,
          itemDesc: pkg.itemName,
          item_desc: pkg.itemName,
          itemCategory: pkg.category || 'Lainnya',
          item_category: pkg.category || 'Lainnya',
          declaredValue: Number(pkg.value),
          declared_value: Number(pkg.value),
          weight: Number(pkg.weight),
          width: Number(pkg.dimensions.width),
          length: Number(pkg.dimensions.length),
          height: Number(pkg.dimensions.height),
          fragile: false,
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
