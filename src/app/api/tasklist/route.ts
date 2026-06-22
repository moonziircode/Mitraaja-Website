import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import axios from "axios";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.token) {
      return NextResponse.json(
        { message: "Unauthorized. Harap login kembali." },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get("state") || "ACTIVE"; // ACTIVE, DELAY, COMPLETED
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "10";
    const grouped = searchParams.get("grouped") || "false";
    const searchKey = searchParams.get("key") || "";

    const baseUrl = process.env.NEXT_PUBLIC_ANTERAJA_API_URL || "https://api.anteraja.id/maa-task";

    let endpoint = `${baseUrl}/order/v2/task/dropoff`;
    const params: any = {
      state,
      page,
      size,
    };

    if (grouped === "true") {
      params.grouped = true;
    }
    
    if (searchKey) {
      params.key = searchKey;
    }

    console.log(`[GET Tasklist] Fetching from ${endpoint} with params:`, params);

    const response = await axios.get(endpoint, {
      params,
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
      validateStatus: () => true, // Don't throw on error status
    });

    console.log(`[GET Tasklist] Response status: ${response.status}`, response.data);

    if (response.status === 401) {
      return NextResponse.json(
        { message: "Sesi kedaluwarsa. Harap login kembali." },
        { status: 401 }
      );
    }

    if (response.status >= 400) {
      return NextResponse.json(
        { message: response.data?.message || response.data?.info || "Gagal mengambil data tasklist" },
        { status: response.status }
      );
    }

    return NextResponse.json(response.data);

  } catch (error: any) {
    console.error("[GET Tasklist Error]:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server.", error: error.message },
      { status: 500 }
    );
  }
}
