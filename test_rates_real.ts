import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          let value = parts.slice(1).join('=').trim();
          // Strip quotes if present
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
          }
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {
  // Ignore
}

// Fallback production URLs if env variables not set
process.env.ANTERAJA_API_BASE_URL = process.env.ANTERAJA_API_BASE_URL || 'https://api.anteraja.id/maa-task';
process.env.ANTERAJA_AUTH_URL = process.env.ANTERAJA_AUTH_URL || 'https://cas.anteraja.id';

async function main() {
  console.log('====================================================');
  console.log('   TESTING REAL TARIFF / SERVICE RATES (NON-MOCK)   ');
  console.log('====================================================');
  
  const nia = '50004786';
  const password = 'aa12345';
  
  try {
    const { anterajaClient } = await import('./src/lib/anteraja-client');
    console.log(`Step 1: Logging in using Agent NIA ${nia}...`);
    const loginResult = await anterajaClient.login(nia, password);
    const token = loginResult.token;
    console.log(`Login Successful!`);
    console.log(`Agent Name: ${loginResult.user.name}`);
    console.log(`Store Name: ${loginResult.user.storeName}`);
    console.log(`Token     : ${token}`);
    
    // Testing parameters
    const origin = '36.74.03';      // Pamulang, Tangerang Selatan
    const destination = '31.73.06'; // Palmerah, Jakarta Barat
    const weight = 1;               // 1 kg
    
    console.log(`\nStep 2: Querying rates...`);
    console.log(`Origin      : Pamulang (${origin})`);
    console.log(`Destination : Palmerah (${destination})`);
    console.log(`Weight      : ${weight} kg`);
    
    const rates = await anterajaClient.getRates(origin, destination, weight, token);
    
    console.log(`\nStep 3: Rates results received successfully:`);
    rates.forEach((rate, i) => {
      console.log(`\n[Service ${i + 1}]`);
      console.log(`  Product Code : ${rate.product_code}`);
      console.log(`  Product Name : ${rate.product_name}`);
      console.log(`  Duration     : ${rate.duration}`);
      console.log(`  Price        : Rp ${rate.delivery_price.toLocaleString('id-ID')}`);
      console.log(`  Status       : ${rate.status}`);
      if (rate.pickup_start || rate.pickup_end) {
        console.log(`  Pickup Window: ${rate.pickup_start || '-'} s/d ${rate.pickup_end || '-'}`);
      }
    });
    
  } catch (err: any) {
    console.error(`\nTest failed:`, err.message || err);
  }
  
  console.log('\n====================================================');
}

main();
