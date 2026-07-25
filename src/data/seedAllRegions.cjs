const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const envPath = path.join(__dirname, '../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    else if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1].trim()] = val;
  }
});

initializeApp({
  credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)),
  databaseURL: env.FIREBASE_FIRESTORE_URL
});

const db = getFirestore();

async function seed() {
  console.log('Starting seed without batches...');
  const filePath = path.join(__dirname, 'all_regions.csv');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  return new Promise((resolve, reject) => {
    parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ','
    }, async (err, records) => {
      if (err) return reject(err);
      
      console.log(`Found ${records.length} records. Uploading...`);
      
      const CONCURRENCY = 200;
      let active = 0;
      let currentIndex = 13000;
      let completed = 13000;
      let hasError = false;

      const processNext = async () => {
        if (hasError) return;
        if (currentIndex >= records.length) return;
        
        const i = currentIndex++;
        active++;
        
        const record = records[i];
        try {
          await db.collection('all_regions').doc(record.dist_code).set({
            id: record.id,
            dist_code: record.dist_code,
            parent_dist_code: record.parent_dist_code || null,
            dist_name: record.dist_name,
            dist_type: parseInt(record.dist_type, 10),
            province_code: record.province_code || null,
            city_code: record.city_code || null
          });
          completed++;
          
          if (completed % 1000 === 0) {
            console.log(`Seeded ${completed} of ${records.length} records...`);
          }
        } catch (e) {
          hasError = true;
          console.error('Error writing document', e);
          reject(e);
          return;
        }
        
        active--;
        if (currentIndex < records.length) {
          processNext();
        } else if (active === 0) {
          resolve();
        }
      };

      for (let i = 0; i < CONCURRENCY; i++) {
        processNext();
      }
    });
  });
}

seed().then(() => {
  console.log('Seeding finished!');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
