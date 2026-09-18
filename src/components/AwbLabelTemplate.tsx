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

/** Returns service badge letter and full brand name */
export const getServiceInfo = (code: string) => {
  const c = (code || 'REG').toUpperCase().trim();
  if (c.startsWith('REG')) return { letter: 'R', name: 'ANTERAJA REGULAR™' };
  if (c.startsWith('SD') || c.includes('SAME')) return { letter: 'SD', name: 'ANTERAJA SAME DAY™' };
  if (c.startsWith('ND') || c.includes('NEXT')) return { letter: 'ND', name: 'ANTERAJA NEXT DAY™' };
  if (c.startsWith('ECO')) return { letter: 'E', name: 'ANTERAJA ECONOMY™' };
  if (c.startsWith('CAR')) return { letter: 'C', name: 'ANTERAJA CARGO™' };
  return { letter: c.slice(0, 2) || 'R', name: `ANTERAJA ${c}™` };
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

  // Reference codes
  const bookingRef = data.bookingId || data.sourceOrderNo || data.invoice || data.awb;
  const routingCode = data.routingCode || '0001';
  const routingZone = data.routingCode ? data.routingCode.replace(/[^0-9]/g, '').slice(0, 2) || '1' : '1';
  const numericSubCode = (bookingRef.replace(/[^0-9]/g, '') || data.awb).padStart(13, '0').slice(-13);

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
      className={`bg-white text-black font-sans leading-tight border-2 border-black mx-auto box-border overflow-hidden flex flex-col justify-between select-text print-exact ${
        paperSize === '80x100'
          ? 'w-[80mm] min-h-[100mm] max-w-[80mm]'
          : paperSize === '80mm'
          ? 'w-[80mm] h-auto'
          : 'w-[100mm] h-[150mm] min-w-[100mm] min-h-[150mm] max-w-[100mm] max-h-[150mm]'
      }`}
      style={{
        width: paperSize === '100x150' ? '100mm' : '80mm',
        boxSizing: 'border-box',
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

      {/* ── 1. HEADER SECTION (Top badge & postage info) ── */}
      <div className="border-b-2 border-black flex items-stretch h-[29mm]">
        {/* Left: Giant Service Badge Letter (matches "G" in USPS reference) */}
        <div className="w-[28%] border-r-2 border-black flex flex-col items-center justify-center p-1 bg-white select-none">
          <span className="text-6xl font-black text-black leading-none tracking-tighter">
            {serviceInfo.letter}
          </span>
        </div>

        {/* Right: Postage Paid, Date, Hub Zip, Reference, Weight & Zone, Anteraja Logo */}
        <div className="flex-1 flex flex-col justify-between p-1.5">
          <div className="flex justify-between items-start">
            <div className="text-[8.5px] leading-[1.25] font-semibold uppercase text-black">
              <div className="font-extrabold tracking-tight">ANTERAJA POSTAGE PAID</div>
              <div>{dateStr}</div>
              <div>{data.shipper.zip || data.receiver.zip || '12340'}</div>
              <div className="truncate max-w-[120px]">{bookingRef}</div>
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

          {/* Mini 2D Barcode & numeric code below (matches PDF417 bar & number in USPS reference) */}
          <div className="flex flex-col items-end mt-0.5">
            <div className="overflow-hidden">
              <Barcode
                value={numericSubCode}
                format="CODE128"
                width={0.8}
                height={16}
                margin={0}
                displayValue={false}
                lineColor="#000000"
              />
            </div>
            <div className="text-[7.5px] font-mono font-bold tracking-wider mt-0.5 text-right">
              {numericSubCode}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. SERVICE NAME BANNER (Horizontal Box, matches USPS Ground Advantage banner) ── */}
      <div className="border-b-2 border-black py-1 px-2 text-center bg-white">
        <h1 className="font-black text-[15px] tracking-wider uppercase text-black leading-none m-0">
          {serviceInfo.name}
        </h1>
      </div>

      {/* ── 3. SHIPPER SECTION (Pengirim & Large Sequence / Routing Code) ── */}
      <div className="border-b-2 border-black p-1.5 flex justify-between items-start text-[9.5px] leading-tight min-h-[16mm]">
        <div className="flex-1 pr-2">
          <div className="font-extrabold text-[10.5px] uppercase tracking-wide truncate">
            {data.shipper.name || 'PENGIRIM'}
          </div>
          {data.shipper.phone && (
            <div className="text-[8.5px] font-medium text-gray-800">
              TEL: {data.shipper.phone}
            </div>
          )}
          <div className="text-[8.5px] uppercase leading-tight line-clamp-2 mt-0.5 font-medium">
            {shipperFullAddress || 'ALAMAT TIDAK TERSEDIA'}
          </div>
        </div>
        {/* Large bold sequence / routing code at top right (matches "0001" in USPS label) */}
        <div className="text-right pl-2 shrink-0">
          <span className="text-3xl font-black tracking-tight font-mono text-black leading-none block">
            {routingCode}
          </span>
        </div>
      </div>

      {/* ── 4. RECIPIENT SECTION (SHIP TO: with QR Code & Marketplace ID) ── */}
      <div className="border-b-[2.5px] border-black p-1.5 flex flex-col justify-between min-h-[34mm]">
        <div>
          <div className="text-[9.5px] font-black uppercase tracking-wider mb-1 text-black">
            SHIP TO:
          </div>
          <div className="flex items-start gap-2">
            {/* 2D QR Code on the left of address (matches USPS QR code placement) */}
            <div className="shrink-0 mt-0.5 border border-black p-0.5 bg-white">
              <QRCodeSVG
                value={data.awb}
                size={isSmall ? 40 : 48}
                level="M"
                fgColor="#000000"
              />
            </div>

            {/* Recipient Address Details */}
            <div className="flex-1 min-w-0">
              <div className="font-black text-[12.5px] uppercase tracking-tight leading-tight text-black truncate">
                {data.receiver.name || 'PENERIMA'}
              </div>
              {data.receiver.phone && (
                <div className="text-[9px] font-bold text-gray-900 mt-0.5">
                  TEL: {data.receiver.phone}
                </div>
              )}
              <div className="text-[9px] uppercase font-medium leading-snug line-clamp-3 mt-0.5 text-black">
                {receiverFullAddress || 'ALAMAT TIDAK TERSEDIA'}
              </div>
            </div>
          </div>
        </div>

        {/* Reference / Marketplace info on bottom right (matches ID #... & Vinted.com in USPS label) */}
        <div className="text-right text-[8.5px] font-mono self-end mt-1 leading-tight">
          <div className="font-semibold text-gray-800">
            ID: #{bookingRef}
          </div>
          <div className="font-bold text-[9px] uppercase tracking-wide text-black">
            {data.orderSource || 'Mitraaja'}
          </div>
        </div>
      </div>

      {/* ── 5. TRACKING BARCODE SECTION (Heavy line, ANTERAJA TRACKING #, Code128, Spaced AWB) ── */}
      <div className="border-b-2 border-black pt-1 pb-1.5 px-2 flex flex-col items-center justify-center bg-white">
        <div className="text-[11px] font-black tracking-[0.2em] uppercase mb-1 text-black">
          ANTERAJA TRACKING #
        </div>
        <div className="w-full flex justify-center overflow-hidden">
          <Barcode
            value={data.awb}
            format="CODE128"
            width={isSmall ? 1.5 : 1.95}
            height={isSmall ? 42 : 54}
            margin={0}
            displayValue={false}
            lineColor="#000000"
          />
        </div>
        <div className="text-[16px] font-black tracking-[0.22em] font-mono text-center mt-1 select-all text-black leading-none">
          {formatAwbSpaced(data.awb)}
        </div>
      </div>

      {/* ── 6. GOODS DETAIL, CS ANTERAJA, & BOTTOM-RIGHT QR CODE ── */}
      <div className="p-1.5 flex justify-between items-center text-[8.5px] leading-tight flex-1 min-h-[26mm] bg-white">
        {/* Left Column: Package Details & Customer Service Box */}
        <div className="flex-1 pr-2 flex flex-col justify-between h-full">
          <div>
            <div className="font-bold text-[9px] text-black truncate">
              Paket: <span className="font-normal">{itemsSummary}</span>
            </div>
            <div className="text-[8px] text-gray-800 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span>Berat: <strong>{weightKg} kg</strong></span>
              <span>•</span>
              <span>Layanan: <strong>{data.serviceCode || 'REG'}</strong></span>
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
          <div className="border border-black rounded p-1 mt-1 bg-white text-[8px] leading-[1.3]">
            <div className="font-black uppercase tracking-wider text-[8px] border-b border-black/20 pb-0.5 mb-0.5 text-black flex items-center justify-between">
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
