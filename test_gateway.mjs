import { exec } from 'child_process';

// Port for test server
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('=== STARTING MITRAAJA GATEWAY API TESTING ===\n');

  // 1. Test Login with CORRECT Credentials
  console.log('Test 1: POST /api/auth/login (Correct credentials)');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nia: '50004786', password: 'aa12345' }),
  });
  console.log(`Status: ${loginRes.status}`);
  const loginData = await loginRes.json();
  console.log('Response:', JSON.stringify(loginData));

  // Extract session cookie
  const setCookie = loginRes.headers.get('set-cookie');
  console.log('Set-Cookie Header:', setCookie ? 'Found' : 'NOT FOUND');
  if (!setCookie) {
    console.error('FAIL: Set-Cookie header missing');
    process.exit(1);
  }
  const cookie = setCookie.split(';')[0];

  // 2. Test Login with INCORRECT Credentials
  console.log('\nTest 2: POST /api/auth/login (Incorrect credentials)');
  const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nia: '50004786', password: 'wrongpassword' }),
  });
  console.log(`Status: ${badLoginRes.status} (Expected: 401)`);
  const badLoginData = await badLoginRes.json();
  console.log('Response:', JSON.stringify(badLoginData));

  // 3. Test Tracking with CORRECT AWB
  console.log('\nTest 3: POST /api/track (Correct AWB: 11003838770507)');
  const trackRes = await fetch(`${BASE_URL}/api/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ awb: '11003838770507' }),
  });
  console.log(`Status: ${trackRes.status} (Expected: 200)`);
  const trackData = await trackRes.json();
  console.log('Response snippet:', JSON.stringify({
    awb: trackData.awb,
    status: trackData.status,
    sender: trackData.sender,
    receiver: trackData.receiver,
    historyLength: trackData.history ? trackData.history.length : 0
  }));

  // 4. Test Tracking with INCORRECT AWB
  console.log('\nTest 4: POST /api/track (Incorrect AWB)');
  const badTrackRes = await fetch(`${BASE_URL}/api/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ awb: '9999999999' }),
  });
  console.log(`Status: ${badTrackRes.status} (Expected: 404)`);
  const badTrackData = await badTrackRes.json();
  console.log('Response:', JSON.stringify(badTrackData));

  // 5. Test Scan AWB with Valid Session Cookie
  console.log('\nTest 5: POST /api/scan (With session cookie)');
  const scanRes = await fetch(`${BASE_URL}/api/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify({ awb: '11003838770507' }),
  });
  console.log(`Status: ${scanRes.status} (Expected: 200)`);
  const scanData = await scanRes.json();
  console.log('Response:', JSON.stringify(scanData));

  // 6. Test Scan AWB WITHOUT Session Cookie
  console.log('\nTest 6: POST /api/scan (Without session cookie)');
  const badScanRes = await fetch(`${BASE_URL}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ awb: '11003838770507' }),
  });
  console.log(`Status: ${badScanRes.status} (Expected: 401)`);
  const badScanData = await badScanRes.json();
  console.log('Response:', JSON.stringify(badScanData));

  console.log('\n=== TESTING COMPLETED SUCCESSFULLY ===');
}

// Start Next.js in dev mode on PORT 3001
console.log(`Starting test server on port ${PORT}...`);
const serverProcess = exec(`npx next dev -p ${PORT}`, {
  cwd: '/Users/aqsamuflihan/Downloads/Mitraaja Website'
});

serverProcess.stdout.on('data', (data) => {
  if (data.includes('Ready') || data.includes('Local:') || data.includes('compiled')) {
    // Wait a brief moment to ensure port is listening
    setTimeout(async () => {
      try {
        await runTests();
      } catch (err) {
        console.error('Test execution failed:', err);
      } finally {
        console.log('\nShutting down test server...');
        serverProcess.kill();
        process.exit(0);
      }
    }, 1500);
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});
