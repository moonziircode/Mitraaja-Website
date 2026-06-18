// Test minimal working payload then payment
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

  // The exact payload that worked in Test A:
  const payload = {
    agent_staff_id: agent.agent_staff_id,
    agentStaffId: agent.agent_staff_id,
    serviceType: 'REG',
    service_type: 'REG',
    product_code: 'REG',
    productCode: 'REG',
    type: 'REG',
    servicetype: 'REG',
    itemName: 'Test AWB Generation',
    item_name: 'Test AWB Generation',
    weight: 1.0,
    parcel_total_weight: 1.0,
    deliveryPrice: 11500.0,
    delivery_price: 11500.0,
    itemValue: 100000.0,
    item_value: 100000.0,
    shipperInfo: {
      name: 'Aqsa Muflihan', phone: '081234567890',
      address: 'Jl. Raya Pamulang No. 12', districtCode: '36.74.03', district_code: '36.74.03', postcode: '15417'
    },
    shipper_info: {
      name: 'Aqsa Muflihan', phone: '081234567890',
      address: 'Jl. Raya Pamulang No. 12', districtCode: '36.74.03', district_code: '36.74.03', postcode: '15417'
    },
    receiverInfo: {
      name: 'Budi Santoso', phone: '085712345678',
      address: 'Jl. Palmerah Barat No. 5', districtCode: '31.73.06', district_code: '31.73.06', postcode: '11480'
    },
    receiver_info: {
      name: 'Budi Santoso', phone: '085712345678',
      address: 'Jl. Palmerah Barat No. 5', districtCode: '31.73.06', district_code: '31.73.06', postcode: '11480'
    },
    useInsurance: false,
    use_insurance: false
  };

  console.log('\n=== Step 1: Create order ===');
  const createRes = await fetch(`${API_BASE}/task/dropoff`, {
    method: 'POST', headers: makeHeaders(token), body: JSON.stringify([payload])
  });
  const createBody = await createRes.json();
  
  if (createBody.status !== 0) {
    console.log('FAILED:', JSON.stringify(createBody));
    return;
  }

  const task = createBody.content[0];
  console.log('✓ Order created!');
  console.log('  task_code:', task.task_code);
  console.log('  waybill_no:', task.waybill_no);
  console.log('  payment_status:', task.payment_status);
  console.log('  task_status:', task.task_status);

  // 2) Now try payment
  // The agent is cash_enabled = true. For mitra/agent drop-off, 
  // payment is typically CASH collected from customer.
  // The app probably calls a "pay" endpoint to confirm cash payment.
  
  const taskCode = task.task_code;
  
  // Try various payment/confirmation endpoints
  const endpoints = [
    { label: 'POST /task/payment', url: `${API_BASE}/task/payment`, body: { task_codes: [taskCode], payment_method: 'CASH' } },
    { label: 'POST /task/payment (snake)', url: `${API_BASE}/task/payment`, body: { taskCodes: [taskCode], paymentMethod: 'CASH', task_codes: [taskCode], payment_method: 'CASH' } },
    { label: 'POST /task/pay', url: `${API_BASE}/task/pay`, body: { task_codes: [taskCode], payment_method: 'CASH' } },
    { label: 'PUT /task/payment', url: `${API_BASE}/task/payment`, body: { task_codes: [taskCode], payment_method: 'CASH' } },
    { label: 'POST /task/checkout', url: `${API_BASE}/task/checkout`, body: { task_codes: [taskCode], payment_method: 'CASH' } },
    { label: 'POST /payment/cash', url: `${API_BASE}/payment/cash`, body: { task_codes: [taskCode] } },
    { label: 'POST /task/dropoff/pay', url: `${API_BASE}/task/dropoff/pay`, body: { task_codes: [taskCode], payment_method: 'CASH' } },
    { label: 'POST /task/dropoff/payment', url: `${API_BASE}/task/dropoff/payment`, body: { task_codes: [taskCode], payment_method: 'CASH' } },
  ];

  for (const ep of endpoints) {
    console.log(`\n--- ${ep.label} ---`);
    const method = ep.label.startsWith('PUT') ? 'PUT' : 'POST';
    const res = await fetch(ep.url, {
      method, headers: makeHeaders(token), body: JSON.stringify(ep.body)
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text.substring(0, 800));
    
    // Check if this gave us a waybill
    if (text.includes('waybill') && !text.includes('"waybill_no":null')) {
      console.log('\n🎉 PAYMENT SUCCESS - WAYBILL GENERATED!');
      break;
    }
  }

  // 3) Also try: GET task detail to see payment methods available
  console.log('\n=== Task detail ===');
  const detailRes = await fetch(`${API_BASE}/task/detail/${taskCode}`, {
    method: 'GET', headers: makeHeaders(token)
  });
  console.log('Status:', detailRes.status);
  if (detailRes.status === 200) {
    console.log('Detail:', (await detailRes.text()).substring(0, 1000));
  } else {
    console.log('Response:', await detailRes.text());
    
    // Try alternate detail endpoints
    for (const path of [`/task/${taskCode}`, `/task/get/${taskCode}`, `/task/info/${taskCode}`]) {
      const r = await fetch(`${API_BASE}${path}`, { method: 'GET', headers: makeHeaders(token) });
      console.log(`GET ${path} -> ${r.status}`);
      if (r.status === 200) {
        const t = await r.text();
        console.log(t.substring(0, 500));
        break;
      }
    }
  }
}

main().catch(e => console.error('FATAL:', e));
