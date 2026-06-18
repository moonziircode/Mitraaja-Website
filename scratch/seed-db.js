const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local to read the database URL
function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      });
    }
  } catch (e) {
    console.error('Failed to parse .env.local:', e.message);
  }
}

async function main() {
  loadEnv();
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString || connectionString.includes('localhost')) {
    console.error('❌ ERROR: POSTGRES_URL is not set or is still pointing to localhost in .env.local.');
    console.error('Please configure a valid remote PostgreSQL database connection string (e.g., from Supabase or Neon) before running this script.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL database...');
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=') || connectionString.includes('supabase') || connectionString.includes('neon') || connectionString.includes('vercel-storage')
      ? { rejectUnauthorized: false }
      : false
  });

  const client = await pool.connect();

  try {
    console.log('✓ Connected. Creating tables if they do not exist...');

    // DDL Setup
    await client.query(`
      CREATE TABLE IF NOT EXISTS provinces (
        code VARCHAR(2) PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS regencies (
        code VARCHAR(5) PRIMARY KEY,
        province_code VARCHAR(2) REFERENCES provinces(code),
        name VARCHAR(255) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS districts (
        code VARCHAR(8) PRIMARY KEY,
        regency_code VARCHAR(5) REFERENCES regencies(code),
        name VARCHAR(255) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS villages (
        code VARCHAR(13) PRIMARY KEY,
        district_code VARCHAR(8) REFERENCES districts(code),
        name VARCHAR(255) NOT NULL
      );
    `);
    console.log('✓ Tables checked/created successfully.');

    // 1. Fetch Provinces
    console.log('Downloading provinces...');
    const provRes = await fetch('https://raw.githubusercontent.com/yusufsyaifudin/wilayah-indonesia/master/data/list_of_area/provinces.json');
    const provinces = await provRes.json();
    console.log(`✓ Downloaded ${provinces.length} provinces. Seeding...`);
    
    await client.query('BEGIN');
    for (const p of provinces) {
      await client.query(
        'INSERT INTO provinces (code, name) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name',
        [p.id, p.name]
      );
    }
    await client.query('COMMIT');
    console.log('✓ Provinces seeded successfully.');

    // 2. Fetch Regencies
    console.log('Downloading regencies...');
    const regRes = await fetch('https://raw.githubusercontent.com/yusufsyaifudin/wilayah-indonesia/master/data/list_of_area/regencies.json');
    const regencies = await regRes.json();
    console.log(`✓ Downloaded ${regencies.length} regencies. Seeding...`);

    await client.query('BEGIN');
    for (const r of regencies) {
      const regCode = `${r.id.substring(0, 2)}.${r.id.substring(2, 4)}`;
      await client.query(
        'INSERT INTO regencies (code, province_code, name) VALUES ($1, $2, $3) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name',
        [regCode, r.province_id, r.name]
      );
    }
    await client.query('COMMIT');
    console.log('✓ Regencies seeded successfully.');

    // 3. Fetch Districts
    console.log('Downloading districts...');
    const distRes = await fetch('https://raw.githubusercontent.com/yusufsyaifudin/wilayah-indonesia/master/data/list_of_area/districts.json');
    const districts = await distRes.json();
    console.log(`✓ Downloaded ${districts.length} districts. Seeding...`);

    await client.query('BEGIN');
    for (const d of districts) {
      const distCode = `${d.id.substring(0, 2)}.${d.id.substring(2, 4)}.${d.id.substring(4, 6)}`;
      const regCode = `${d.regency_id.substring(0, 2)}.${d.regency_id.substring(2, 4)}`;
      await client.query(
        'INSERT INTO districts (code, regency_code, name) VALUES ($1, $2, $3) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name',
        [distCode, regCode, d.name]
      );
    }
    await client.query('COMMIT');
    console.log('✓ Districts seeded successfully.');

    // 4. Fetch Villages (Batch inserts for performance since there are 81k villages)
    console.log('Downloading villages (this may take a few seconds)...');
    const vilRes = await fetch('https://raw.githubusercontent.com/yusufsyaifudin/wilayah-indonesia/master/data/list_of_area/villages.json');
    const villages = await vilRes.json();
    console.log(`✓ Downloaded ${villages.length} villages. Seeding in batches...`);

    const batchSize = 1000;
    await client.query('BEGIN');
    for (let i = 0; i < villages.length; i += batchSize) {
      const batch = villages.slice(i, i + batchSize);
      
      // Build a multi-value insert query
      const valueStrings = [];
      const values = [];
      let valIdx = 1;

      for (const v of batch) {
        const vilCode = `${v.id.substring(0, 2)}.${v.id.substring(2, 4)}.${v.id.substring(4, 6)}.${v.id.substring(6, 10)}`;
        const distCode = `${v.district_id.substring(0, 2)}.${v.district_id.substring(2, 4)}.${v.district_id.substring(4, 6)}`;
        
        valueStrings.push(`($${valIdx}, $${valIdx + 1}, $${valIdx + 2})`);
        values.push(vilCode, distCode, v.name);
        valIdx += 3;
      }

      const query = `
        INSERT INTO villages (code, district_code, name) 
        VALUES ${valueStrings.join(', ')} 
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      `;
      await client.query(query, values);
      
      if ((i + batchSize) % 10000 === 0 || i + batchSize >= villages.length) {
        console.log(`  .. processed ${Math.min(i + batchSize, villages.length)} / ${villages.length} villages`);
      }
    }
    await client.query('COMMIT');
    console.log('✓ Villages seeded successfully.');
    console.log('\n🎉 SUCCESS! All Indonesian regional data has been successfully seeded in the database!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ SEEDING FAILED:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
