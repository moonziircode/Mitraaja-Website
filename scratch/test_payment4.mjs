// Test task submission/confirmation flow to get AWB
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

  // List tasks to see existing ones
  console.log('\n=== List tasks (state=NEW) ===');
  const listRes = await fetch(`${API_BASE}/task/list?agent_staff_id=${agent.agent_staff_id}&state=NEW&page=0&size=5`, {
    method: 'GET', headers: makeHeaders(token)
  });
  console.log('Status:', listRes.status);
  const listBody = await listRes.text();
  console.log('Response:', listBody.substring(0, 2000));

  // Try POST /task/payment with task_code from list
  // Use the task we just created
  const taskCode = 'MAA-2026060033181633';

  // In the APK, the flow after dropoff creation is:
  // 1. Create dropoff -> task with status NEW, payment NOT_PAID
  // 2. User pays (cash or QR)
  // 3. Payment confirmed -> waybill generated
  
  // For CASH: the agent confirms cash payment was received
  // The endpoint might be POST /task/payment/cash
  
  const cashTests = [
    { 
      label: 'POST /task/payment with taskCode+paymentMethod',
      url: `${API_BASE}/task/payment`,
      body: { taskCode, paymentMethod: 'CASH' }
    },
    {
      label: 'POST /task/payment/confirm',
      url: `${API_BASE}/task/payment/confirm`,
      body: { task_code: taskCode, payment_method: 'CASH' }
    },
    {
      label: 'POST /task/payment/initiate CASH',
      url: `${API_BASE}/task/payment/initiate`,
      body: { task_code: taskCode, payment_method: 'CASH', agent_staff_id: agent.agent_staff_id }
    },
    {
      label: 'POST /task/payment/cash with task_code',
      url: `${API_BASE}/task/payment/cash`,
      body: { task_code: taskCode, agent_staff_id: agent.agent_staff_id }
    },
    {
      label: 'POST /task/payment/cash with task_codes array',
      url: `${API_BASE}/task/payment/cash`,
      body: { task_codes: [taskCode], agent_staff_id: agent.agent_staff_id }
    },
    {
      label: 'POST /task/payment with group',
      url: `${API_BASE}/task/payment`,
      body: { group: `MAA081234567890`, payment_method: 'CASH', agent_staff_id: agent.agent_staff_id }
    },
  ];

  for (const t of cashTests) {
    console.log(`\n--- ${t.label} ---`);
    const res = await fetch(t.url, { method: 'POST', headers: makeHeaders(token), body: JSON.stringify(t.body) });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text.substring(0, 600));
    if (res.status === 200 && text.includes('"status":0')) {
      console.log('\n🎉 PAYMENT CONFIRMED!');
      // Check if waybill is returned
      const parsed = JSON.parse(text);
      console.log('Full response:', JSON.stringify(parsed, null, 2));
      break;
    }
  }

  // Also try: maybe /task/payment needs different Content-Type or query params
  console.log('\n--- POST /task/payment as query param ---');
  const qpRes = await fetch(`${API_BASE}/task/payment?task_code=${taskCode}&payment_method=CASH`, {
    method: 'POST', headers: makeHeaders(token), body: '{}'
  });
  console.log('Status:', qpRes.status);
  console.log('Response:', (await qpRes.text()).substring(0, 500));
}

main().catch(e => console.error('FATAL:', e));
