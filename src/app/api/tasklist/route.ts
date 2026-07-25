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
    const state = searchParams.get("state") || "TERTUNDA"; // TERTUNDA, RIWAYAT_ORDER
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "10";
    const grouped = searchParams.get("grouped") || "false";
    const searchKey = searchParams.get("key") || "";

    const baseUrl = process.env.NEXT_PUBLIC_ANTERAJA_API_URL || "https://api.anteraja.id";

    const baseHeaders = {
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
    };

    let allTasks: any[] = [];

    // Helper function to fetch and extract flat tasks
    const fetchTasks = async (endpoint: string, params: any) => {
      console.log(`[GET Tasklist] Fetching from ${endpoint} with params:`, params);
      const res = await axios.get(endpoint, {
        params,
        headers: baseHeaders,
        validateStatus: () => true,
      });

      if (res.status === 401) throw new Error("Sesi kedaluwarsa. Harap login kembali.");
      if (res.status >= 400 || (res.data && res.data.status !== 0 && res.data.status !== undefined)) {
        console.error(`[GET Tasklist Error] Endpoint: ${endpoint}`, res.data);
        return []; // Return empty instead of failing the whole request
      }

      let rawContent = Array.isArray(res.data?.content) 
        ? res.data.content 
        : (res.data?.content?.tasks || []);
      
      let flatTasks: any[] = [];
      for (const item of rawContent) {
        if (item.tasks && Array.isArray(item.tasks)) {
          flatTasks.push(...item.tasks);
        } else {
          flatTasks.push(item);
        }
      }
      return flatTasks;
    };

    const queryParams: any = { page, size };
    if (grouped === "true") queryParams.grouped = true;
    if (searchKey) queryParams.key = searchKey;

    if (state === "TERTUNDA") {
      // Fetch both ACTIVE and DELAY
      const activeTasks = await fetchTasks(`${baseUrl}/maa-task/order/v2/task/dropoff`, queryParams);
      const delayTasks = await fetchTasks(`${baseUrl}/maa-task/order/v2/task/dropoff/on-hold`, queryParams);
      
      // Merge and deduplicate by task_code
      const taskMap = new Map();
      [...activeTasks, ...delayTasks].forEach(t => {
        if (t.task_code && !taskMap.has(t.task_code)) {
          taskMap.set(t.task_code, t);
        }
      });
      allTasks = Array.from(taskMap.values());
      
      // Sort descending by createdAt
      allTasks.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    } else if (state === "RIWAYAT_ORDER") {
      // Fetch history and filter for unpaid bookings
      queryParams.state = "COMPLETED";
      const historyTasks = await fetchTasks(`${baseUrl}/maa-task/task/dropoff`, queryParams);
      
      // Only keep tasks that are NOT_PAID
      allTasks = historyTasks.filter(t => t.payment_status === "NOT_PAID");
      
      // Sort descending by createdAt
      allTasks.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    // Regroup if requested
    let finalContent: any[] = allTasks;
    if (grouped === "true") {
      const groupedMap = new Map<string, any>();
      for (const task of allTasks) {
        const groupKey = task.group || `${task.order_source}-${task.ownership_name || task.client_name}`;
        if (!groupedMap.has(groupKey)) {
          groupedMap.set(groupKey, {
            client_name: task.client_name,
            order_source: task.order_source,
            group: task.group,
            owner_name: task.ownership_name,
            owner_phone: task.ownership_phone,
            tasks: []
          });
        }
        groupedMap.get(groupKey).tasks.push(task);
      }
      finalContent = Array.from(groupedMap.values());
    }

    return NextResponse.json({
      status: 0,
      info: "OK",
      content: finalContent
    });

  } catch (error: any) {
    console.error("[GET Tasklist Error]:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server.", error: error.message },
      { status: 500 }
    );
  }
}
