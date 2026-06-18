// Test Anteraja dropoff API with snake_case field names
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
  console.log('✓ Login OK. Token:', resBody.content.token.substring(0, 20) + '...');
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

async function testDropoff(token, agent, label, payload) {
  console.log(`\n=== ${label} ===`);
  console.log('Payload:', JSON.stringify([payload], null, 2));
  const res = await fetch(`${API_BASE}/task/dropoff`, {
    method: 'POST', headers: makeHeaders(token), body: JSON.stringify([payload])
  });
  console.log('Status:', res.status);
  const body = await res.text();
  console.log('Response:', body);
  return { status: res.status, body };
}

async function main() {
  const { token, agent } = await casLogin('50004786', 'aa12345');

  // Test 3: snake_case fields
  await testDropoff(token, agent, 'Test 3: snake_case fields', {
    agent_staff_id: agent.agent_staff_id,
    service_type: 'REG',
    item_name: 'Buku & Dokumen Keluarga',
    weight: 1.0,
    delivery_price: 11500.0,
    item_value: 150000.0,
    shipper_info: {
      name: 'Ahmad Budi',
      phone: '081234567890',
      address: 'Jl. Raya Pamulang No. 12, RT 01/RW 03, Kel. Pamulang Barat',
      district_code: '36.74.03',
      postcode: '15417'
    },
    receiver_info: {
      name: 'Siti Aminah',
      phone: '085712345678',
      address: 'Jl. Palmerah Barat No. 5, RT 02/RW 05, Kel. Jatipulo',
      district_code: '31.73.06',
      postcode: '11480'
    },
    use_insurance: false
  });

  // Test 4: mixed naming (camelCase Java-style) with explicitly typed values
  await testDropoff(token, agent, 'Test 4: Java-style camelCase with Number objects', {
    agentStaffId: agent.agent_staff_id,
    serviceType: 'REG',
    itemName: 'Buku & Dokumen Keluarga',
    weight: Number(1.0),
    deliveryPrice: Number(11500.0),
    itemValue: Number(150000.0),
    shipperInfo: {
      name: 'Ahmad Budi',
      phone: '081234567890',
      address: 'Jl. Raya Pamulang No. 12, RT 01/RW 03, Kel. Pamulang Barat',
      districtCode: '36.74.03',
      postcode: '15417'
    },
    receiverInfo: {
      name: 'Siti Aminah',
      phone: '085712345678',
      address: 'Jl. Palmerah Barat No. 5, RT 02/RW 05, Kel. Jatipulo',
      districtCode: '31.73.06',
      postcode: '11480'
    },
    useInsurance: false
  });

  // Test 5: Maybe the issue is the array wrapping? Try without array
  console.log('\n=== Test 5: NOT wrapped in array ===');
  const payload5 = {
    agentStaffId: agent.agent_staff_id,
    serviceType: 'REG',
    itemName: 'Buku & Dokumen Keluarga',
    weight: 1.0,
    deliveryPrice: 11500.0,
    itemValue: 150000.0,
    shipperInfo: {
      name: 'Ahmad Budi',
      phone: '081234567890',
      address: 'Jl. Raya Pamulang No. 12',
      districtCode: '36.74.03',
      postcode: '15417'
    },
    receiverInfo: {
      name: 'Siti Aminah',
      phone: '085712345678',
      address: 'Jl. Palmerah Barat No. 5',
      districtCode: '31.73.06',
      postcode: '11480'
    },
    useInsurance: false
  };
  console.log('Payload:', JSON.stringify(payload5, null, 2));
  const res5 = await fetch(`${API_BASE}/task/dropoff`, {
    method: 'POST', headers: makeHeaders(token), body: JSON.stringify(payload5)
  });
  console.log('Status:', res5.status);
  console.log('Response:', await res5.text());

  // Test 6: Try the smali field names from the APK but wrapped as object with key "orders"
  console.log('\n=== Test 6: Wrapped in { orders: [...] } ===');
  const payload6 = { orders: [{
    agentStaffId: agent.agent_staff_id,
    serviceType: 'REG',
    itemName: 'Buku & Dokumen Keluarga',
    weight: 1.0,
    deliveryPrice: 11500.0,
    itemValue: 150000.0,
    shipperInfo: {
      name: 'Ahmad Budi', phone: '081234567890',
      address: 'Jl. Raya Pamulang No. 12', districtCode: '36.74.03', postcode: '15417'
    },
    receiverInfo: {
      name: 'Siti Aminah', phone: '085712345678',
      address: 'Jl. Palmerah Barat No. 5', districtCode: '31.73.06', postcode: '11480'
    },
    useInsurance: false
  }]};
  console.log('Payload:', JSON.stringify(payload6, null, 2));
  const res6 = await fetch(`${API_BASE}/task/dropoff`, {
    method: 'POST', headers: makeHeaders(token), body: JSON.stringify(payload6)
  });
  console.log('Status:', res6.status);
  console.log('Response:', await res6.text());
}

main().catch(e => console.error('FATAL:', e));
