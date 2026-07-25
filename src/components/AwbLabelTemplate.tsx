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
  shipper: {
    name: string;
    address: string;
    phone: string;
    city: string;
    zip: string;
  };
  receiver: {
    name: string;
    address: string;
    phone: string;
    city: string;
    zip: string;
  };
  items: Array<any>;
}

interface Props {
  data: LabelData;
  paperSize?: '100x150' | '80x100' | '80mm';
}

const AwbLabelTemplate = forwardRef<HTMLDivElement, Props>(({ data, paperSize = '100x150' }, ref) => {
  const getContainerClass = () => {
    switch (paperSize) {
      case '80x100':
        return 'w-[80mm] min-h-[100mm]';
      case '80mm':
        return 'w-[80mm] h-auto'; // receipt style
      case '100x150':
      default:
        return 'w-[100mm] min-h-[150mm]';
    }
  };

  const isSmall = paperSize !== '100x150';

  return (
    <div ref={ref} className={`bg-white text-black font-sans leading-tight print-exact ${getContainerClass()} p-2 border border-dashed border-gray-300 print:border-none mx-auto relative box-border overflow-hidden`}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: ${paperSize === '100x150' ? '100mm 150mm' : paperSize === '80x100' ? '80mm 100mm' : '80mm auto'};
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-exact {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 4mm !important;
            border: none !important;
            page-break-after: always;
          }
        }
      `}} />

      {/* Header Area */}
      <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
        <div className="flex flex-col">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-anteraja.png" alt="Anteraja" className="h-8 object-contain object-left mb-1" />
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tracking-tighter uppercase">{data.serviceCode || 'REG'}</div>
          {data.codAmount && data.codAmount > 0 && (
            <div className="text-sm font-bold border-2 border-black px-1.5 py-0.5 mt-1 inline-block whitespace-nowrap">
              COD: Rp {data.codAmount.toLocaleString('id-ID')}
            </div>
          )}
        </div>
      </div>

      {/* Main Barcode & QR Code Section */}
      <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
        <div className="flex-1 flex flex-col items-center justify-center">
          <Barcode value={data.awb} width={isSmall ? 1.5 : 2} height={isSmall ? 40 : 60} fontSize={isSmall ? 12 : 16} margin={0} displayValue={true} />
          {(data.sourceOrderNo || data.orderSource || data.invoice) && (
            <div className="text-[10px] font-bold mt-1 text-center leading-tight">
              {data.sourceOrderNo && <div>Ref: {data.sourceOrderNo}</div>}
              {data.invoice && <div>Inv: {data.invoice}</div>}
              {data.orderSource && <div>Source: {data.orderSource}</div>}
            </div>
          )}
        </div>
        <div className="ml-2 flex flex-col items-center justify-center">
          <QRCodeSVG value={data.awb} size={isSmall ? 60 : 80} level="M" />
          {(data.shippedDate || data.estimatedDate) && (
            <div className="text-[8px] font-medium mt-1 text-center">
              {data.shippedDate && <div>Kirim: {data.shippedDate.split(' ')[0]}</div>}
              {data.estimatedDate && <div>Est: {data.estimatedDate.split(' ')[0]}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-2 gap-2 border-b-2 border-black pb-2 mb-2 text-[10px]">
        {/* Penerima */}
        <div className="pr-1 border-r border-black">
          <div className="font-bold uppercase text-[11px] border-b border-gray-300 mb-1 pb-0.5">Penerima</div>
          <div className="font-bold text-[12px] uppercase">{data.receiver.name}</div>
          <div className="font-medium">{data.receiver.phone}</div>
          <div className="mt-1 line-clamp-3 leading-snug">{data.receiver.address}</div>
          <div className="mt-1 font-semibold">{data.receiver.city} {data.receiver.zip}</div>
        </div>
        
        {/* Pengirim */}
        <div className="pl-1">
          <div className="font-bold uppercase text-[11px] border-b border-gray-300 mb-1 pb-0.5">Pengirim</div>
          <div className="font-bold uppercase">{data.shipper.name}</div>
          <div className="font-medium">{data.shipper.phone}</div>
          <div className="mt-1 line-clamp-2 leading-snug">{data.shipper.address}</div>
          <div className="mt-1 font-semibold">{data.shipper.city} {data.shipper.zip}</div>
        </div>
      </div>

      {/* Details (Items / SKU) */}
      <div className="border-b-2 border-black pb-2 mb-2 text-[10px]">
        <div className="flex justify-between font-bold mb-1">
          <span>Deskripsi Paket (Qty)</span>
          <span>Berat: {data.weight} kg</span>
        </div>
        <div className="border border-black p-1">
          {data.items && data.items.length > 0 ? (
            <ul className="list-disc list-inside">
              {data.items.map((item, idx) => (
                <li key={idx} className="truncate">
                  {item.item_name || item.description || 'Barang'} - Qty: {item.quantity || item.qty || 1}
                </li>
              ))}
            </ul>
          ) : (
            <div>Barang Kiriman</div>
          )}
        </div>
      </div>

      {/* Footer / Contact Info */}
      <div className="text-[9px] text-center mt-auto leading-tight">
        <div className="font-bold mb-1">Butuh Bantuan? Hubungi Anteraja Care</div>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          <a href="https://x.com/AnterajaCare" target="_blank" rel="noopener noreferrer">X: @AnterajaCare</a>
          <a href="tel:02150663333">Call: 021 - 5066 - 3333</a>
          <a href="mailto:cs@anteraja.id">Email: cs@anteraja.id</a>
        </div>
      </div>

    </div>
  );
});

AwbLabelTemplate.displayName = 'AwbLabelTemplate';

export default AwbLabelTemplate;
