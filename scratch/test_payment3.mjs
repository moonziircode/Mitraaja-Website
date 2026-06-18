// Test payment endpoint with different body formats
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

async function tryPost(token, url, body, label) {
  console.log(`\n--- ${label} ---`);
  console.log('Body:', JSON.stringify(body));
  const res = await fetch(url, { method: 'POST', headers: makeHeaders(token), body: JSON.stringify(body) });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text.substring(0, 600));
  return { status: res.status, text };
}

async function main() {
  const { token, agent } = await casLogin('50004786', 'aa12345');

  // Use a previously created task code
  const taskCode = 'MAA-2026060033181633';

  // The /task/payment endpoint returns 500 - probably expects specific fields
  // Try various body formats for the payment endpoint
  const tests = [
    // Maybe it expects an array like dropoff?
    { label: '1. Array of task_code strings', body: [taskCode] },
    // Maybe it expects task_code as string
    { label: '2. Just task_code string', body: { task_code: taskCode } },
    // Maybe with agent_staff_id
    { label: '3. With agent_staff_id', body: { task_code: taskCode, agent_staff_id: agent.agent_staff_id } },
    // Maybe taskCode camelCase
    { label: '4. taskCode camelCase', body: { taskCode: taskCode, agentStaffId: agent.agent_staff_id } },
    // Maybe it needs payment type
    { label: '5. With paymentType CASH', body: { task_code: taskCode, payment_type: 'CASH', agent_staff_id: agent.agent_staff_id } },
    // Try the cmdm_code approach
    { label: '6. With full details', body: { 
      task_code: taskCode, 
      agent_staff_id: agent.agent_staff_id,
      payment_method: 'CASH',
      payment_type: 'CASH',
      amount: 11500
    }},
    // Array of objects
    { label: '7. Array of objects', body: [{ task_code: taskCode, payment_method: 'CASH' }] },
    // Like the smali MaaPaymentRequestBody
    { label: '8. MaaPaymentRequestBody style', body: {
      taskCodes: [taskCode],
      task_codes: [taskCode],
      agentStaffId: agent.agent_staff_id,
      agent_staff_id: agent.agent_staff_id,
      paymentMethod: 'CASH',
      payment_method: 'CASH',
      paymentType: 'CASH',
      payment_type: 'CASH'
    }},
  ];

  for (const t of tests) {
    const result = await tryPost(token, `${API_BASE}/task/payment`, t.body, t.label);
    if (result.status === 200 && result.text.includes('"status":0')) {
      console.log('\n🎉 FOUND WORKING PAYMENT FORMAT!');
      break;
    }
  }

  // Also try to see list of available tasks (maybe there's a list endpoint)
  console.log('\n=== List tasks for agent ===');
  const listRes = await fetch(`${API_BASE}/task/list?agent_staff_id=${agent.agent_staff_id}&status=NEW&page=1&size=5`, {
    method: 'GET', headers: makeHeaders(token)
  });
  console.log('List status:', listRes.status);
  const listText = await listRes.text();
  console.log('List response:', listText.substring(0, 1500));
}

main().catch(e => console.error('FATAL:', e));
