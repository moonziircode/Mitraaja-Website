import { anterajaClient } from './src/lib/anteraja-client';

async function main() {
  try {
    const res = await anterajaClient.login('50009587', 'be12345');
    console.log('Login success:', res);
    
    // Now try to fetch notifications
    const token = res.token;
    const gatewayUrl = 'https://api.anteraja.id'; // or what is the base url?
    
    // let's try calling masterNotification/getDataByDaysBefore
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'token': token,
      'appid': 'JV_APP',
      'msgid': Date.now().toString(),
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

    const urlsToTry = [
      `${gatewayUrl}/user/masterNotification/getDataByDaysBefore?day=30`,
      `${gatewayUrl}/masterNotification/getDataByDaysBefore?day=30`,
      `${gatewayUrl}/maa-task/masterNotification/getDataByDaysBefore?day=30`,
      `${gatewayUrl}/maa-agent/masterNotification/getDataByDaysBefore?day=30`
    ];

    for (const url of urlsToTry) {
      console.log('Trying URL:', url);
      const notifRes = await fetch(url, { headers });
      console.log('Status:', notifRes.status);
      if (notifRes.ok) {
        const data = await notifRes.json();
        console.log('Data:', JSON.stringify(data, null, 2));
      } else {
        const text = await notifRes.text();
        console.log('Error Text:', text);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
