import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
let cookie = '';
let taskCode = '';
let awb = '11003838770507'; // AWB to test tracking and claim
let score = 100;
const results = {
  login: 'FAIL',
  searchDistrict: 'FAIL',
  checkRate: 'FAIL',
  tracking: 'FAIL',
  claim: 'FAIL',
  createOrder: 'FAIL',
  paymentUrl: 'FAIL',
  paymentStatus: 'FAIL',
  orderResultValidation: 'FAIL'
};

const logs = [];
function log(msg) {
  console.log(msg);
  logs.push(msg);
}

function decreaseScore(amount, reason) {
  score -= amount;
  log(`[-${amount} SCORE] ${reason}`);
}

async function runTest() {
  log("========================================");
  log("      MITRAAJA GATEWAY E2E TEST         ");
  log("========================================");

  // 1. AUTHENTICATION
  try {
    log("\n--- TEST SUITE 1: AUTHENTICATION ---");
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nia: '50004786', password: 'aa12345' })
    });
    
    if (loginRes.ok) {
      const loginData = await loginRes.json();
      if (loginData.message === 'Login berhasil' && loginData.token) {
        results.login = 'PASS';
        const rawCookies = loginRes.headers.raw()['set-cookie'];
        if (rawCookies && rawCookies.length > 0) {
          cookie = rawCookies[0].split(';')[0];
        }
        log("✅ Login Success");
      } else {
        decreaseScore(10, "Login failed payload");
        log("❌ Login Failed: " + loginData.message);
      }
    } else {
      decreaseScore(10, "Login failed status");
      log("❌ Login Failed with status " + loginRes.status);
    }
  } catch(e) {
    decreaseScore(10, "Login crashed");
    log("❌ Login Error: " + e.message);
  }

  // 2. SEARCH KECAMATAN
  try {
    log("\n--- TEST SUITE 2: SEARCH KECAMATAN ---");
    const searchRes = await fetch(`${BASE_URL}/api/districts/search?q=kebayoran`);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (Array.isArray(searchData) && searchData.length > 0) {
        results.searchDistrict = 'PASS';
        log("✅ Search District Success. Found: " + searchData[0].district);
      } else {
        decreaseScore(10, "Search district returned empty");
        log("❌ Search District Failed or empty data");
      }
    } else {
      decreaseScore(10, "Search district API failed");
      log("❌ Search District failed status " + searchRes.status);
    }
  } catch(e) {
    decreaseScore(10, "Search district crashed");
    log("❌ Search District Error: " + e.message);
  }

  // 3. CEK ONGKIR
  try {
    log("\n--- TEST SUITE 3: CEK ONGKIR ---");
    // Use valid district codes from search usually, but here we hardcode valid ones
    // We can use 317406 (Kebayoran Lama) to 327301 (Bandung)
    const rateBody = {
      origin: 'pamulang',
      destination: 'palmerah',
      weight: 1,
      originCode: '36.74.03',
      destinationCode: '31.73.06'
    };
    const rateRes = await fetch(`${BASE_URL}/api/rates/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify(rateBody)
    });
    
    if (rateRes.ok) {
      const rateData = await rateRes.json();
      if (rateData.success && rateData.content && rateData.content.length > 0) {
        results.checkRate = 'PASS';
        log(`✅ Check Rate Success. Found ${rateData.content.length} services.`);
        log(`   Example Service: ${rateData.content[0].product_code} - Rp${rateData.content[0].delivery_price}`);
      } else {
        decreaseScore(10, "Check Rate returned empty");
        log("❌ Check Rate Failed or empty data: " + JSON.stringify(rateData));
      }
    } else {
      decreaseScore(10, "Check Rate API failed");
      log("❌ Check Rate failed status " + rateRes.status);
    }
  } catch(e) {
    decreaseScore(10, "Check Rate crashed");
    log("❌ Check Rate Error: " + e.message);
  }

  // 4. TRACKING AWB
  try {
    log("\n--- TEST SUITE 4: TRACKING AWB ---");
    const trackRes = await fetch(`${BASE_URL}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({ awb })
    });
    
    if (trackRes.ok) {
      const trackData = await trackRes.json();
      if (trackData.history && trackData.history.length > 0) {
        results.tracking = 'PASS';
        log(`✅ Tracking Success. Last status: ${trackData.history[0].status}`);
      } else {
        decreaseScore(15, "Tracking returned empty or failed");
        log("❌ Tracking Failed or empty data: " + JSON.stringify(trackData));
      }
    } else {
      decreaseScore(15, "Tracking API failed");
      log("❌ Tracking failed status " + trackRes.status);
    }
  } catch(e) {
    decreaseScore(15, "Tracking crashed");
    log("❌ Tracking Error: " + e.message);
  }

  // 5. CLAIM AWB
  try {
    log("\n--- TEST SUITE 5: CLAIM AWB ---");
    const claimRes = await fetch(`${BASE_URL}/api/parcels/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({ awb })
    });
    
    if (claimRes.ok) {
      const claimData = await claimRes.json();
      // Valid API response means PASS, even if claim rejected (e.g. already claimed)
      if (claimData.success || (claimData.message && claimData.message.includes('terklaim'))) {
        results.claim = 'PASS';
        log(`✅ Claim AWB Success/Valid. Result: ${claimData.message || JSON.stringify(claimData.results)}`);
      } else {
        decreaseScore(10, "Claim API returned false without valid message");
        log("❌ Claim Failed: " + JSON.stringify(claimData));
      }
    } else {
      const errBody = await claimRes.text();
      decreaseScore(10, "Claim API failed");
      log("❌ Claim failed status " + claimRes.status + " Body: " + errBody);
    }
  } catch(e) {
    decreaseScore(10, "Claim crashed");
    log("❌ Claim Error: " + e.message);
  }

  // 6. CREATE ORDER & 7. GENERATE PAYMENT
  try {
    log("\n--- TEST SUITE 6 & 7: CREATE ORDER ---");
    const orderBody = {
      sender: { name: 'Testing E2E', phone: '08123456789', address: 'Jl Test', districtCode: '31.74.07', postalCode: '12240' },
      recipient: { name: 'Penerima E2E', phone: '08987654321', address: 'Jl Penerima', districtCode: '31.74.07', postalCode: '12240' },
      package: { itemName: 'Baju', category: '1', weight: 1, dimensions: { length: 30, width: 20, height: 5 }, value: 100000 },
      selectedService: { product_code: 'REG', delivery_price: 15000, estimated_delivery_time: '1 Hari' }
    };
    
    const orderRes = await fetch(`${BASE_URL}/api/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify(orderBody)
    });
    
    if (orderRes.ok) {
      const orderData = await orderRes.json();
      if (orderData.success && orderData.taskCode) {
        results.createOrder = 'PASS';
        taskCode = orderData.taskCode;
        log(`✅ Create Order Success. Task Code: ${taskCode}`);
        
        // Initiate Payment
        const paymentRes = await fetch(`${BASE_URL}/api/payment/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
          body: JSON.stringify({ taskCode: taskCode, deliveryPrice: 15000, shipperPhone: '08123456789' })
        });
        
        if (paymentRes.ok) {
          const paymentData = await paymentRes.json();
          if (paymentData.success && paymentData.paymentUrl) {
            results.paymentUrl = 'PASS';
            log(`✅ Generate Payment URL Success. Payment URL generated: ${paymentData.paymentUrl.substring(0, 30)}...`);
            
            // Polling Status (Just once for validation)
            const statusRes = await fetch(`${BASE_URL}/api/payment/status/${taskCode}`, {
              headers: { 'Cookie': cookie }
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              results.paymentStatus = 'PASS';
              log(`✅ Payment Status Polling Check Success. Status: ${statusData.status}`);
              
              if (statusData.status === 'SUCCESS' && statusData.awb) {
                results.orderResultValidation = 'PASS';
                log(`✅ Order Validated. AWB generated: ${statusData.awb}`);
              } else {
                // If it's pending, it's normal because we haven't paid
                if (statusData.status === 'PENDING') {
                   results.orderResultValidation = 'PASS';
                   log(`✅ Order Validated. Still Pending payment (Expected behavior in E2E)`);
                } else {
                   decreaseScore(5, "Payment status not pending or success");
                }
              }
            } else {
              decreaseScore(10, "Payment polling API failed");
              log("❌ Payment Status failed");
            }
            
          } else {
            decreaseScore(15, "Payment initiation returned empty URL");
            log("❌ Payment Initiate Failed: " + JSON.stringify(paymentData));
          }
        } else {
          decreaseScore(15, "Payment initiation API failed");
          log("❌ Payment Initiate failed status " + paymentRes.status);
        }
      } else {
        decreaseScore(15, "Create order returned false");
        log("❌ Create Order Failed: " + JSON.stringify(orderData));
      }
    } else {
      const errBody = await orderRes.text();
      decreaseScore(15, "Create order API failed");
      log("❌ Create Order failed status " + orderRes.status + " Body: " + errBody);
    }
  } catch(e) {
    decreaseScore(15, "Create order sequence crashed");
    log("❌ Create Order Error: " + e.message);
  }

  log("\n========================================");
  log("              TEST RESULTS              ");
  log("========================================");
  log(`Login:                ${results.login}`);
  log(`Search Kecamatan:     ${results.searchDistrict}`);
  log(`Check Rate:           ${results.checkRate}`);
  log(`Tracking:             ${results.tracking}`);
  log(`Claim:                ${results.claim}`);
  log(`Create Order:         ${results.createOrder}`);
  log(`Payment Initiation:   ${results.paymentUrl}`);
  log(`Payment Polling:      ${results.paymentStatus}`);
  log(`Order Validation:     ${results.orderResultValidation}`);
  
  if (score < 0) score = 0;
  log(`\nPRODUCTION READINESS SCORE: ${score} / 100`);
}

runTest();
