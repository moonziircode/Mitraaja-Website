const fs = require('fs');
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
    body: JSON.stringify({
      ticket: ticket,
      deviceId: 'dev_device_uuid_12345',
      appKey: 'MAA',
      appSecret: 'santuy',
      service: gatewayUrl + '/',
    }),
  });

  const resBody = await step4Response.json();
  const token = resBody.content.token;
  
  // FETCH TERTUNDA
  const taskHeaders = {
    ...step4Headers,
    'token': token,
    'msgid': Date.now().toString(),
    'agent_staff_id': '50004786'
  };

  const tasksRes = await fetch(`${gatewayUrl}/maa-task/order/v2/task/dropoff?state=TERTUNDA&page=0&size=2`, {
    headers: taskHeaders
  });
  const tasksData = await tasksRes.json();
  fs.writeFileSync('tertunda_sample.json', JSON.stringify(tasksData, null, 2));
  console.log("Done. Saved to tertunda_sample.json");
}
run().catch(console.error);
