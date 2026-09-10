// ─── Types ──────────────────────────────────────────────────────────────────

export interface MaaTask {
  waybill: string;
  sourceOrderNo: string;
  orderSource: string;
  shipperName: string;
  receiverName: string;
  destinationCity: string;
  serviceCode?: string;
  weight?: number;
  codAmount?: number;
  items?: Array<any>;
  shipperInfo?: any;
  receiverInfo?: any;
  invoice?: string;
  shippedDate?: string;
  estimatedDate?: string;
  taskCode?: string;
}

export interface ClaimLifecycleResult {
  success: boolean;
  awb: string;
  orderSource?: string;
  claimKey?: string;
  agentStaffId: string;
  taskCode?: string;
  shipperName: string;
  receiverName: string;
  destinationCity: string;
  phase1Status: 'SUCCESS' | 'FAILED';
  phase2Status: 'CLAIMED' | 'FAILED' | 'SKIPPED';
  phase3Status: 'COMPLETED' | 'FAILED' | 'SKIPPED';
  trackingCode?: string | number;
  opcode?: string | number;
  trackingVerificationStatus: 'VERIFIED' | 'PENDING' | 'FAILED';
  finalTaskStatus?: string;
  finalResult: 'SUCCESS' | 'FAILED' | 'INCOMPLETE' | 'VERIFICATION_PENDING' | 'VERIFICATION_FAILED';
  message: string;
}

export interface ClaimPayload {
  agent_staff_id: string;
  orders: Array<{
    order_source: string;
    claim_key: string;
  }>;
}

export interface LoginResponse {
  token: string;
  user: {
    agentStaffId: string;
    name: string;
    storeName: string;
    districtCode?: string;
    postalCode?: string;
  };
}

export interface ServiceRate {
  product_code: string;
  product_name: string;
  duration: string;
  weight: number;
  delivery_price: number;
  pickup_start: string | null;
  pickup_end: string | null;
  notes: string | null;
  status: string;
}

// ─── Config ─────────────────────────────────────────────────────────────────

const ANTERAJA_API_BASE_URL = process.env.ANTERAJA_API_BASE_URL;
const ANTERAJA_AUTH_URL = process.env.ANTERAJA_AUTH_URL;

/**
 * When the API base URL is not configured the client operates in mock mode,
 * returning deterministic fake data so the frontend can be developed
 * without a live backend.
 */
const IS_MOCK_MODE = !ANTERAJA_API_BASE_URL;

// ─── Mock implementations ───────────────────────────────────────────────────

async function mockLogin(
  username: string,
  password: string,
): Promise<LoginResponse> {
  if (!username || !password) {
    throw new Error('Username dan password harus diisi.');
  }

  // Simulate a small network delay
  await delay(300);

  return {
    token: `mock-token-${Date.now()}`,
    user: {
      agentStaffId: username,
      name: `Agent ${username}`,
      storeName: 'Toko Mock Sejahtera',
    },
  };
}

async function mockSearchAWB(awb: string): Promise<MaaTask | null> {
  await delay(200);

  if (awb.startsWith('ERR')) {
    return null;
  }

  return {
    waybill: awb,
    sourceOrderNo: awb,
    orderSource: 'B2B',
    shipperName: 'Toko Baju Mock',
    receiverName: 'Budi (Mock)',
    destinationCity: 'Jakarta Selatan',
  };
}

async function mockClaimAWB(awb: string): Promise<{ message: string }> {
  await delay(200);

  if (awb.startsWith('FAIL')) {
    throw new Error('Paket sudah diklaim sebelumnya');
  }

  return { message: 'Claimed Successfully' };
}

async function mockGetRates(
  origin: string,
  destination: string,
  weight: number,
): Promise<ServiceRate[]> {
  await delay(200);
  return [
    {
      product_code: 'REG',
      product_name: 'Anteraja Regular',
      duration: '1-2 Day',
      weight,
      delivery_price: 11500 * weight,
      pickup_start: null,
      pickup_end: null,
      notes: null,
      status: 'ACTIVE',
    },
    {
      product_code: 'ND',
      product_name: 'Anteraja Next Day',
      duration: '1 Day',
      weight,
      delivery_price: 15300 * weight,
      pickup_start: null,
      pickup_end: null,
      notes: null,
      status: 'ACTIVE',
    },
  ];
}

// ─── Real API implementations ───────────────────────────────────────────────

async function realLogin(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const authUrl = ANTERAJA_AUTH_URL || 'https://cas.anteraja.id';
  const apiBase = ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';
  const gatewayUrl = apiBase.replace('/maa-task', '');

  // Step 1: GET cas/login to extract JSession ID and ticket parameters
  const step1Response = await fetch(`${authUrl}/cas/login?isapp=true&acctype=emp`, {
    method: 'GET',
  });
  if (!step1Response.ok) {
    throw new Error('Gagal menghubungi server CAS (Step 1)');
  }
  const setCookie1 = step1Response.headers.getSetCookie ? step1Response.headers.getSetCookie() : [];
  const jsessionidCookie = setCookie1.find((c) => c.startsWith('JSESSIONID='));
  const jsessionid = jsessionidCookie ? jsessionidCookie.split(';')[0] : '';
  const lt = step1Response.headers.get('lt');
  const execution = step1Response.headers.get('execution');

  if (!jsessionid || !lt || !execution) {
    throw new Error('Gagal mendapatkan sesi autentikasi dari server CAS');
  }

  // Step 2: POST cas/login to submit credentials and get TGC cookie
  const postData = new URLSearchParams({
    username,
    password,
    _eventId: 'submit',
    submit: 'login',
    lt,
    execution,
  });

  const step2Response = await fetch(`${authUrl}/cas/login?isapp=true&acctype=emp`, {
    method: 'POST',
    headers: {
      'Cookie': jsessionid,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: postData.toString(),
  });

  if (!step2Response.ok) {
    throw new Error('Gagal memproses kredensial di server CAS (Step 2)');
  }

  const setCookie2 = step2Response.headers.getSetCookie ? step2Response.headers.getSetCookie() : [];
  const tgcCookie = setCookie2.find((c) => c.startsWith('TGC='));
  const tgc = tgcCookie ? tgcCookie.split(';')[0] : '';

  if (!tgc) {
    throw new Error('Agent ID atau Password salah.');
  }

  // Step 3: GET cas/login with service to get service ticket (ST-xxxx)
  const step3Response = await fetch(`${authUrl}/cas/login?service=${encodeURIComponent(gatewayUrl + '/')}`, {
    method: 'GET',
    headers: {
      'Cookie': tgc,
    },
  });

  if (!step3Response.ok) {
    throw new Error('Gagal mendapatkan tiket autentikasi dari server CAS (Step 3)');
  }

  const redirectUrl = step3Response.headers.get('redirecturl') || step3Response.headers.get('location');
  if (!redirectUrl) {
    throw new Error('Gagal mendapatkan redirect URL tiket autentikasi');
  }

  const parsedUrl = new URL(redirectUrl);
  const ticket = parsedUrl.searchParams.get('ticket');
  if (!ticket) {
    throw new Error('Gagal mengurai tiket autentikasi');
  }

  // Step 4: POST user/cas/login to gateway to fetch session token and profile
  const gatewayPayload = JSON.stringify({
    ticket: ticket,
    deviceId: 'dev_device_uuid_12345',
    appKey: 'MAA',
    appSecret: 'santuy',
    service: gatewayUrl + '/',
  });

  const step4Headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'token': '',
    'appid': 'JV_APP',
    'msgid': '1555315559769',
    'imei': 'dev_device_uuid_12345',
    'deviceUuid': 'dev_device_uuid_12345',
    'hardwareSerialNo': 'dev_serial',
    'manufacture': 'Apple',
    'model': 'Macbook',
    'os': 'macOS',
    'osVersion': '14.0',
    'appVersion': '2.2.4',
    'mv': '1.1',
    'source': 'MAA',
  };

  const step4Response = await fetch(`${gatewayUrl}/user/cas/login`, {
    method: 'POST',
    headers: step4Headers,
    body: gatewayPayload,
  });

  if (!step4Response.ok) {
    const errorText = await step4Response.text().catch(() => '');
    throw new Error(`Gagal masuk ke gateway Anteraja (Status: ${step4Response.status}): ${errorText}`);
  }

  const resBody = await step4Response.json();
  if (resBody.status !== 0 || !resBody.content) {
    throw new Error(resBody.info || 'Login gagal. Sesi ditolak oleh gateway Anteraja.');
  }

  return {
    token: resBody.content.token,
    user: {
      agentStaffId: resBody.content.agent.agent_staff_id,
      name: resBody.content.agent.name,
      storeName: resBody.content.agent.agent_shop_name,
      districtCode: resBody.content.agent.agent_shop_district,
      postalCode: resBody.content.agent.agent_shop_postcode,
    },
  };
}

async function realSearchAWB(
  awb: string,
  agentStaffId: string,
  token: string,
): Promise<MaaTask | null> {
  const apiBase = ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';
  const url = `${apiBase}/order/v2/search/${encodeURIComponent(awb)}?agent_staff_id=${encodeURIComponent(agentStaffId)}`;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'token': token,
    'appid': 'JV_APP',
    'msgid': Date.now().toString(),
    'imei': 'dev_device_uuid_12345',
    'deviceUuid': 'dev_device_uuid_12345',
    'hardwareSerialNo': 'dev_serial',
    'manufacture': 'Apple',
    'model': 'Macbook',
    'os': 'macOS',
    'osVersion': '14.0',
    'appVersion': '2.2.4',
    'mv': '1.1',
    'source': 'MAA',
  };

  const response = await fetch(url, {
    method: 'GET',
    headers: headers,
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage = errorBody?.info || `Pencarian gagal (Status: ${response.status})`;
    throw new Error(errorMessage);
  }

  const body = await response.json();
  if (body.status !== 0) {
    if (body.status === 404) {
      return null;
    }
    throw new Error(body.info || 'Gagal mencari AWB.');
  }

  if (!body.content || body.content.length === 0) {
    return null;
  }

  const task = body.content[0];
  return {
    waybill: task.waybill || task.waybill_no || awb,
    sourceOrderNo: task.source_order_no || task.waybill || task.waybill_no || awb,
    orderSource: task.order_source || '',
    shipperName: task.shipper_info?.name || '-',
    receiverName: task.receiver_info?.name || '-',
    destinationCity: task.receiver_info?.address || '-',
    serviceCode: task.product_code || '',
    weight: task.parcel_total_weight || 0,
    codAmount: task.cod_amount || 0,
    items: task.items || [],
    shipperInfo: task.shipper_info || {},
    receiverInfo: task.receiver_info || {},
    invoice: task.invoice || '',
    shippedDate: task.shipped_date || '',
    estimatedDate: task.estimated_date || '',
    taskCode: task.task_code || task.taskCode || '',
  };
}

function getMaaHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'token': token,
    'appid': 'JV_APP',
    'msgid': Date.now().toString(),
    'imei': 'dev_device_uuid_12345',
    'deviceUuid': 'dev_device_uuid_12345',
    'hardwareSerialNo': 'dev_serial',
    'manufacture': 'Apple',
    'model': 'Macbook',
    'os': 'macOS',
    'osVersion': '14.0',
    'appVersion': '2.2.4',
    'mv': '1.1',
    'source': 'MAA',
  };
}

async function realClaimAWB(
  awb: string,
  payload: ClaimPayload,
  token: string,
): Promise<{ message: string; taskCode?: string; content?: any }> {
  const apiBase = ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';
  const url = `${apiBase}/order/v2/claim/${encodeURIComponent(awb)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: getMaaHeaders(token),
    body: JSON.stringify(payload),
    keepalive: true,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage = errorBody?.info || errorBody?.message || `Klaim gagal (Status: ${response.status})`;
    throw new Error(errorMessage);
  }

  const body = await response.json();
  if (body.status !== 0) {
    throw new Error(body.info || 'Gagal melakukan klaim AWB.');
  }

  let taskCode: string | undefined = undefined;
  if (body.content) {
    if (typeof body.content === 'object') {
      taskCode = body.content.task_code || body.content.taskCode;
      if (!taskCode && Array.isArray(body.content)) {
        taskCode = body.content[0]?.task_code || body.content[0]?.taskCode;
      }
      if (!taskCode && Array.isArray(body.content.orders)) {
        taskCode = body.content.orders[0]?.task_code || body.content.orders[0]?.taskCode;
      }
    }
  }

  return { message: body.info || 'Claimed Successfully', taskCode, content: body.content };
}

async function realCompleteDropoff(
  awb: string,
  agentStaffId: string,
  token: string,
): Promise<{ success: boolean; message: string; data?: any }> {
  const apiBase = ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';
  const url = `${apiBase}/task-complete/dropoff?waybill=${encodeURIComponent(awb)}&agent_staff_id=${encodeURIComponent(agentStaffId)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: getMaaHeaders(token),
    body: JSON.stringify({}),
    keepalive: true,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage = errorBody?.info || errorBody?.message || `Complete dropoff gagal (Status: ${response.status})`;
    throw new Error(errorMessage);
  }

  const body = await response.json();
  if (body.status !== 0) {
    throw new Error(body.info || 'Gagal menyelesaikan dropoff.');
  }

  return { success: true, message: body.info || 'Dropoff Berhasil', data: body.content };
}

async function realVerifyTracking(
  awb: string,
  agentStaffId: string,
  token: string,
): Promise<{ verified: boolean; trackingCode?: string | number; opcode?: string | number; message?: string }> {
  const apiBase = ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';
  const url = `${apiBase}/tracking?waybill=${encodeURIComponent(awb)}&agent_staff_id=${encodeURIComponent(agentStaffId)}`;

  let events: any[] = [];
  let is201Detected = false;
  let detectedCode: string | number = '201';
  let detectedOpcode: string | number = '59';
  let detectedMessage = 'Paket sudah diterima di drop point Mitra AnterAja';

  // 1. Try MAA Task tracking endpoint
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: getMaaHeaders(token),
    });
    if (res.ok) {
      const body = await res.json();
      if (body.status === 0 && body.content) {
        events = Array.isArray(body.content) ? body.content : (body.content.history || []);
      }
    }
  } catch (e) {
    console.warn('[verifyTracking] MAA tracking endpoint error:', e);
  }

  // 2. Also try Public tracking endpoint (or as fallback)
  try {
    const pubRes = await fetch('https://api.anteraja.id/order/tracking', {
      method: 'POST',
      headers: {
        'mv': '1.2',
        'source': 'aca_android',
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'okhttp/3.10.0',
      },
      body: JSON.stringify([{ codes: awb.trim() }]),
    });
    if (pubRes.ok) {
      const pubData = await pubRes.json();
      if (pubData.status === 200 && pubData.content && pubData.content.length > 0) {
        const item = pubData.content[0];
        if (item.detail?.final_status === '201' || item.detail?.final_status === 201) {
          is201Detected = true;
        }
        if (Array.isArray(item.history)) {
          events = [...events, ...item.history];
        }
      }
    }
  } catch (pubErr) {
    console.warn('[verifyTracking] Public tracking fallback error:', pubErr);
  }

  // 3. Inspect all events
  for (const ev of events) {
    const code = String(ev.tracking_code || ev.trackingCode || ev.code || '');
    const op = String(ev.opcode || ev.op_code || '');
    const msg = (ev.message?.id || ev.message || '').toLowerCase();

    const is201 =
      code === '201' ||
      msg.includes('diterima di drop point') ||
      msg.includes('staging store') ||
      msg.includes('received at drop point');
    const isOpcode59 = op === '59' || code === '59';

    if (is201 || isOpcode59) {
      is201Detected = true;
      if (code) detectedCode = code;
      if (op) detectedOpcode = op;
      if (ev.message?.id || ev.message) detectedMessage = ev.message?.id || ev.message;
      break;
    }
  }

  if (is201Detected) {
    return {
      verified: true,
      trackingCode: detectedCode,
      opcode: detectedOpcode,
      message: detectedMessage,
    };
  }

  return { verified: false, message: 'Tracking Code 201 / Opcode 59 belum terbit' };
}

async function realVerifyFinalTaskStatus(
  taskCode: string,
  awb: string,
  token: string,
): Promise<{ verified: boolean; taskStatus?: string; message?: string }> {
  const apiBase = ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';
  const headers = getMaaHeaders(token);

  if (taskCode) {
    try {
      const detailUrl = `${apiBase}/order/v2/task/dropoff/detail?task_code=${encodeURIComponent(taskCode)}`;
      const res = await fetch(detailUrl, { method: 'GET', headers });
      if (res.ok) {
        const body = await res.json();
        if (body.status === 0 && body.content) {
          const st = body.content.task_status || body.content.taskStatus || '';
          if (st === 'WAITING_FOR_HANDOVER_SERAH') {
            return { verified: true, taskStatus: st, message: 'Status WAITING_FOR_HANDOVER_SERAH terverifikasi' };
          }
        }
      }
    } catch (err) {
      console.warn('[verifyFinalTaskStatus] task detail check error:', err);
    }
  }

  try {
    const listUrl = `${apiBase}/order/v2/task/dropoff?page=0&size=20`;
    const res = await fetch(listUrl, { method: 'GET', headers });
    if (res.ok) {
      const body = await res.json();
      if (body.status === 0 && body.content) {
        const tasks = Array.isArray(body.content) ? body.content : (body.content.tasks || []);
        for (const item of tasks) {
          const subTasks = Array.isArray(item.tasks) ? item.tasks : [item];
          for (const t of subTasks) {
            const w = t.waybill_no || t.waybillNo || t.waybill || '';
            const tc = t.task_code || t.taskCode || '';
            if (w === awb || (taskCode && tc === taskCode)) {
              const st = t.task_status || t.taskStatus || '';
              if (st === 'WAITING_FOR_HANDOVER_SERAH') {
                return { verified: true, taskStatus: st, message: 'Status WAITING_FOR_HANDOVER_SERAH terverifikasi' };
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[verifyFinalTaskStatus] dropoff list check error:', err);
  }

  return { verified: false, message: 'Status WAITING_FOR_HANDOVER_SERAH belum tercapai' };
}

async function processFullClaimLifecycle(
  rawAwb: string,
  agentStaffId: string,
  token: string,
): Promise<ClaimLifecycleResult> {
  const awb = rawAwb.trim();

  // Validate strict 14 digits
  if (!/^[0-9]{14}$/.test(awb)) {
    return {
      success: false,
      awb,
      agentStaffId,
      shipperName: '-',
      receiverName: '-',
      destinationCity: '-',
      phase1Status: 'FAILED',
      phase2Status: 'FAILED',
      phase3Status: 'SKIPPED',
      trackingVerificationStatus: 'FAILED',
      finalResult: 'FAILED',
      message: 'Format AWB tidak valid (harus tepat 14 digit angka numerik).',
    };
  }

  // ── PHASE 1: Pre-Claim Search ──
  let maaTask: MaaTask | null = null;
  let shipperName = '-';
  let receiverName = '-';
  let destinationCity = '-';
  let orderSource = 'B2B';
  let claimKey = awb;
  let existingTaskCode: string | undefined = undefined;

  try {
    maaTask = await anterajaClient.searchAWB(awb, agentStaffId, token);
    if (maaTask) {
      shipperName = maaTask.shipperName || '-';
      receiverName = maaTask.receiverName || '-';
      destinationCity = maaTask.destinationCity || '-';
      orderSource = maaTask.orderSource || 'B2B';
      claimKey = maaTask.sourceOrderNo || awb;
      existingTaskCode = maaTask.taskCode;
    }
  } catch (searchErr: any) {
    console.warn(`[Phase 1] Search AWB error for ${awb}:`, searchErr.message);
  }

  if (!maaTask) {
    return {
      success: false,
      awb,
      agentStaffId,
      shipperName,
      receiverName,
      destinationCity,
      phase1Status: 'FAILED',
      phase2Status: 'FAILED',
      phase3Status: 'SKIPPED',
      trackingVerificationStatus: 'FAILED',
      finalResult: 'FAILED',
      message: 'Pre-claim gagal: AWB tidak ditemukan dalam sistem Anteraja.',
    };
  }

  // ── PHASE 2: Order Claim ──
  let taskCode = existingTaskCode;
  let phase2Status: 'CLAIMED' | 'FAILED' | 'SKIPPED' = 'CLAIMED';

  if (!taskCode) {
    try {
      const claimRes = await anterajaClient.claimAWB(
        awb,
        {
          agent_staff_id: agentStaffId,
          orders: [{ order_source: orderSource, claim_key: claimKey }],
        },
        token,
      );
      taskCode = claimRes.taskCode || claimKey;
      phase2Status = 'CLAIMED';
    } catch (claimErr: any) {
      const errMsg = claimErr.message || '';
      if (errMsg.toLowerCase().includes('sudah pernah di klaim') || errMsg.toLowerCase().includes('already claimed')) {
        phase2Status = 'CLAIMED';
        taskCode = taskCode || claimKey;
      } else {
        return {
          success: false,
          awb,
          orderSource,
          claimKey,
          agentStaffId,
          shipperName,
          receiverName,
          destinationCity,
          phase1Status: 'SUCCESS',
          phase2Status: 'FAILED',
          phase3Status: 'SKIPPED',
          trackingVerificationStatus: 'FAILED',
          finalResult: 'FAILED',
          message: `Order Claim gagal: ${errMsg}`,
        };
      }
    }
  }

  // ── PHASE 3: Task Complete Dropoff ──
  let phase3Status: 'COMPLETED' | 'FAILED' | 'SKIPPED' = 'COMPLETED';
  try {
    if (IS_MOCK_MODE) {
      await delay(150);
    } else {
      await realCompleteDropoff(awb, agentStaffId, token);
    }
    phase3Status = 'COMPLETED';
  } catch (dropoffErr: any) {
    console.error(`[Phase 3] Complete Dropoff failed for ${awb}:`, dropoffErr.message);
    return {
      success: false,
      awb,
      orderSource,
      claimKey,
      agentStaffId,
      taskCode,
      shipperName,
      receiverName,
      destinationCity,
      phase1Status: 'SUCCESS',
      phase2Status: 'CLAIMED',
      phase3Status: 'FAILED',
      trackingVerificationStatus: 'FAILED',
      finalResult: 'INCOMPLETE',
      message: `Order sudah diklaim (Task: ${taskCode || '-'}), namun gagal menyelesaikan dropoff: ${dropoffErr.message}`,
    };
  }

  // ── PHASE 4: Verify Tracking (Tracking Code 201 & Opcode 59) ──
  let trackingVerified = false;
  let trackingCode: string | number | undefined = undefined;
  let opcode: string | number | undefined = undefined;

  for (let attempt = 1; attempt <= 5; attempt++) {
    if (attempt > 1) {
      await delay(attempt * 600);
    }
    if (IS_MOCK_MODE) {
      trackingVerified = true;
      trackingCode = '201';
      opcode = '59';
      break;
    } else {
      const trackRes = await realVerifyTracking(awb, agentStaffId, token);
      if (trackRes.verified) {
        trackingVerified = true;
        trackingCode = trackRes.trackingCode;
        opcode = trackRes.opcode;
        break;
      }
    }
  }

  if (!trackingVerified) {
    return {
      success: false,
      awb,
      orderSource,
      claimKey,
      agentStaffId,
      taskCode,
      shipperName,
      receiverName,
      destinationCity,
      phase1Status: 'SUCCESS',
      phase2Status: 'CLAIMED',
      phase3Status: 'COMPLETED',
      trackingVerificationStatus: 'FAILED',
      finalResult: 'VERIFICATION_FAILED',
      message: 'Dropoff selesai, namun Tracking Code 201 belum terverifikasi dari upstream Anteraja.',
    };
  }

  // ── PHASE 5: Verify Final Task Status (WAITING_FOR_HANDOVER_SERAH) ──
  let finalStatusVerified = false;
  let finalTaskStatus: string | undefined = undefined;

  for (let attempt = 1; attempt <= 4; attempt++) {
    if (attempt > 1) await delay(attempt * 500);
    if (IS_MOCK_MODE) {
      finalStatusVerified = true;
      finalTaskStatus = 'WAITING_FOR_HANDOVER_SERAH';
      break;
    } else {
      const finalRes = await realVerifyFinalTaskStatus(taskCode || '', awb, token);
      if (finalRes.verified) {
        finalStatusVerified = true;
        finalTaskStatus = finalRes.taskStatus || 'WAITING_FOR_HANDOVER_SERAH';
        break;
      }
    }
  }

  if (!finalStatusVerified) {
    return {
      success: false,
      awb,
      orderSource,
      claimKey,
      agentStaffId,
      taskCode,
      shipperName,
      receiverName,
      destinationCity,
      phase1Status: 'SUCCESS',
      phase2Status: 'CLAIMED',
      phase3Status: 'COMPLETED',
      trackingCode: trackingCode || '201',
      opcode: opcode || '59',
      trackingVerificationStatus: 'VERIFIED',
      finalTaskStatus: finalTaskStatus || 'BELUM_SERAH',
      finalResult: 'VERIFICATION_PENDING',
      message: 'Tracking Code 201 terbit, namun final task status belum mencapai WAITING_FOR_HANDOVER_SERAH.',
    };
  }

  // ── ALL 5 MILESTONES COMPLETE ──
  return {
    success: true,
    awb,
    orderSource,
    claimKey,
    agentStaffId,
    taskCode,
    shipperName,
    receiverName,
    destinationCity,
    phase1Status: 'SUCCESS',
    phase2Status: 'CLAIMED',
    phase3Status: 'COMPLETED',
    trackingCode: trackingCode || '201',
    opcode: opcode || '59',
    trackingVerificationStatus: 'VERIFIED',
    finalTaskStatus: 'WAITING_FOR_HANDOVER_SERAH',
    finalResult: 'SUCCESS',
    message: 'Paket berhasil diklaim, dropoff selesai, Tracking 201 & Opcode 59 terbit, dan status WAITING_FOR_HANDOVER_SERAH terverifikasi!',
  };
}

async function realGetRates(
  origin: string,
  destination: string,
  weight: number,
  token: string,
): Promise<ServiceRate[]> {
  const apiBase = ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';
  const url = `${apiBase}/rates?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&weight=${weight}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getMaaHeaders(token),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage = errorBody?.info || `Gagal mengambil tarif (Status: ${response.status})`;
    throw new Error(errorMessage);
  }

  const body = await response.json();
  if (body.status !== 0) {
    throw new Error(body.info || 'Gagal mengambil tarif.');
  }

  return body.content || [];
}

// ─── Public client ──────────────────────────────────────────────────────────

export const anterajaClient = {
  /**
   * Authenticate an agent. Returns token + profile on success.
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    if (IS_MOCK_MODE) return mockLogin(username, password);
    return realLogin(username, password);
  },

  /**
   * Search for a waybill. Returns the MaaTask or null when not found.
   */
  async searchAWB(
    awb: string,
    agentStaffId: string,
    token: string,
  ): Promise<MaaTask | null> {
    if (IS_MOCK_MODE) return mockSearchAWB(awb);
    return realSearchAWB(awb, agentStaffId, token);
  },

  /**
   * Claim a waybill. Throws on failure.
   */
  async claimAWB(
    awb: string,
    payload: ClaimPayload,
    token: string,
  ): Promise<{ message: string; taskCode?: string; content?: any }> {
    if (IS_MOCK_MODE) return mockClaimAWB(awb);
    return realClaimAWB(awb, payload, token);
  },

  /**
   * Complete dropoff after claim.
   */
  async completeDropoff(
    awb: string,
    agentStaffId: string,
    token: string,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    if (IS_MOCK_MODE) return { success: true, message: 'Dropoff Berhasil' };
    return realCompleteDropoff(awb, agentStaffId, token);
  },

  /**
   * Verify tracking code 201 & opcode 59.
   */
  async verifyTracking(
    awb: string,
    agentStaffId: string,
    token: string,
  ): Promise<{ verified: boolean; trackingCode?: string | number; opcode?: string | number; message?: string }> {
    if (IS_MOCK_MODE) return { verified: true, trackingCode: '201', opcode: '59', message: 'Verified' };
    return realVerifyTracking(awb, agentStaffId, token);
  },

  /**
   * Verify final task status WAITING_FOR_HANDOVER_SERAH.
   */
  async verifyFinalTaskStatus(
    taskCode: string,
    awb: string,
    token: string,
  ): Promise<{ verified: boolean; taskStatus?: string; message?: string }> {
    if (IS_MOCK_MODE) return { verified: true, taskStatus: 'WAITING_FOR_HANDOVER_SERAH' };
    return realVerifyFinalTaskStatus(taskCode, awb, token);
  },

  /**
   * Process complete 5-phase claim lifecycle.
   */
  async processFullClaimLifecycle(
    awb: string,
    agentStaffId: string,
    token: string,
  ): Promise<ClaimLifecycleResult> {
    return processFullClaimLifecycle(awb, agentStaffId, token);
  },

  /**
   * Get service rates for origin, destination, and weight.
   */
  async getRates(
    origin: string,
    destination: string,
    weight: number,
    token: string,
  ): Promise<ServiceRate[]> {
    if (IS_MOCK_MODE) return mockGetRates(origin, destination, weight);
    return realGetRates(origin, destination, weight, token);
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
