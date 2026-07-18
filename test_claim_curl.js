const fs = require('fs');
const { execSync } = require('child_process');

async function run() {
  const authUrl = 'https://cas.anteraja.id';
  const gatewayUrl = 'https://api.anteraja.id';
  
  // Step 1
  const step1Response = await fetch(`${authUrl}/cas/login?isapp=true&acctype=emp`, { method: 'GET' });
  const setCookie1 = step1Response.headers.getSetCookie ? step1Response.headers.getSetCookie() : [];
  const jsessionidCookie = setCookie1.find((c) => c.startsWith('JSESSIONID='));
  const jsessionid = jsessionidCookie ? jsessionidCookie.split(';')[0] : '';
  const lt = step1Response.headers.get('lt');
  const execution = step1Response.headers.get('execution');

  // Step 2
  const postData = new URLSearchParams({
    username: '50004786',
    password: 'aa12345',
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

  const setCookie2 = step2Response.headers.getSetCookie ? step2Response.headers.getSetCookie() : [];
  const tgcCookie = setCookie2.find((c) => c.startsWith('TGC='));
  const tgc = tgcCookie ? tgcCookie.split(';')[0] : '';

  // Step 3
  const step3Response = await fetch(`${authUrl}/cas/login?service=${encodeURIComponent(gatewayUrl + '/')}`, {
    method: 'GET',
    headers: { 'Cookie': tgc },
    redirect: 'manual'
  });

  const redirectUrl = step3Response.headers.get('location') || step3Response.headers.get('redirecturl');
  const ticket = new URL(redirectUrl).searchParams.get('ticket');

  // Step 4
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

  const resBody = await step4Response.json();
  const token = resBody.content.token;
  const agentStaffId = '50004786';
  
  // FETCH TASKS
  const taskHeaders = {
    ...step4Headers,
    'token': token,
    'msgid': Date.now().toString(),
    'agent_staff_id': agentStaffId
  };

  const tasksRes = await fetch(`${gatewayUrl}/maa-task/order/v2/task/dropoff?state=ON_HOLD&page=0&size=1`, {
    headers: taskHeaders
  });
  
  const tasksData = await tasksRes.json();
  let awb = '10008581696541';
  let orderSource = 'B2B';
  if (tasksData.status === 0 && tasksData.content && tasksData.content.length > 0) {
      awb = tasksData.content[0].waybill;
      orderSource = tasksData.content[0].order_source || 'B2B';
      console.log("Found AWB to claim:", awb, "with source:", orderSource);
  } else {
      console.log("No ON_HOLD tasks found to claim. Using dummy AWB for testing endpoint.");
  }
  
  const claimPayload = {
      agent_staff_id: agentStaffId,
      orders: [
          {
              order_source: orderSource,
              claim_key: awb
          }
      ]
  };
  
  fs.writeFileSync('claim_payload.json', JSON.stringify(claimPayload));
  fs.writeFileSync('claim_headers.txt', 
    `--header "Content-Type: application/json" ` +
    `--header "Accept: application/json" ` +
    `--header "token: ${token}" ` +
    `--header "appid: JV_APP" ` +
    `--header "msgid: ${Date.now()}" ` +
    `--header "imei: dev_device_uuid_12345" ` +
    `--header "deviceUuid: dev_device_uuid_12345" ` +
    `--header "hardwareSerialNo: dev_serial" ` +
    `--header "manufacture: Apple" ` +
    `--header "model: Macbook" ` +
    `--header "os: macOS" ` +
    `--header "osVersion: 14.0" ` +
    `--header "appVersion: 2.2.4" ` +
    `--header "mv: 1.1" ` +
    `--header "source: MAA" ` +
    `--header "agent_staff_id: ${agentStaffId}" `
  );
  console.log("AWB:", awb);
}
run().catch(console.error);
