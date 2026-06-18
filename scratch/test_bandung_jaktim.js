// Test end-to-end dropoff creation and payment initiation from Bandung to Jakarta Timur
const AUTH_URL = 'https://cas.anteraja.id';
const GATEWAY_URL = 'https://api.anteraja.id';
const API_BASE = 'https://api.anteraja.id/maa-task';

async function casLogin(username, password) {
  const step1 = await fetch(`${AUTH_URL}/cas/login?isapp=true&acctype=emp`, { method: 'GET', redirect: 'manual' });
  const setCookie1 = step1.headers.getSetCookie ? step1.headers.getSetCookie() : [];
  const jsessionid = (setCookie1.find(c => c.startsWith('JSESSIONID=')) || '').split(';')[0];
  const lt = step1.headers.get('lt');
  const execution = step1.headers.get('execution');
  const step2 = await fetch(`${AUTH_URL}/cas/login?isapp=true&acctype=emp`, {
    method: 'POST',
    headers: { 'Cookie': jsessionid, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password, _eventId: 'submit', submit: 'login', lt, execution }).toString(),
    redirect: 'manual'
  });
  const setCookie2 = step2.headers.getSetCookie ? step2.headers.getSetCookie() : [];
  const tgc = (setCookie2.find(c => c.startsWith('TGC=')) || '').split(';')[0];
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
  console.log('Agent Staff ID:', agent.agent_staff_id);

  // 1. Get Rates: Bandung (32.73.01) to Ciracas, Jakarta Timur (31.72.02)
  console.log('\n=== 1. Checking Rates from Bandung (32.73.01) to Jakarta Timur (31.72.02) ===');
  const ratesUrl = `${API_BASE}/rates?origin=32.73.01&destination=31.72.02&weight=1.0`;
  const ratesRes = await fetch(ratesUrl, { method: 'GET', headers: makeHeaders(token) });
  const ratesData = await ratesRes.json();
  console.log('Rates Response:', JSON.stringify(ratesData, null, 2));

  if (ratesData.status !== 0 || !ratesData.content || ratesData.content.length === 0) {
    throw new Error('Failed to get rates from Anteraja API: ' + ratesData.info);
  }

  const selectedService = ratesData.content[0];
  console.log(`✓ Selected Service: ${selectedService.product_name} (${selectedService.product_code}) - Price: Rp${selectedService.delivery_price}`);

  // 2. Create Drop-off Task
  console.log('\n=== 2. Creating Dropoff Order on Anteraja API ===');
  const orderPayload = {
    agent_staff_id: agent.agent_staff_id,
    agentStaffId: agent.agent_staff_id,
    serviceType: selectedService.product_code,
    service_type: selectedService.product_code,
    product_code: selectedService.product_code,
    productCode: selectedService.product_code,
    type: selectedService.product_code,
    servicetype: selectedService.product_code,
    itemName: 'Buku Kiriman Bandung-Jaktim',
    item_name: 'Buku Kiriman Bandung-Jaktim',
    weight: 1.0,
    parcel_total_weight: 1.0,
    deliveryPrice: Number(selectedService.delivery_price),
    delivery_price: Number(selectedService.delivery_price),
    itemValue: 100000.0,
    item_value: 100000.0,
    shipperInfo: {
      name: 'Ahmad Bandung', phone: '081234567890',
      address: 'Jl. Bojongloa No. 45', districtCode: '32.73.01', district_code: '32.73.01', postcode: '40233'
    },
    shipper_info: {
      name: 'Ahmad Bandung', phone: '081234567890',
      address: 'Jl. Bojongloa No. 45', districtCode: '32.73.01', district_code: '32.73.01', postcode: '40233'
    },
    receiverInfo: {
      name: 'Siti Ciracas', phone: '085712345678',
      address: 'Jl. Ciracas Raya No. 10', districtCode: '31.72.02', district_code: '31.72.02', postcode: '13740'
    },
    receiver_info: {
      name: 'Siti Ciracas', phone: '085712345678',
      address: 'Jl. Ciracas Raya No. 10', districtCode: '31.72.02', district_code: '31.72.02', postcode: '13740'
    },
    useInsurance: false,
    use_insurance: false,
    items: [
      {
        itemName: 'Buku Kiriman Bandung-Jaktim',
        item_name: 'Buku Kiriman Bandung-Jaktim',
        itemDesc: 'Buku Kiriman Bandung-Jaktim',
        item_desc: 'Buku Kiriman Bandung-Jaktim',
        itemCategory: 'Dokumen',
        item_category: 'Dokumen',
        declaredValue: 100000.0,
        declared_value: 100000.0,
        weight: 1.0,
        width: 10,
        length: 10,
        height: 10,
        fragile: false
      }
    ]
  };

  const dropoffRes = await fetch(`${API_BASE}/task/dropoff`, {
    method: 'POST',
    headers: makeHeaders(token),
    body: JSON.stringify([orderPayload])
  });
  const dropoffData = await dropoffRes.json();
  console.log('Dropoff Response:', JSON.stringify(dropoffData, null, 2));

  if (dropoffData.status !== 0 || !dropoffData.content || dropoffData.content.length === 0) {
    throw new Error('Failed to create dropoff order: ' + dropoffData.info);
  }

  const createdTask = dropoffData.content[0];
  const taskCode = createdTask.task_code;
  console.log(`✓ Order successfully created! taskCode: ${taskCode}`);

  // 3. Initiate Payment (GoPay QR - '006')
  console.log('\n=== 3. Initiating GoPay QR Payment ===');
  const paymentPayload = {
    promo_code: null,
    promoCode: null,
    task: [
      {
        task_code: taskCode,
        taskCode: taskCode,
        base_price: Number(selectedService.delivery_price),
        basePrice: Number(selectedService.delivery_price),
        total_price: Number(selectedService.delivery_price),
        totalPrice: Number(selectedService.delivery_price),
        promo_amount: 0.0,
        promoAmount: 0.0
      }
    ],
    cash_received: null,
    cashReceived: null,
    cash_received_by: null,
    cashReceivedBy: null,
    payment_code: '006',
    paymentCode: '006',
    payment_phone: '081234567890',
    paymentPhone: '081234567890',
    shipperPhoneNumber: '081234567890'
  };

  const payUrl = `${API_BASE}/task/dropoff/payment/initiateInApps?agent_staff_id=${agent.agent_staff_id}`;
  const payRes = await fetch(payUrl, {
    method: 'POST',
    headers: makeHeaders(token),
    body: JSON.stringify(paymentPayload)
  });
  const payData = await payRes.json();
  console.log('Payment Initiate Response:', JSON.stringify(payData, null, 2));

  if (payData.status !== 0 || !payData.content) {
    throw new Error('Payment initiation failed: ' + payData.info);
  }

  console.log('\n🎉 SUCCESS! PAYMENT INITIATED SUCCESSFULLY!');
  console.log('----------------------------------------------------');
  console.log(`Transaction Number: ${payData.content.transaction_number}`);
  console.log(`Total Price: Rp${payData.content.total_payment}`);
  console.log(`GoPay QR URL: ${payData.content.payment_url}`);
  console.log('----------------------------------------------------');
}

main().catch(e => {
  console.error('\n❌ TEST FAILED:', e.message || e);
});
