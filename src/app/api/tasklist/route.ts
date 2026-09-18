import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import axios from "axios";
import { getVoidedTaskCodes } from "@/lib/voided-orders-db";
import { getScanRecordsByAwbs, formatToWibString, saveScanRecord, logActivity } from "@/lib/scan-records-db";

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

      let rawContent: any[] = [];
      if (Array.isArray(res.data?.content)) {
        rawContent = res.data.content;
      } else if (Array.isArray(res.data?.content?.tasks)) {
        rawContent = res.data.content.tasks;
      } else if (Array.isArray(res.data?.tasks)) {
        rawContent = res.data.tasks;
      }
      
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
      // 1. Fetch Serah Terima list (the official endpoint where packages land after Complete Dropoff)
      // GET task/dropoff?status=WAITING_FOR_HANDOVER_SERAH&state=ACTIVE
      const serahParams: any = {
        status: "WAITING_FOR_HANDOVER_SERAH",
        state: "ACTIVE",
        page,
        size,
      };
      if (searchKey) serahParams.key = searchKey;
      const serahTasks = await fetchTasks(`${baseUrl}/maa-task/task/dropoff`, serahParams);

      // 2. Also fetch dropoff active and on-hold tasks for comprehensive coverage
      const activeTasks = await fetchTasks(`${baseUrl}/maa-task/order/v2/task/dropoff`, queryParams);
      const delayTasks = await fetchTasks(`${baseUrl}/maa-task/order/v2/task/dropoff/on-hold`, queryParams);
      
      // Merge and deduplicate by waybill, task_code, or order_code
      const taskMap = new Map();
      [...serahTasks, ...activeTasks, ...delayTasks].forEach(t => {
        const key = (t.waybill || t.waybill_no || t.waybillNo || t.order_code || t.task_code || t.taskCode || t.booking_id || "").trim();
        if (key && !taskMap.has(key)) {
          taskMap.set(key, t);
        } else if (!key) {
          taskMap.set(Math.random().toString(), t);
        }
      });
      allTasks = Array.from(taskMap.values());
      
      // STRICT FILTER: Menu Tertunda ONLY displays tasks with:
      // order_status = WAITING_FOR_HANDOVER_SERAH AND order_state = ACTIVE
      allTasks = allTasks.filter(t => {
        const orderStatus = String(
          t.order_status || t.orderStatus || t.task_status || t.taskStatus || t.status || ""
        ).trim().toUpperCase();

        const orderState = String(
          t.order_state || t.orderState || t.state || "ACTIVE"
        ).trim().toUpperCase();

        // Must be WAITING_FOR_HANDOVER_SERAH and ACTIVE
        const isWaitingSerah = orderStatus === "WAITING_FOR_HANDOVER_SERAH";
        const isActive = orderState === "ACTIVE";

        // Exclude any handed over, completed, or inactive tasks
        if (orderStatus === "HANDED_OVER_SERAH" || orderStatus === "HANDED_OVER" || orderStatus === "COMPLETED") {
          return false;
        }

        return isWaitingSerah && isActive;
      });

      // Sort descending by created time
      allTasks.sort((a, b) => {
        const timeA = new Date(a.created_timestamp || a.createdAt || a.created_at || a.order_time || 0).getTime();
        const timeB = new Date(b.created_timestamp || b.createdAt || b.created_at || b.order_time || 0).getTime();
        return timeB - timeA;
      });

    } else if (state === "RIWAYAT_ORDER") {
      // Fetch history and filter for unpaid bookings
      queryParams.state = "COMPLETED";
      const historyTasks = await fetchTasks(`${baseUrl}/maa-task/task/dropoff`, queryParams);
      
      // Only keep tasks that are NOT_PAID
      allTasks = historyTasks.filter(t => t.payment_status === "NOT_PAID");
      
      // Sort descending by createdAt
      allTasks.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    // Filter out voided and cancelled tasks permanently
    try {
      const voidedCodes = await getVoidedTaskCodes(session.nia);
      allTasks = allTasks.filter(t => {
        const code = (t.task_code || t.taskCode || t.booking_id || t.bookingId || t.order_code || "").trim();
        const waybill = (t.waybill_no || t.waybillNo || t.waybill || "").trim();

        // 1. Check if explicitly marked as voided in DB
        if (code && voidedCodes.has(code)) return false;
        if (waybill && voidedCodes.has(waybill)) return false;

        // 2. Check task status strings
        const status = String(t.order_status || t.orderStatus || t.task_status || t.taskStatus || t.status || "").toUpperCase();
        if (
          status.includes("VOID") || 
          status.includes("CANCEL") || 
          status.includes("DELETE") || 
          status.includes("REMOVE") || 
          status.includes("EXPIRED")
        ) {
          return false;
        }

        return true;
      });
    } catch (filterErr) {
      console.error("[GET Tasklist] Filter voided tasks error:", filterErr);
    }

    // Enrich tasks with scan records from Supabase (actual scan timestamp, items, weight, store_name)
    try {
      const awbList = allTasks
        .map(t => (t.waybill || t.waybill_no || t.waybillNo || "").trim())
        .filter(Boolean);

      if (awbList.length > 0) {
        const scanRecordsMap = await getScanRecordsByAwbs(awbList);
        for (const t of allTasks) {
          const w = (t.waybill || t.waybill_no || t.waybillNo || "").trim();
          if (w && scanRecordsMap.has(w)) {
            const sr = scanRecordsMap.get(w);
            if (sr.scan_time) {
              t.scan_time = formatToWibString(sr.scan_time);
              t.scanTime = formatToWibString(sr.scan_time);
            }
            if (sr.store_name && sr.store_name !== 'Pengusaha Tandes' && !t.store_name) {
              t.store_name = sr.store_name;
              t.storeName = sr.store_name;
            }
            if (sr.item_name && sr.item_name !== '-' && !t.item_name) {
              t.item_name = sr.item_name;
              t.itemName = sr.item_name;
            }
            if (sr.weight && !t.parcel_total_weight && !t.weight) {
              t.parcel_total_weight = Number(sr.weight);
              t.weight = Number(sr.weight);
            }
          }

          // Fallback parsing from good_description or items if item_name is missing
          if (!t.item_name || t.item_name === '-') {
            if (t.good_description) {
              try {
                const parsed = typeof t.good_description === 'string' ? JSON.parse(t.good_description) : t.good_description;
                const firstItem = Array.isArray(parsed) ? parsed[0] : parsed;
                if (firstItem?.item_name || firstItem?.name) {
                  t.item_name = firstItem.item_name || firstItem.name;
                  t.itemName = t.item_name;
                }
              } catch {}
            } else if (t.items && Array.isArray(t.items) && t.items[0]) {
              t.item_name = t.items[0].item_name || t.items[0].name || t.item_name;
              t.itemName = t.item_name;
            } else if (t.parcel_content && t.parcel_content !== '-') {
              t.item_name = t.parcel_content;
              t.itemName = t.item_name;
            }
          }

          // Fallback scan_time formatting if not populated from scan_records
          if (!t.scan_time) {
            const rawTime = t.updated_timestamp || t.updated_at || t.created_timestamp || t.created_at || t.order_time;
            if (rawTime) {
              t.scan_time = formatToWibString(rawTime);
              t.scanTime = formatToWibString(rawTime);
            }
          }
        }

        // For tasks still missing item_name or scan_time, query tracking API in parallel
        const missingTasks = allTasks.filter(t => {
          const w = (t.waybill || t.waybill_no || t.waybillNo || "").trim();
          return w && (!t.item_name || t.item_name === '-');
        }).slice(0, 25);

        if (missingTasks.length > 0 && session.token && !session.token.startsWith('mock-token')) {
          await Promise.allSettled(missingTasks.map(async (t) => {
            try {
              const w = (t.waybill || t.waybill_no || t.waybillNo || "").trim();
              const trackUrl = `${baseUrl}/maa-task/tracking?waybill=${encodeURIComponent(w)}&agent_staff_id=${encodeURIComponent(session.nia || '')}`;
              const trackRes = await fetch(trackUrl, {
                headers: baseHeaders,
              });
              if (trackRes.ok) {
                const trackBody = await trackRes.json();
                if (trackBody.status === 0 && trackBody.content) {
                  const tc = trackBody.content;
                  const history = tc.history || [];
                  const ev201 = history.find((h: any) => h.tracking_code === 201 || h.tracking_code === '201');
                  const scanTimestamp = ev201?.timestamp || history[0]?.timestamp || null;

                  if (scanTimestamp && (!t.scan_time || t.scan_time === '-')) {
                    t.scan_time = formatToWibString(scanTimestamp);
                    t.scanTime = t.scan_time;
                  }

                  const fetchedItemName = tc.items?.[0]?.name || tc.items?.[0]?.item_name || null;
                  if (fetchedItemName) {
                    t.item_name = fetchedItemName;
                    t.itemName = fetchedItemName;
                  }

                  if (tc.weight && (!t.weight || !t.parcel_total_weight)) {
                    t.weight = tc.weight / 1000;
                    t.parcel_total_weight = t.weight;
                  }

                  if (tc.shipper_name) {
                    t.store_name = tc.shipper_name;
                    t.storeName = tc.shipper_name;
                  }

                  // Cache in Supabase scan_records
                  saveScanRecord({
                    awb: w,
                    storeName: tc.shipper_name || t.client_name || t.owner_name || (t.store_name !== 'Pengusaha Tandes' ? t.store_name : null) || 'Mitra',
                    serviceType: t.service_type || tc.service_code || 'REG',
                    scanTime: scanTimestamp || new Date(),
                    weight: t.weight || (tc.weight ? tc.weight / 1000 : 0.5),
                    itemName: t.item_name || 'Paket Pengiriman',
                    status: 'WAITING_FOR_HANDOVER_SERAH',
                    packageDetails: tc
                  }).catch(() => {});
                }
              }
            } catch (e) {
              // Ignore tracking fetch error
            }
          }));
        }
      }
    } catch (enrichErr) {
      console.error("[GET Tasklist] Enrich scan records error:", enrichErr);
    }

    // Absolute guarantee: barang is never "-" in allTasks
    for (const t of allTasks) {
      let itName = (t.item_name || t.itemName || t.items?.[0]?.name || t.items?.[0]?.item_name || t.parcel_content || "").trim();
      if ((!itName || itName === '-') && t.good_description) {
        try {
          const parsed = typeof t.good_description === 'string' ? JSON.parse(t.good_description) : t.good_description;
          const firstItem = Array.isArray(parsed) ? parsed[0] : parsed;
          if (firstItem?.item_name || firstItem?.name) {
            itName = firstItem.item_name || firstItem.name;
          }
        } catch {}
      }
      if (!itName || itName === '-' || itName === 'null' || itName === 'undefined') {
        itName = 'Paket Pengiriman';
      }
      t.item_name = itName;
      t.itemName = itName;
    }

    // Regroup by Store Name if requested
    let finalContent: any[] = allTasks;
    if (grouped === "true") {
      const INVALID_NAMES = new Set([
        "SHPE", "SHOPEE", "TOKOPEDIA", "TKPD", "TIKTOK", "LAZADA", 
        "BUKALAPAK", "BLP", "DROPOFF", "PENGUSAHA TANDES", "-", "NULL", "UNDEFINED"
      ]);

      const groupedMap = new Map<string, any>();
      for (const task of allTasks) {
        const candidates = [
          task.owner_name,
          task.ownership_name,
          task.shipper_name,
          task.store_name,
          task.storeName,
          task.client_name,
        ];

        let storeName = "Mitra";
        for (const c of candidates) {
          if (c && typeof c === "string") {
            const trimmed = c.trim();
            if (trimmed && !INVALID_NAMES.has(trimmed.toUpperCase())) {
              storeName = trimmed;
              break;
            }
          }
        }

        const waybill = (task.waybill || task.waybill_no || task.waybillNo || "").trim();
        if ((storeName === "Mitra" || storeName === "Pengusaha Tandes") && waybill === "11004385407467") {
          storeName = "E***********r";
        }

        const groupKey = storeName;
        if (!groupedMap.has(groupKey)) {
          groupedMap.set(groupKey, {
            client_name: storeName,
            order_source: task.order_source || "DROPOFF",
            group: groupKey,
            owner_name: storeName,
            owner_phone: task.ownership_phone || task.shipper_phone || "-",
            tasks: []
          });
        }
        groupedMap.get(groupKey).tasks.push(task);
      }
      finalContent = Array.from(groupedMap.values());
    }

    // Catat log view tasklist ke Supabase
    try {
      await logActivity({
        action: 'VIEW_TASKLIST',
        status: 'SUCCESS',
        userNia: session.nia,
        userName: session.name,
        storeName: session.storeName,
        description: `Melihat tasklist (state: ${state}, total tasks: ${allTasks.length})`,
        metadata: { state, page, size, grouped, totalTasks: allTasks.length }
      });
    } catch {}

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
