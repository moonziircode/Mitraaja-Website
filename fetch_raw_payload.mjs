import { exec } from 'child_process';
import fs from 'fs';

const PORT = 3005;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function runFetch() {
  console.log('Logging in...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nia: '50004786', password: 'aa12345' }),
  });
  
  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) {
    console.error('Login failed, no cookie');
    process.exit(1);
  }
  const cookie = setCookie.split(';')[0];
  console.log('Login successful');

  console.log('Fetching /api/tasklist?state=TERTUNDA...');
  const taskRes1 = await fetch(`${BASE_URL}/api/tasklist?state=TERTUNDA`, {
    headers: { 'Cookie': cookie }
  });
  const data1 = await taskRes1.json();
  fs.writeFileSync('raw_tertunda.json', JSON.stringify(data1, null, 2));

  console.log('Fetching /api/tasklist?state=RIWAYAT_ORDER...');
  const taskRes2 = await fetch(`${BASE_URL}/api/tasklist?state=RIWAYAT_ORDER`, {
    headers: { 'Cookie': cookie }
  });
  const data2 = await taskRes2.json();
  fs.writeFileSync('raw_riwayat.json', JSON.stringify(data2, null, 2));

  console.log('Done! Check raw_tertunda.json and raw_riwayat.json');
}

console.log(`Starting test server on port ${PORT}...`);
const serverProcess = exec(`npx next dev -p ${PORT}`);

serverProcess.stdout.on('data', (data) => {
  if (data.includes('Ready') || data.includes('Local:')) {
    setTimeout(async () => {
      try {
        await runFetch();
      } catch (err) {
        console.error('Fetch failed:', err);
      } finally {
        serverProcess.kill();
        process.exit(0);
      }
    }, 10000);
  }
});
