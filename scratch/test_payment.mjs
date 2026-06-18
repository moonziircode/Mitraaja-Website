// Test Anteraja payment flow after order creation
const AUTH_URL = 'https://cas.anteraja.id';
const GATEWAY_URL = 'https://api.anteraja.id';
const API_BASE = 'https://api.anteraja.id/maa-task';

async function casLogin(username, password) {
  const step1 = await fetch(`${AUTH_URL}/cas/login?isapp=true&acctype=emp`, { method: 'GET', redirect: 'manual' });
  const setCookie1 = step1.headers.getSetCookie?.() || [];
  const jsessionid = (setCookie1.find(c => c.startsWith('JSESSIONID=')) || '').split(';')[0];
  const lt = step1.headers.get('lt');
  const execution = step1.headers.get('execution');
  const step2 = await fetch(`${AUTH_URL}/cas/login?isapp=true&acctype=emp`, {
    method: 'POST',
    headers: { 'Cookie': jsessionid, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password, _eventId: 'submit', submit: 'login', lt, execution }).toString(),
    redirect: 'manual'
  });
  const tgc = ((step2.headers.getSetCookie?.() || []).find(c => c.startsWith('TGC=')) || '').split(';')[0];
  if (!tgc) throw new Error('Login failed');
  const step3 = await fetch(`${AUTH_URL}/cas/login?service=${encodeURIComponent(GATEWAY_URL + '/')}`, {
    method: 'GET', headers: { 'Cookie': tgc }, redirect: 'manual'
  });
  const redirectUrl = step3.headers.get('redirecturl') || step3.headers.get('location');
  const ticket = new URL(redirectUrl).searchParams.get('ticket');
  const step4 = await fetch(`${GATEWAY_URL}/user/cas/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 'Accept': 'application/json',
      'token': '', 'appid': 'JV_APP', 'msgid': Date.now().toString(),
      'imei': 'dev_device_uuid_12345', 'deviceUuid': 'dev_device_uuid_12345',
      'hardwareSerialNo': 'dev_serial', 'manufacture': 'Apple', 'model': 'Macbook',
      'os': 'macOS', 'osVersion': '14.0', 'appVersion': '2.2.4', 'mv': '1.1', 'source': 'MAA'
    },
    body: JSON.stringify({ ticket, deviceId: 'dev_device_uuid_12345', appKey: 'MAA', appSecret: 'santuy', service: GATEWAY_URL + '/' })
  });
  const resBody = await step4.json();
  if (resBody.status !== 0) throw new Error('Gateway login failed: ' + resBody.info);
  console.log('✓ Login OK');
  return { token: resBody.content.token, agent: resBody.content.agent };
}

function makeHeaders(token) {
  return {
    'token': token, 'appid': 'JV_APP', 'msgid': Date.now().toString(),
    'imei': 'dev_device_uuid_12345', 'deviceUuid': 'dev_device_uuid_12345',
    'hardwareSerialNo': 'dev_serial', 'manufacture': 'Apple', 'model': 'Macbook',
    'os': 'macOS', 'osVersion': '14.0', 'appVersion': '2.2.4', 'mv': '1.1', 'source': 'MAA',
    'Content-Type': 'application/json', 'Accept': 'application/json'
  };
}

async function main() {
  const { token, agent } = await casLogin('50004786', 'aa12345');

  // 1) Create a new dropoff task first
  console.log('\n=== Step 1: Create dropoff order ===');
  const orderPayload = {
    agent_staff_id: agent.agent_staff_id,
    agentStaffId: agent.agent_staff_id,
    product_code: 'REG',
    serviceType: 'REG',
    service_type: 'REG',
    item_name: 'Test Pembayaran',
    itemName: 'Test Pembayaran',
    weight: 1.0,
    delivery_price: 11500.0,
    deliveryPrice: 11500.0,
    item_value: 100000.0,
    itemValue: 100000.0,
    shipper_info: {
      name: 'Aqsa Test', phone: '081234567890',
      address: 'Jl. Raya Pamulang No. 12', district_code: '36.74.03', districtCode: '36.74.03', postcode: '15417'
    },
    shipperInfo: {
      name: 'Aqsa Test', phone: '081234567890',
      address: 'Jl. Raya Pamulang No. 12', district_code: '36.74.03', districtCode: '36.74.03', postcode: '15417'
    },
    receiver_info: {
      name: 'Budi Test', phone: '085712345678',
      address: 'Jl. Palmerah Barat No. 5', district_code: '31.73.06', districtCode: '31.73.06', postcode: '11480'
    },
    receiverInfo: {
      name: 'Budi Test', phone: '085712345678',
      address: 'Jl. Palmerah Barat No. 5', district_code: '31.73.06', districtCode: '31.73.06', postcode: '11480'
    },
    use_insurance: false,
    useInsurance: false
  };

  const createRes = await fetch(`${API_BASE}/task/dropoff`, {
    method: 'POST', headers: makeHeaders(token), body: JSON.stringify([orderPayload])
  });
  const createBody = await createRes.json();
  console.log('Create status:', createRes.status, createBody.status === 0 ? 'OK' : 'FAIL');
  
  if (createBody.status !== 0) {
    console.log('Create failed:', JSON.stringify(createBody));
    return;
  }

  const taskCode = createBody.content[0].task_code;
  const totalPrice = createBody.content[0].total_delivery_price;
  console.log('Task code:', taskCode);
  console.log('Total price:', totalPrice);
  console.log('Payment status:', createBody.content[0].payment_status);
  console.log('Waybill:', createBody.content[0].waybill_no);

  // 2) Try payment endpoints
  // From APK decompilation, the payment endpoints might be under /task/payment or /payment
  const paymentEndpoints = [
    { url: `${API_BASE}/task/payment`, method: 'POST', body: { task_code: taskCode, payment_method: 'CASH' } },
    { url: `${API_BASE}/task/payment/cash`, method: 'POST', body: { task_code: taskCode } },
    { url: `${API_BASE}/task/payment/cash`, method: 'POST', body: { task_codes: [taskCode] } },
    { url: `${API_BASE}/task/pay`, method: 'POST', body: { task_code: taskCode, payment_method: 'CASH' } },
    { url: `${API_BASE}/task/pay/cash`, method: 'POST', body: { task_codes: [taskCode] } },
    { url: `${API_BASE}/task/${taskCode}/pay`, method: 'POST', body: { payment_method: 'CASH' } },
    { url: `${API_BASE}/task/confirm`, method: 'POST', body: { task_codes: [taskCode] } },
    { url: `${API_BASE}/task/confirm/payment`, method: 'POST', body: { task_codes: [taskCode], payment_method: 'CASH' } },
  ];

  for (const ep of paymentEndpoints) {
    console.log(`\n--- ${ep.method} ${ep.url} ---`);
    const res = await fetch(ep.url, {
      method: ep.method,
      headers: makeHeaders(token),
      body: JSON.stringify(ep.body)
    });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Response:', body.substring(0, 500));
    if (res.status === 200 && body.includes('"status":0')) {
      console.log('>>> PAYMENT ENDPOINT FOUND! <<<');
      break;
    }
  }

  // 3) Also try to get the task detail to check if there's a payment link
  console.log('\n=== Get task detail ===');
  const detailRes = await fetch(`${API_BASE}/task/${taskCode}`, {
    method: 'GET', headers: makeHeaders(token)
  });
  console.log('Detail status:', detailRes.status);
  const detailBody = await detailRes.text();
  console.log('Detail:', detailBody.substring(0, 1000));

  // 4) Check if agent is cash_enabled (we saw it's true)
  // Maybe for cash payments, we just need to "confirm" the task
  console.log('\n=== Try task/confirm endpoint ===');
  const confirmEndpoints = [
    `${API_BASE}/task/confirm`,
    `${API_BASE}/task/submit`,
    `${API_BASE}/task/checkout`,
    `${API_BASE}/task/process`,
  ];
  for (const url of confirmEndpoints) {
    console.log(`\n--- POST ${url} ---`);
    const res = await fetch(url, {
      method: 'POST', headers: makeHeaders(token),
      body: JSON.stringify({ task_codes: [taskCode], taskCodes: [taskCode], payment_method: 'CASH', paymentMethod: 'CASH' })
    });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Response:', body.substring(0, 500));
  }
}

main().catch(e => console.error('FATAL:', e));
