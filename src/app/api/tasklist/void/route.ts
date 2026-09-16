import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import axios from "axios";
import { markOrderAsVoided } from "@/lib/voided-orders-db";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.token) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { taskCode, reason } = await request.json();
    if (!taskCode) {
      return NextResponse.json({ message: "taskCode diperlukan." }, { status: 400 });
    }

    const cleanTaskCode = String(taskCode).trim();
    const voidReason = reason || "Batal oleh Agent";

    // 1. Immediately record in persistent database so it never shows up again
    await markOrderAsVoided(cleanTaskCode, session.nia, voidReason);

    // 2. Call Anteraja API to cancel upstream
    const rawBase = process.env.ANTERAJA_API_BASE_URL || process.env.NEXT_PUBLIC_ANTERAJA_API_URL || "https://api.anteraja.id/maa-task";
    const apiBase = rawBase.includes('/maa-task') ? rawBase : `${rawBase.replace(/\/$/, '')}/maa-task`;
    const endpoint = `${apiBase}/task/v2/void`;

    try {
      const response = await axios.post(
        endpoint,
        { 
          task_code: cleanTaskCode,
          taskCode: cleanTaskCode 
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "token": session.token,
            "appid": "JV_APP",
            "msgid": Date.now().toString(),
            "imei": "dev_device_uuid_12345",
            "deviceUuid": "dev_device_uuid_12345",
            "hardwareSerialNo": "dev_serial",
            "manufacture": "Apple",
            "model": "Macbook",
            "os": "macOS",
            "osVersion": "14.0",
            "appVersion": "2.2.4",
            "mv": "1.1",
            "source": "MAA",
          },
          validateStatus: () => true,
        }
      );

      console.log(`[POST Tasklist Void] Code: ${cleanTaskCode}, Anteraja Status: ${response.status}`, response.data);
    } catch (apiErr: any) {
      console.warn("[POST Tasklist Void] Upstream call warning:", apiErr?.message);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Pesanan berhasil dibatalkan dan dihapus secara permanen." 
    });

  } catch (error: any) {
    console.error("[POST Tasklist Void Error]:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server.", error: error.message },
      { status: 500 }
    );
  }
}

