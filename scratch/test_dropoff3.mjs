// Test Anteraja dropoff - hybrid naming convention test
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

  // Hybrid: snake_case worked for most fields, but the validation error
  // names are camelCase (serviceType, weight, etc.)
  // So maybe: JSON keys are snake_case, but the API validator reports in camelCase.
  // Try: serviceType (camelCase) since the validator calls it that

  // Test 7: ALL snake_case + serviceType camelCase + weight as object
  const tests = [
    {
      label: 'Test 7: snake_case + serviceType camelCase',
      payload: {
        agent_staff_id: agent.agent_staff_id,
        serviceType: 'REG',  // camelCase since that's what validator calls it
        service_type: 'REG', // also include snake_case
        item_name: 'Buku & Dokumen Keluarga',
        weight: 1.0,         // validator calls it "weight" (no underscore)
        delivery_price: 11500.0,
        item_value: 150000.0,
        shipper_info: {
          name: 'Ahmad Budi', phone: '081234567890',
          address: 'Jl. Raya Pamulang No. 12', district_code: '36.74.03', postcode: '15417'
        },
        receiver_info: {
          name: 'Siti Aminah', phone: '085712345678',
          address: 'Jl. Palmerah Barat No. 5', district_code: '31.73.06', postcode: '11480'
        },
        use_insurance: false
      }
    },
    {
      label: 'Test 8: ALL duplicate snake+camel',
      payload: {
        agent_staff_id: agent.agent_staff_id,
        agentStaffId: agent.agent_staff_id,
        serviceType: 'REG',
        service_type: 'REG',
        itemName: 'Buku & Dokumen Keluarga',
        item_name: 'Buku & Dokumen Keluarga',
        weight: 1.0,
        parcel_total_weight: 1.0,
        deliveryPrice: 11500.0,
        delivery_price: 11500.0,
        itemValue: 150000.0,
        item_value: 150000.0,
        shipperInfo: {
          name: 'Ahmad Budi', phone: '081234567890',
          address: 'Jl. Raya Pamulang No. 12', districtCode: '36.74.03', district_code: '36.74.03', postcode: '15417'
        },
        shipper_info: {
          name: 'Ahmad Budi', phone: '081234567890',
          address: 'Jl. Raya Pamulang No. 12', districtCode: '36.74.03', district_code: '36.74.03', postcode: '15417'
        },
        receiverInfo: {
          name: 'Siti Aminah', phone: '085712345678',
          address: 'Jl. Palmerah Barat No. 5', districtCode: '31.73.06', district_code: '31.73.06', postcode: '11480'
        },
        receiver_info: {
          name: 'Siti Aminah', phone: '085712345678',
          address: 'Jl. Palmerah Barat No. 5', districtCode: '31.73.06', district_code: '31.73.06', postcode: '11480'
        },
        useInsurance: false,
        use_insurance: false
      }
    }
  ];

  for (const t of tests) {
    console.log(`\n=== ${t.label} ===`);
    console.log('Payload:', JSON.stringify([t.payload], null, 2));
    const res = await fetch(`${API_BASE}/task/dropoff`, {
      method: 'POST', headers: makeHeaders(token), body: JSON.stringify([t.payload])
    });
    console.log('Status:', res.status);
    console.log('Response:', await res.text());
  }
}

main().catch(e => console.error('FATAL:', e));
