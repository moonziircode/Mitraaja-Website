import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import CreateOrderClient from './CreateOrderClient';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export default async function CreateOrderPage() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  let agentDistrictName = '';
  let agentPostalCode = session.postalCode || '';
  let agentCityCode = '';
  let agentCityName = '';
  let agentProvinceCode = '';
  let agentProvinceName = '';

  try {
    if (session.districtCode) {
      const filePath = path.join(process.cwd(), 'src/data/all_regions.csv');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      });
      const record: any = records.find((r: any) => r.dist_code === session.districtCode);
      if (record) {
        agentDistrictName = record.dist_all || record.dist_name;
        if (!agentPostalCode) agentPostalCode = record.postal_code?.split(',')[0] || '';
        
        // Find City (dist_type=3) and Province (dist_type=2)
        const agentCity = records.find((r: any) => r.dist_code === record.parent_dist_code);
        if (agentCity) {
          agentCityCode = agentCity.dist_code;
          agentCityName = agentCity.dist_name;
          
          const agentProv = records.find((r: any) => r.dist_code === agentCity.parent_dist_code);
          if (agentProv) {
            agentProvinceCode = agentProv.dist_code;
            agentProvinceName = agentProv.dist_name;
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to load agent district name:', error);
  }

  const user = {
    name: session.name,
    nia: session.nia,
    districtCode: session.districtCode,
    postalCode: agentPostalCode,
    districtName: agentDistrictName,
    cityCode: agentCityCode,
    cityName: agentCityName,
    provinceCode: agentProvinceCode,
    provinceName: agentProvinceName,
  };

  return <CreateOrderClient user={user} />;
}
