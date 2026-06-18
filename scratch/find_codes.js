async function main() {
  try {
    console.log('Searching for Bandung and Jakarta Timur administrative codes...');
    
    // 1. Fetch provinces
    const provsRes = await fetch('https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json');
    const provinces = await provsRes.json();
    
    const jabar = provinces.find(p => p.name.includes('JAWA BARAT'));
    const dki = provinces.find(p => p.name.includes('JAKARTA') || p.name.includes('DKI'));
    
    console.log(`Jawa Barat Province ID: ${jabar.id}`);
    console.log(`DKI Jakarta Province ID: ${dki.id}`);

    // 2. Fetch regencies in Jabar and DKI
    const jabarRegsRes = await fetch(`https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${jabar.id}.json`);
    const jabarRegs = await jabarRegsRes.json();
    const bandungKota = jabarRegs.find(r => r.name.includes('BANDUNG') && !r.name.includes('KABUPATEN'));
    console.log(`Kota Bandung Regency ID: ${bandungKota.id}`);

    const dkiRegsRes = await fetch(`https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${dki.id}.json`);
    const dkiRegs = await dkiRegsRes.json();
    const jaktim = dkiRegs.find(r => r.name.includes('JAKARTA TIMUR'));
    console.log(`Jakarta Timur Regency ID: ${jaktim.id}`);

    // 3. Fetch districts in Kota Bandung and Jakarta Timur
    const bandungDistRes = await fetch(`https://emsifa.github.io/api-wilayah-indonesia/api/districts/${bandungKota.id}.json`);
    const bandungDists = await bandungDistRes.json();
    console.log('\n--- Kota Bandung Districts Sample (first 5) ---');
    bandungDists.slice(0, 5).forEach(d => {
      // Format code as XX.XX.XX
      const formatted = `${d.id.substring(0, 2)}.${d.id.substring(2, 4)}.${d.id.substring(4, 6)}`;
      console.log(`- ${d.name} (${formatted})`);
    });

    const jaktimDistRes = await fetch(`https://emsifa.github.io/api-wilayah-indonesia/api/districts/${jaktim.id}.json`);
    const jaktimDists = await jaktimDistRes.json();
    console.log('\n--- Jakarta Timur Districts Sample (first 5) ---');
    jaktimDists.slice(0, 5).forEach(d => {
      const formatted = `${d.id.substring(0, 2)}.${d.id.substring(2, 4)}.${d.id.substring(4, 6)}`;
      console.log(`- ${d.name} (${formatted})`);
    });

  } catch (e) {
    console.error('Error finding codes:', e);
  }
}

main();
