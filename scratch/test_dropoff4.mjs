// Test Anteraja - Focus on serviceType field naming
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

function basePayload(agent) {
  return {
    agent_staff_id: agent.agent_staff_id,
    agentStaffId: agent.agent_staff_id,
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
  };
}

async function main() {
  const { token, agent } = await casLogin('50004786', 'aa12345');

  // Try every possible variation of "serviceType"
  const serviceTypeVariations = [
    { serviceType: 'REG', service_type: 'REG', product_code: 'REG', productCode: 'REG', type: 'REG' },
    // Maybe the model has @SerializedName("service_type") but the validator message is camelCase
    // The smali had field name "productCode" - maybe that's the actual JSON key
  ];

  // Test A: full duplicate with product_code
  const payloadA = {
    ...basePayload(agent),
    serviceType: 'REG',
    service_type: 'REG',
    product_code: 'REG',
    productCode: 'REG',
    type: 'REG',
    servicetype: 'REG'
  };
  console.log('\n=== Test A: All possible serviceType variations ===');
  const resA = await fetch(`${API_BASE}/task/dropoff`, {
    method: 'POST', headers: makeHeaders(token), body: JSON.stringify([payloadA])
  });
  console.log('Status:', resA.status);
  const bodyA = await resA.text();
  console.log('Response:', bodyA);

  // If still failing, maybe need to look at headers? Maybe service type is a header param?
  // Or maybe the API expects the data in a different format

  // Test B: Try with items array included (maybe serviceType comes from items?)
  const payloadB = {
    ...basePayload(agent),
    serviceType: 'REG',
    service_type: 'REG',
    product_code: 'REG',
    productCode: 'REG',
    items: [{
      declaredValue: 150000, declared_value: 150000,
      fragile: false,
      height: 10.0, itemCategory: 'Dokumen', item_category: 'Dokumen',
      itemDesc: 'Buku & Dokumen Keluarga', item_desc: 'Buku & Dokumen Keluarga',
      itemName: 'Buku & Dokumen Keluarga', item_name: 'Buku & Dokumen Keluarga',
      length: 20.0, weight: 1.0, width: 15.0
    }]
  };
  console.log('\n=== Test B: With items array ===');
  const resB = await fetch(`${API_BASE}/task/dropoff`, {
    method: 'POST', headers: makeHeaders(token), body: JSON.stringify([payloadB])
  });
  console.log('Status:', resB.status);
  const bodyB = await resB.text();
  console.log('Response:', bodyB);

  // Test C: Maybe header 'serviceType' or 'service-type'?
  const headersC = { ...makeHeaders(token), 'serviceType': 'REG', 'X-Service-Type': 'REG' };
  const payloadC = { ...basePayload(agent), serviceType: 'REG', service_type: 'REG', product_code: 'REG', productCode: 'REG' };
  console.log('\n=== Test C: serviceType in header ===');
  const resC = await fetch(`${API_BASE}/task/dropoff`, {
    method: 'POST', headers: headersC, body: JSON.stringify([payloadC])
  });
  console.log('Status:', resC.status);
  console.log('Response:', await resC.text());

  // Test D: Try using the /task/create endpoint instead of /task/dropoff
  console.log('\n=== Test D: /task/create endpoint ===');
  const resD = await fetch(`${API_BASE}/task/create`, {
    method: 'POST', headers: makeHeaders(token), body: JSON.stringify([payloadA])
  });
  console.log('Status:', resD.status);
  console.log('Response:', await resD.text());

  // Test E: Try /order/create 
  console.log('\n=== Test E: /order/create endpoint ===');
  const resE = await fetch(`${API_BASE}/order/create`, {
    method: 'POST', headers: makeHeaders(token), body: JSON.stringify([payloadA])
  });
  console.log('Status:', resE.status);
  console.log('Response:', await resE.text());

  // Test F: Try /order/v2/create
  console.log('\n=== Test F: /order/v2/create endpoint ===');
  const resF = await fetch(`${API_BASE}/order/v2/create`, {
    method: 'POST', headers: makeHeaders(token), body: JSON.stringify(payloadA)
  });
  console.log('Status:', resF.status);
  console.log('Response:', await resF.text());
}

main().catch(e => console.error('FATAL:', e));
