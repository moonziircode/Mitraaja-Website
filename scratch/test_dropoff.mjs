// Test real Anteraja dropoff API to discover correct payload format
// This script authenticates via CAS, then tries POST /task/dropoff

const AUTH_URL = 'https://cas.anteraja.id';
const GATEWAY_URL = 'https://api.anteraja.id';
const API_BASE = 'https://api.anteraja.id/maa-task';

async function casLogin(username, password) {
  // Step 1: GET cas/login
  const step1 = await fetch(`${AUTH_URL}/cas/login?isapp=true&acctype=emp`, { method: 'GET', redirect: 'manual' });
  const setCookie1 = step1.headers.getSetCookie?.() || [];
  const jsessionidCookie = setCookie1.find(c => c.startsWith('JSESSIONID='));
  const jsessionid = jsessionidCookie ? jsessionidCookie.split(';')[0] : '';
  const lt = step1.headers.get('lt');
  const execution = step1.headers.get('execution');
  console.log('Step 1 - JSESSIONID:', jsessionid ? 'OK' : 'MISSING', 'lt:', lt ? 'OK' : 'MISSING', 'execution:', execution ? 'OK' : 'MISSING');

  // Step 2: POST cas/login
  const postData = new URLSearchParams({ username, password, _eventId: 'submit', submit: 'login', lt, execution });
  const step2 = await fetch(`${AUTH_URL}/cas/login?isapp=true&acctype=emp`, {
    method: 'POST',
    headers: { 'Cookie': jsessionid, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: postData.toString(),
    redirect: 'manual'
  });
  const setCookie2 = step2.headers.getSetCookie?.() || [];
  const tgcCookie = setCookie2.find(c => c.startsWith('TGC='));
  const tgc = tgcCookie ? tgcCookie.split(';')[0] : '';
  console.log('Step 2 - TGC:', tgc ? 'OK' : 'MISSING');
  if (!tgc) throw new Error('Login failed: Bad credentials');

  // Step 3: GET cas/login with service
  const step3 = await fetch(`${AUTH_URL}/cas/login?service=${encodeURIComponent(GATEWAY_URL + '/')}`, {
    method: 'GET',
    headers: { 'Cookie': tgc },
    redirect: 'manual'
  });
  const redirectUrl = step3.headers.get('redirecturl') || step3.headers.get('location');
  const ticket = new URL(redirectUrl).searchParams.get('ticket');
  console.log('Step 3 - Ticket:', ticket ? ticket.substring(0, 20) + '...' : 'MISSING');

  // Step 4: POST user/cas/login
  const step4 = await fetch(`${GATEWAY_URL}/user/cas/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'token': '', 'appid': 'JV_APP', 'msgid': Date.now().toString(),
      'imei': 'dev_device_uuid_12345', 'deviceUuid': 'dev_device_uuid_12345',
      'hardwareSerialNo': 'dev_serial', 'manufacture': 'Apple', 'model': 'Macbook',
      'os': 'macOS', 'osVersion': '14.0', 'appVersion': '2.2.4', 'mv': '1.1', 'source': 'MAA'
    },
    body: JSON.stringify({ ticket, deviceId: 'dev_device_uuid_12345', appKey: 'MAA', appSecret: 'santuy', service: GATEWAY_URL + '/' })
  });
  const resBody = await step4.json();
  if (resBody.status !== 0) throw new Error('Gateway login failed: ' + resBody.info);
  console.log('Step 4 - Token:', resBody.content.token.substring(0, 20) + '...');
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
  console.log('=== Anteraja Drop-off API Test ===\n');

  // 1) Login
  const { token, agent } = await casLogin('50004786', 'aa12345');
  console.log('\nAgent info:', JSON.stringify(agent, null, 2));

  // 2) First, test with fields from the validation error message:
  //    serviceType, itemName, weight, deliveryPrice, shipperInfo, receiverInfo
  const payload = {
    agentStaffId: agent.agent_staff_id,
    serviceType: 'REG',
    itemName: 'Buku & Dokumen Keluarga',
    weight: 1.0,
    deliveryPrice: 11500.0,
    itemValue: 150000.0,
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
  };

  console.log('\n=== Test 1: POST /task/dropoff with validation-error fields ===');
  console.log('Payload:', JSON.stringify([payload], null, 2));

  const res1 = await fetch(`${API_BASE}/task/dropoff`, {
    method: 'POST',
    headers: makeHeaders(token),
    body: JSON.stringify([payload])
  });
  console.log('Status:', res1.status);
  const body1 = await res1.text();
  console.log('Response:', body1);

  // If that fails, try alternative field names
  if (res1.status !== 200 || body1.includes('"status":-1') || body1.includes('Validation failed')) {
    console.log('\n=== Test 2: Alternative payload with productCode instead ===');
    const payload2 = {
      agentStaffId: agent.agent_staff_id,
      productCode: 'REG',
      serviceType: 'REG',
      itemName: 'Buku & Dokumen Keluarga',
      itemDesc: 'Buku & Dokumen Keluarga',
      parcelTotalWeight: 1.0,
      weight: 1.0,
      deliveryPrice: 11500.0,
      itemValue: 150000.0,
      items: [{
        declaredValue: 150000,
        fragile: false,
        height: 10.0,
        itemCategory: 'Dokumen',
        itemDesc: 'Buku & Dokumen Keluarga',
        itemName: 'Buku & Dokumen Keluarga',
        length: 20.0,
        weight: 1.0,
        width: 15.0
      }],
      note: '',
      packing: null,
      packingPrice: null,
      flightNumber: null,
      insuranceItemCategory: null,
      insurancePrice: null,
      shipperInfo: {
        name: 'Ahmad Budi',
        phone: '081234567890',
        address: 'Jl. Raya Pamulang No. 12, RT 01/RW 03, Kel. Pamulang Barat',
        districtCode: '36.74.03',
        postcode: '15417',
        geoloc: null
      },
      receiverInfo: {
        name: 'Siti Aminah',
        phone: '085712345678',
        address: 'Jl. Palmerah Barat No. 5, RT 02/RW 05, Kel. Jatipulo',
        districtCode: '31.73.06',
        postcode: '11480',
        geoloc: null
      },
      useInsurance: false
    };

    console.log('Payload2:', JSON.stringify([payload2], null, 2));
    const res2 = await fetch(`${API_BASE}/task/dropoff`, {
      method: 'POST',
      headers: makeHeaders(token),
      body: JSON.stringify([payload2])
    });
    console.log('Status:', res2.status);
    const body2 = await res2.text();
    console.log('Response:', body2);
  }
}

main().catch(e => console.error('FATAL:', e));
