import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import axios from "axios";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.token) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { taskCode } = await request.json();
    if (!taskCode) {
      return NextResponse.json({ message: "taskCode diperlukan." }, { status: 400 });
    }

    const rawBase = process.env.ANTERAJA_API_BASE_URL || process.env.NEXT_PUBLIC_ANTERAJA_API_URL || "https://api.anteraja.id/maa-task";
    const apiBase = rawBase.includes('/maa-task') ? rawBase : `${rawBase.replace(/\/$/, '')}/maa-task`;
    const endpoint = `${apiBase}/task/v2/void`;

    const response = await axios.post(
      endpoint,
      { task_code: taskCode, reason: "Batal oleh Agent" },
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

    if (response.status === 401) {
      return NextResponse.json({ message: "Sesi kedaluwarsa. Harap login kembali." }, { status: 401 });
    }

    const resData = response.data;
    const isSuccess = response.status === 200 && (
      resData?.status === 0 || 
      resData?.status === "0" || 
      resData?.info === "OK" ||
      resData?.success === true
    );

    if (!isSuccess) {
      return NextResponse.json(
        { message: resData?.message || resData?.info || "Gagal membatalkan pesanan." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: response.data });

  } catch (error: any) {
    console.error("[POST Tasklist Void Error]:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan server.", error: error.message },
      { status: 500 }
    );
  }
}
