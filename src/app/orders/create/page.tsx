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
          session.cityCode = agentCity.dist_code;
          session.cityName = agentCity.dist_name;
          
          const agentProv = records.find((r: any) => r.dist_code === agentCity.parent_dist_code);
          if (agentProv) {
            session.provinceCode = agentProv.dist_code;
            session.provinceName = agentProv.dist_name;
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
    cityCode: (session as any).cityCode,
    cityName: (session as any).cityName,
    provinceCode: (session as any).provinceCode,
    provinceName: (session as any).provinceName,
  };

  return <CreateOrderClient user={user} />;
}
