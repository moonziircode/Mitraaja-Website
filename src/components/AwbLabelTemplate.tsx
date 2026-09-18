import React, { forwardRef } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

export interface LabelData {
  awb: string;
  sourceOrderNo?: string;
  orderSource?: string;
  invoice?: string;
  shippedDate?: string;
  estimatedDate?: string;
  serviceCode: string;
  weight: number;
  codAmount?: number;
  routingCode?: string;
  bookingId?: string;
  notes?: string;
  shipper: {
    name: string;
    address: string;
    phone?: string;
    city?: string;
    zip?: string;
    district?: string;
    province?: string;
  };
  receiver: {
    name: string;
    address: string;
    phone?: string;
    city?: string;
    zip?: string;
    district?: string;
    province?: string;
  };
  items?: Array<{
    item_name?: string;
    itemName?: string;
    description?: string;
    quantity?: number;
    qty?: number;
    weight?: number;
    price?: number;
  }>;
}

interface Props {
  data: LabelData;
  paperSize?: '100x150' | '80x100' | '80mm';
}

/** Formats AWB into readable 4-digit groups (e.g. 1100 4385 4074 67) */
export const formatAwbSpaced = (rawAwb: string) => {
  if (!rawAwb) return '';
  const clean = rawAwb.replace(/\s+/g, '');
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
};

/** Returns full service badge code and full brand name */
export const getServiceInfo = (code: string) => {
  const c = (code || 'REG').toUpperCase().trim();
  if (c.startsWith('REG')) return { code: 'REG', name: 'ANTERAJA REGULAR™' };
  if (c.startsWith('SD') || c.includes('SAME')) return { code: 'SAME DAY', name: 'ANTERAJA SAME DAY™' };
  if (c.startsWith('ND') || c.includes('NEXT')) return { code: 'NEXT DAY', name: 'ANTERAJA NEXT DAY™' };
  if (c.startsWith('ECO')) return { code: 'ECO', name: 'ANTERAJA ECONOMY™' };
  if (c.startsWith('CAR')) return { code: 'CARGO', name: 'ANTERAJA CARGO™' };
  return { code: c || 'REG', name: `ANTERAJA ${c}™` };
};

const AwbLabelTemplate = forwardRef<HTMLDivElement, Props>(({ data, paperSize = '100x150' }, ref) => {
  const isSmall = paperSize !== '100x150';
  const serviceInfo = getServiceInfo(data.serviceCode);

  // Normalize weight to kg
  const rawWeight = data.weight || 0;
  const weightKg = rawWeight > 50 ? (rawWeight / 1000).toFixed(1) : (rawWeight > 0 ? rawWeight.toFixed(1) : '1.0');

  // Date formatting
  const todayStr = new Date().toISOString().split('T')[0];
  const dateStr = data.shippedDate ? data.shippedDate.split(' ')[0] : todayStr;

  // Address assembly
  const shipperAddressParts = [
    data.shipper.address && data.shipper.address !== '-' ? data.shipper.address : '',
    data.shipper.district ? `KEC. ${data.shipper.district}` : '',
    data.shipper.city && data.shipper.city !== '-' ? data.shipper.city : '',
    data.shipper.province ? data.shipper.province : '',
    data.shipper.zip ? data.shipper.zip : '',
  ].filter(Boolean);
  const shipperFullAddress = shipperAddressParts.join(', ');

  const receiverAddressParts = [
    data.receiver.address && data.receiver.address !== '-' ? data.receiver.address : '',
    data.receiver.district ? `KEC. ${data.receiver.district}` : '',
    data.receiver.city && data.receiver.city !== '-' ? data.receiver.city : '',
    data.receiver.province ? data.receiver.province : '',
    data.receiver.zip ? data.receiver.zip : '',
  ].filter(Boolean);
  const receiverFullAddress = receiverAddressParts.join(', ');

  // Zone
  const routingZone = data.routingCode ? data.routingCode.replace(/[^0-9]/g, '').slice(0, 2) || '1' : '1';

  // Items string
  const itemsSummary = (data.items && data.items.length > 0)
    ? data.items.map(i => {
        const name = i.item_name || i.itemName || i.description || 'Paket';
        const qty = i.quantity || i.qty || 1;
        return `${name} (x${qty})`;
      }).join(', ')
    : 'Barang Kiriman';

  return (
    <div
      ref={ref}
      className={`bg-white text-black font-sans antialiased leading-tight border-2 border-black mx-auto box-border overflow-hidden flex flex-col justify-between select-text print-exact ${
        paperSize === '80x100'
          ? 'w-[80mm] min-h-[100mm] max-w-[80mm]'
          : paperSize === '80mm'
          ? 'w-[80mm] h-auto'
          : 'w-[100mm] h-[150mm] min-w-[100mm] min-h-[150mm] max-w-[100mm] max-h-[150mm]'
      }`}
      style={{
        width: paperSize === '100x150' ? '100mm' : '80mm',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${paperSize === '100x150' ? '100mm 150mm' : paperSize === '80x100' ? '80mm 100mm' : '80mm auto'};
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: #fff !important;
          }
          .print-exact {
            width: ${paperSize === '100x150' ? '100mm' : '80mm'} !important;
            height: ${paperSize === '100x150' ? '150mm' : 'auto'} !important;
            max-width: ${paperSize === '100x150' ? '100mm' : '80mm'} !important;
            max-height: ${paperSize === '100x150' ? '150mm' : 'none'} !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 2px solid #000 !important;
            page-break-after: always;
          }
        }
      `}} />

      {/* ── 1. HEADER SECTION (Full service badge & postage info) ── */}
      <div className="border-b-2 border-black flex items-stretch h-[29mm]">
        {/* Left: Service Badge Box (Displays full code: REG, ECO, SAME DAY, etc.) */}
        <div className="w-[30%] border-r-2 border-black flex flex-col items-center justify-center p-1.5 bg-white select-none">
          <span
            className={`font-black text-black leading-none tracking-tight text-center uppercase ${
              serviceInfo.code.length > 5
                ? 'text-xl'
                : serviceInfo.code.length > 3
                ? 'text-2xl'
                : 'text-3xl'
            }`}
          >
            {serviceInfo.code}
          </span>
          <span className="text-[7.5px] font-extrabold uppercase tracking-widest text-gray-500 mt-1">
            LAYANAN
          </span>
        </div>

        {/* Right: Postage Paid, Date, Origin Zip, AWB, Weight, Zone, Anteraja Logo & Barcode */}
        <div className="flex-1 flex flex-col justify-between p-1.5">
          <div className="flex justify-between items-start">
            <div className="text-[8.5px] leading-[1.25] font-semibold uppercase text-black">
              <div className="font-extrabold tracking-tight">ANTERAJA POSTAGE PAID</div>
              <div>{dateStr}</div>
              <div>{data.shipper.zip || data.receiver.zip || '12340'}</div>
              <div className="font-mono font-bold">AWB: {data.awb}</div>
              <div>Commercial / Dropoff</div>
              <div className="font-bold">{weightKg} KG ZONE {routingZone}</div>
            </div>

            {/* Anteraja Logo */}
            <div className="flex flex-col items-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-anteraja.png"
                alt="Anteraja"
                className="h-6 object-contain mb-1"
              />
            </div>
          </div>

          {/* Mini Barcode always strictly refers to AWB */}
          <div className="flex flex-col items-end mt-0.5">
            <div className="overflow-hidden">
              <Barcode
                value={data.awb}
                format="CODE128"
                width={0.8}
                height={16}
                margin={0}
                displayValue={false}
                lineColor="#000000"
              />
            </div>
            <div className="text-[7.5px] font-mono font-bold tracking-wider mt-0.5 text-right">
              {data.awb}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. SERVICE NAME BANNER (Horizontal Box, professional typography) ── */}
      <div className="border-b-2 border-black py-1 px-2 text-center bg-white">
        <h1 className="font-black text-[15px] tracking-[0.15em] uppercase text-black leading-none m-0">
          {serviceInfo.name}
        </h1>
      </div>

      {/* ── 3. SHIPPER SECTION (Pengirim - 0001 dihapus sesuai instruksi) ── */}
      <div className="border-b-2 border-black p-2 text-[9.5px] leading-tight min-h-[16mm] bg-white">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[8px] font-extrabold uppercase tracking-wider text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
            PENGIRIM
          </span>
          <span className="font-extrabold text-[11px] uppercase tracking-tight text-black truncate">
            {data.shipper.name || 'PENGIRIM'}
          </span>
          {data.shipper.phone && (
            <span className="text-[9px] font-semibold text-gray-700 ml-auto font-mono">
              TEL: {data.shipper.phone}
            </span>
          )}
        </div>
        <div className="text-[9px] uppercase leading-snug line-clamp-2 text-black font-medium mt-0.5">
          {shipperFullAddress || 'ALAMAT TIDAK TERSEDIA'}
        </div>
      </div>

      {/* ── 4. RECIPIENT SECTION (SHIP TO: with QR Code & Marketplace ID) ── */}
      <div className="border-b-[2.5px] border-black p-2 flex flex-col justify-between min-h-[35mm] bg-white">
        <div>
          <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-600 mb-1">
            SHIP TO:
          </div>
          <div className="flex items-start gap-2.5">
            {/* 2D QR Code on the left of address */}
            <div className="shrink-0 border-2 border-black p-0.5 bg-white shadow-xs">
              <QRCodeSVG
                value={data.awb}
                size={isSmall ? 42 : 50}
                level="M"
                fgColor="#000000"
              />
            </div>

            {/* Recipient Address Details */}
            <div className="flex-1 min-w-0">
              <div className="font-black text-[13px] uppercase tracking-tight leading-tight text-black truncate">
                {data.receiver.name || 'PENERIMA'}
              </div>
              {data.receiver.phone && (
                <div className="text-[9.5px] font-bold text-gray-900 mt-0.5 font-mono">
                  TEL: {data.receiver.phone}
                </div>
              )}
              <div className="text-[9.5px] uppercase font-medium leading-snug line-clamp-3 mt-0.5 text-black">
                {receiverFullAddress || 'ALAMAT TIDAK TERSEDIA'}
              </div>
            </div>
          </div>
        </div>

        {/* Reference / Marketplace info on bottom right */}
        <div className="text-right text-[8.5px] font-mono self-end mt-1 leading-tight">
          <div className="font-semibold text-gray-800">
            AWB: {data.awb}
          </div>
          <div className="font-bold text-[9px] uppercase tracking-wide text-black">
            {data.orderSource || 'Mitraaja'}
          </div>
        </div>
      </div>

      {/* ── 5. TRACKING BARCODE SECTION (Heavy line, ANTERAJA TRACKING #, Code128, Spaced AWB) ── */}
      <div className="border-b-2 border-black pt-1.5 pb-2 px-2 flex flex-col items-center justify-center bg-white">
        <div className="text-[11px] font-black tracking-[0.25em] uppercase mb-1 text-black">
          ANTERAJA TRACKING #
        </div>
        <div className="w-full flex justify-center overflow-hidden">
          <Barcode
            value={data.awb}
            format="CODE128"
            width={isSmall ? 1.6 : 2.05}
            height={isSmall ? 44 : 56}
            margin={0}
            displayValue={false}
            lineColor="#000000"
          />
        </div>
        <div className="text-[17px] font-black tracking-[0.25em] font-mono text-center mt-1.5 select-all text-black leading-none">
          {formatAwbSpaced(data.awb)}
        </div>
      </div>

      {/* ── 6. GOODS DETAIL, CS ANTERAJA, & BOTTOM-RIGHT QR CODE ── */}
      <div className="p-2 flex justify-between items-center text-[8.5px] leading-tight flex-1 min-h-[26mm] bg-white">
        {/* Left Column: Package Details & Customer Service Box */}
        <div className="flex-1 pr-2 flex flex-col justify-between h-full">
          <div>
            <div className="font-bold text-[9px] text-black truncate">
              Paket: <span className="font-normal">{itemsSummary}</span>
            </div>
            <div className="text-[8px] text-gray-800 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span>Berat: <strong>{weightKg} kg</strong></span>
              <span>•</span>
              <span>Layanan: <strong>{serviceInfo.code}</strong></span>
              <span>•</span>
              <span className={data.codAmount && data.codAmount > 0 ? "font-bold text-black border border-black px-1" : ""}>
                {data.codAmount && data.codAmount > 0
                  ? `COD: Rp ${data.codAmount.toLocaleString('id-ID')}`
                  : 'NON-COD'}
              </span>
              {data.notes && (
                <>
                  <span>•</span>
                  <span className="italic truncate max-w-[120px]">Ket: {data.notes}</span>
                </>
              )}
            </div>
          </div>

          {/* Customer Service Anteraja Box (Exact requirement from user) */}
          <div className="border border-black rounded p-1.5 mt-1.5 bg-white text-[8px] leading-[1.35]">
            <div className="font-black uppercase tracking-wider text-[8px] border-b border-black/20 pb-0.5 mb-1 text-black flex items-center justify-between">
              <span>Customer Service Anteraja</span>
            </div>
            <div className="flex flex-col gap-0.5 text-black">
              <div><span className="font-bold">X :</span> @AnterajaCare</div>
              <div><span className="font-bold">Call center :</span> 021 - 5066 - 3333</div>
              <div><span className="font-bold">Customer Service :</span> cs@anteraja.id</div>
            </div>
          </div>
        </div>

        {/* Right Column: 2D QR Code at bottom right (matches USPS bottom-right 2D barcode) */}
        <div className="shrink-0 flex flex-col items-center justify-center pl-1 self-center">
          <div className="border border-black p-0.5 bg-white">
            <QRCodeSVG
              value={`https://anteraja.id/tracking?awb=${data.awb}`}
              size={isSmall ? 48 : 58}
              level="M"
              fgColor="#000000"
            />
          </div>
          <span className="text-[7px] font-bold mt-0.5 text-center font-mono text-black">
            SCAN RESI
          </span>
        </div>
      </div>
    </div>
  );
});

AwbLabelTemplate.displayName = 'AwbLabelTemplate';

export default AwbLabelTemplate;
