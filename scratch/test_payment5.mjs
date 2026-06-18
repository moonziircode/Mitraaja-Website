// Final attempt: maybe payment is embedded in dropoff call itself, or via /task/payment with full order body
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
  if (resBody.status !== 0) throw new Error('Gateway login failed');
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

  // Make the full order payload (the one that works for dropoff)
  function makeOrderPayload(extra = {}) {
    return {
      agent_staff_id: agent.agent_staff_id,
      agentStaffId: agent.agent_staff_id,
      product_code: 'REG',
      serviceType: 'REG',
      service_type: 'REG',
      type: 'REG',
      servicetype: 'REG',
      productCode: 'REG',
      item_name: 'Buku Kiriman',
      itemName: 'Buku Kiriman',
      weight: 1.0,
      delivery_price: 11500.0,
      deliveryPrice: 11500.0,
      item_value: 100000.0,
      itemValue: 100000.0,
      shipper_info: {
        name: 'Aqsa', phone: '081234567890',
        address: 'Jl. Raya Pamulang No. 12', district_code: '36.74.03', districtCode: '36.74.03', postcode: '15417'
      },
      shipperInfo: {
        name: 'Aqsa', phone: '081234567890',
        address: 'Jl. Raya Pamulang No. 12', district_code: '36.74.03', districtCode: '36.74.03', postcode: '15417'
      },
      receiver_info: {
        name: 'Budi', phone: '085712345678',
        address: 'Jl. Palmerah Barat No. 5', district_code: '31.73.06', districtCode: '31.73.06', postcode: '11480'
      },
      receiverInfo: {
        name: 'Budi', phone: '085712345678',
        address: 'Jl. Palmerah Barat No. 5', district_code: '31.73.06', districtCode: '31.73.06', postcode: '11480'
      },
      use_insurance: false,
      useInsurance: false,
      ...extra
    };
  }

  // Test 1: /task/payment/cash with full order body (since those endpoints expect order body)
  console.log('\n=== Test 1: /task/payment/cash with full order body ===');
  const res1 = await fetch(`${API_BASE}/task/payment/cash`, {
    method: 'POST', headers: makeHeaders(token),
    body: JSON.stringify([makeOrderPayload()])
  });
  console.log('Status:', res1.status);
  const body1 = await res1.text();
  console.log('Response:', body1.substring(0, 800));

  // Test 2: /task/payment/confirm with full order body
  console.log('\n=== Test 2: /task/payment/confirm with full order body ===');
  const res2 = await fetch(`${API_BASE}/task/payment/confirm`, {
    method: 'POST', headers: makeHeaders(token),
    body: JSON.stringify([makeOrderPayload()])
  });
  console.log('Status:', res2.status);
  const body2 = await res2.text();
  console.log('Response:', body2.substring(0, 800));

  // Test 3: /task/dropoff with payment_method CASH (all in one call)
  console.log('\n=== Test 3: /task/dropoff with payment fields ===');
  const res3 = await fetch(`${API_BASE}/task/dropoff`, {
    method: 'POST', headers: makeHeaders(token),
    body: JSON.stringify([makeOrderPayload({
      payment_method: 'CASH',
      paymentMethod: 'CASH',
      payment_status: 'PAID',
      paymentStatus: 'PAID'
    })])
  });
  console.log('Status:', res3.status);
  const body3 = await res3.text();
  console.log('Response:', body3.substring(0, 800));
  // Check if waybill_no is populated
  if (body3.includes('waybill_no') && !body3.includes('"waybill_no":null')) {
    console.log('🎉 WAYBILL FOUND IN DROPOFF WITH PAYMENT!');
  }

  // Test 4: Maybe the flow is different: task/dropoff creates it, then 
  // the task goes through a lifecycle. Perhaps the waybill is assigned after pickup.
  // In that case, the task_code itself IS the trackable identifier.
  // Let's try tracking with a task_code.
  console.log('\n=== Test 4: Track with task_code ===');
  const taskCode = 'MAA-2026060033181482'; // from earlier test
  const trackRes = await fetch(`${API_BASE}/order/v2/search/${taskCode}?agent_staff_id=${agent.agent_staff_id}`, {
    method: 'GET', headers: makeHeaders(token)
  });
  console.log('Track status:', trackRes.status);
  const trackBody = await trackRes.text();
  console.log('Track response:', trackBody.substring(0, 800));

  // Test 5: What about POST /task/checkout - maybe that's the "pay and get awb" step
  console.log('\n=== Test 5: /task/checkout with full body ===');
  const res5 = await fetch(`${API_BASE}/task/checkout`, {
    method: 'POST', headers: makeHeaders(token),
    body: JSON.stringify([makeOrderPayload()])
  });
  console.log('Status:', res5.status);
  const body5 = await res5.text();
  console.log('Response:', body5.substring(0, 800));
}

main().catch(e => console.error('FATAL:', e));
