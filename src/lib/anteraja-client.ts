// ─── Types ──────────────────────────────────────────────────────────────────

export interface MaaTask {
  waybill: string;
  orderSource: string;
  shipperName: string;
  receiverName: string;
  destinationCity: string;
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
    orderSource: 'MOCK',
    shipperName: `PT Pengirim ${awb.slice(-4)}`,
    receiverName: 'Penerima Mock',
    destinationCity: 'Jakarta',
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
    keepalive: true,
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
    waybill: task.waybill_no || awb,
    orderSource: task.order_source || '',
    shipperName: task.shipper_info?.name || '-',
    receiverName: task.receiver_info?.name || '-',
    destinationCity: task.receiver_info?.address || '-',
  };
}

async function realClaimAWB(
  awb: string,
  payload: ClaimPayload,
  token: string,
): Promise<{ message: string }> {
  const apiBase = ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';
  const url = `${apiBase}/order/v2/claim/${encodeURIComponent(awb)}`;

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
    method: 'POST',
    headers: headers,
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

  return { message: body.info || 'Claimed Successfully' };
}

async function realGetRates(
  origin: string,
  destination: string,
  weight: number,
  token: string,
): Promise<ServiceRate[]> {
  const apiBase = ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';
  const url = `${apiBase}/rates?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&weight=${weight}`;

  const headers = {
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
    'Accept': 'application/json',
  };

  const response = await fetch(url, {
    method: 'GET',
    headers: headers,
    keepalive: true,
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
  ): Promise<{ message: string }> {
    if (IS_MOCK_MODE) return mockClaimAWB(awb);
    return realClaimAWB(awb, payload, token);
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
