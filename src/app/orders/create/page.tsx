import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import CreateOrderClient from './CreateOrderClient';
import { getDistrictByCode } from '@/lib/districts-db';

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
      const record = await getDistrictByCode(session.districtCode);
      if (record) {
        agentDistrictName = record.dist_all || record.dist_name;
        if (!agentPostalCode) {
          agentPostalCode = record.postal_code?.split(',')[0] || '';
        }
        agentCityCode = record.city_code || '';
        agentCityName = record.city_name || '';
        agentProvinceCode = record.province_code || '';
        agentProvinceName = record.province_name || '';
      }
    }
  } catch (error) {
    console.error('Failed to load agent district name:', error);
  }

  const JABODETABEK_CITY_CODES = [
    '31.01', '31.71', '31.72', '31.73', '31.74', '31.75', // DKI Jakarta
    '32.01', '32.71', '32.76', '32.16', '32.75',          // Kab Bogor, Kota Bogor, Depok, Kab Bekasi, Kota Bekasi
    '36.03', '36.71', '36.74'                             // Kab Tangerang, Kota Tangerang, Tangsel
  ];

  const isJabodetabek = JABODETABEK_CITY_CODES.includes(agentCityCode);

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
    isJabodetabek: isJabodetabek,
  };

  return <CreateOrderClient user={user} />;
}
