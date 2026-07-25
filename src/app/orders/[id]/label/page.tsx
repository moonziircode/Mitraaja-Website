'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface OrderDetail {
  waybill_no: string;
  booking_id: string;
  task_code: string;
  parcel_total_weight: number;
  product_code: string;
  product_name: string;
  delivery_price: number;
  shipper_info: {
    name: string;
    phone: string;
    address: string;
    district_code: string;
    postcode: string;
    district_name: string;
    city_name: string;
    provice_name: string;
  };
  receiver_info: {
    name: string;
    phone: string;
    address: string;
    district_code: string;
    postcode: string;
    district_name: string;
    city_name: string;
    provice_name: string;
  };
  items: Array<{
    item_name: string;
    declared_value: number;
    weight: number;
    width: number;
    length: number;
    height: number;
    item_category: string;
    qty?: number;
  }>;
  payment_status: string;
  task_status: string;
  expired_at: string;
}

export default function ShippingLabelPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = params.id as string;
  const autoPrint = searchParams.get('autoprint') === 'true';

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  // Mask recipient name
  const maskName = (name: string) => {
    if (!name) return '';
    return name.split(' ').map(part => {
      if (part.length <= 2) return part;
      return part[0] + '*'.repeat(part.length - 2) + part[part.length - 1];
    }).join(' ');
  };

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/detail`);
        const result = await res.json();
        if (result.success && result.data) {
          setOrder(result.data);
        } else {
          setError(result.message || 'Gagal memuat detail order.');
        }
      } catch (err: any) {
        setError(err.message || 'Gagal menghubungi server.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [orderId]);

  // Generate barcode once order detail is loaded
  useEffect(() => {
    if (order && barcodeRef.current) {
      const awbVal = order.waybill_no || order.task_code;
      try {
        JsBarcode(barcodeRef.current, awbVal, {
          format: 'CODE128',
          width: 2.2,
          height: 60,
          displayValue: true,
          font: 'Arial',
          fontSize: 14,
          fontOptions: 'bold',
          textMargin: 4,
          margin: 0
        });
      } catch (err) {
        console.error('Barcode generation error:', err);
      }

      // Auto print if requested
      if (autoPrint) {
        setTimeout(() => {
          window.print();
        }, 800);
      }
    }
  }, [order, autoPrint]);

  const handlePrint = () => {
    window.print();
  };

  const generatePdfBlobUrl = async (): Promise<string> => {
    const element = document.getElementById('printable-label');
    if (!element) throw new Error('Label element not found');

    const canvas = await html2canvas(element, {
      scale: 3, // High DPI for crisp thermal printing
      useCORS: true,
      logging: false
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [100, 150] // A6 100x150 mm
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, 100, 150);
    return pdf.output('bloburl').toString();
  };

  const handlePreviewPdf = async () => {
    try {
      const blobUrl = await generatePdfBlobUrl();
      window.open(blobUrl, '_blank');
    } catch (err: any) {
      alert(`Gagal menampilkan preview PDF: ${err.message}`);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const element = document.getElementById('printable-label');
      if (!element || !order) return;

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [100, 150]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 100, 150);
      const filename = `Mitraaja_AWB_${order.waybill_no || order.task_code}.pdf`;
      pdf.save(filename);
    } catch (err: any) {
      alert(`Gagal mengunduh PDF: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-500 font-sans">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold">Memuat label pengiriman...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-rose-500 font-sans p-6 text-center">
        <span className="material-symbols-outlined text-[48px] mb-3">error</span>
        <p className="text-sm font-semibold mb-4">{error || 'Detail order tidak ditemukan.'}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-colors"
        >
          Kembali
        </button>
      </div>
    );
  }

  const shipper = order.shipper_info;
  const receiver = order.receiver_info;
  const item = order.items?.[0] || { item_name: 'Paket', qty: 1 };
  const awbVal = order.waybill_no || order.task_code;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 font-sans text-gray-800 flex flex-col items-center select-none overflow-y-auto">
      
      {/* ── Control Header (Hidden during Print) ── */}
      <div className="w-full max-w-[400px] mb-6 bg-white border border-gray-150 rounded-2xl p-4 shadow-sm flex flex-col gap-3 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-gray-800">Cetak Label Shipping</h1>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">AWB: {awbVal}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all flex items-center text-gray-500 hover:text-gray-800"
            title="Kembali"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-1">
          <button
            onClick={handlePreviewPdf}
            className="h-10 px-3 border border-gray-200 hover:border-gray-300 text-gray-700 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white"
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            Preview PDF
          </button>
          <button
            onClick={handleDownloadPdf}
            className="h-10 px-3 border border-gray-200 hover:border-gray-300 text-gray-700 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Unduh PDF
          </button>
          <button
            onClick={handlePrint}
            className="h-10 px-3 bg-primary hover:bg-primary/95 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Cetak Label
          </button>
        </div>
      </div>

      {/* ── Printable Shipping Label Container ── */}
      <div 
        id="printable-label"
        className="w-[100mm] h-[150mm] min-w-[100mm] min-h-[150mm] max-w-[100mm] max-h-[150mm] bg-white border border-black p-[3mm] flex flex-col justify-between box-border text-[9px] leading-tight text-black relative select-text"
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif'
        }}
      >
        
        {/* =====================================================================
            TOP COPY - OPERATIONAL LABEL (±100mm)
            ===================================================================== */}
        <div className="flex flex-col gap-1.5 w-full">
          
          {/* 1. Logo & Layanan */}
          <div className="flex items-center justify-between border-b border-black pb-1">
            <img 
              src="/logo-anteraja.png" 
              alt="Anteraja" 
              className="h-[14px] object-contain block"
            />
            <div className="border-[1.5px] border-black px-2 py-0.5 font-black text-xs tracking-wider">
              {order.product_code || 'REG'}
            </div>
          </div>

          {/* 2. Barcode & AWB */}
          <div className="flex flex-col items-center justify-center py-0.5 border-b border-black">
            <svg ref={barcodeRef} className="max-w-full h-auto block"></svg>
          </div>

          {/* 3. Pengirim & Penerima Info */}
          <div className="grid grid-cols-2 gap-3 border-b border-black pb-1.5 pt-0.5">
            <div>
              <p className="font-bold text-[8px] uppercase tracking-wide text-gray-500 mb-0.5">Pengirim:</p>
              <p className="font-bold">{shipper.name}</p>
              <p className="font-medium text-[8px]">{shipper.phone}</p>
              <p className="font-medium text-[8px] mt-0.5">{shipper.city_name}</p>
            </div>
            <div>
              <p className="font-bold text-[8px] uppercase tracking-wide text-gray-500 mb-0.5">Penerima:</p>
              <p className="font-bold">{maskName(receiver.name)}</p>
              <p className="font-medium leading-tight mt-0.5 break-words whitespace-pre-wrap">
                {receiver.address}
              </p>
              <p className="font-bold text-[8px] mt-0.5">{receiver.district_name}, {receiver.postcode}</p>
            </div>
          </div>

          {/* 4. Kota Tujuan (Kapital, Bold, Font Terbesar) */}
          <div className="flex items-center justify-center border-b border-black py-1">
            <h2 className="text-[17px] font-black tracking-wide uppercase text-center leading-none">
              {(receiver.city_name || 'JAKARTA').toUpperCase()}
            </h2>
          </div>

          {/* 5. Box Ongkir (Thick Border Box) */}
          <div className="border-[2px] border-black p-1.5 flex items-center justify-center bg-white text-center rounded-sm">
            <span className="font-extrabold text-[9px] uppercase tracking-wider text-black">
              PENJUAL TIDAK PERLU BAYAR ONGKIR KE KURIR
            </span>
          </div>

          {/* 6. Paket & Order Details (Barang, Berat, COD, Batas Kirim, Booking) */}
          <div className="grid grid-cols-2 gap-2 border-t border-black pt-1.5 text-[8px]">
            <div className="flex flex-col gap-0.5">
              <p className="font-bold">Barang: <span className="font-medium">{item.item_name} {item.qty ? `(Qty: ${item.qty})` : ''}</span></p>
              <p className="font-bold">Berat: <span className="font-medium">{order.parcel_total_weight || 1} Kg</span></p>
              <p className="font-bold">COD: <span className="font-medium">NON-COD</span></p>
            </div>
            <div className="flex flex-col gap-0.5 text-right">
              <p className="font-bold">Kode Booking: <span className="font-mono font-medium">{order.booking_id || order.task_code}</span></p>
              <p className="font-bold">Batas Kirim: <span className="font-medium">{order.expired_at ? new Date(order.expired_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span></p>
            </div>
          </div>

        </div>

        {/* =====================================================================
            PERFORATION / SOBEK DI SINI LINE (±50mm)
            ===================================================================== */}
        <div className="w-full flex items-center justify-center py-1">
          <div className="w-full border-t border-dashed border-black relative flex justify-center">
            <span className="absolute bg-white px-2 text-[7px] font-bold text-gray-500 uppercase tracking-widest -top-[5px]">
              SOBEK DI SINI / PERFORASI
            </span>
          </div>
        </div>

        {/* =====================================================================
            BOTTOM COPY - CUSTOMER RESI (±50mm)
            ===================================================================== */}
        <div className="flex flex-col gap-1 w-full border-t border-black pt-1.5">
          <div className="flex items-center justify-between border-b border-black pb-0.5">
            <span className="font-black text-[9px] tracking-wide">ANTERAJA BUKTI PENGIRIMAN</span>
            <span className="font-mono text-[8px]">{new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[8px]">
            <div className="flex flex-col gap-0.5">
              <p className="font-bold">No AWB: <span className="font-mono font-medium">{awbVal}</span></p>
              <p className="font-bold">Pengirim: <span className="font-medium">{shipper.name}</span></p>
              <p className="font-bold">Penerima: <span className="font-medium">{maskName(receiver.name)}</span></p>
              <p className="font-bold">Layanan: <span className="font-medium">{order.product_code || 'REG'}</span></p>
            </div>
            <div className="flex flex-col gap-0.5 text-right">
              <p className="font-bold">Berat: <span className="font-medium">{order.parcel_total_weight || 1} Kg</span></p>
              <p className="font-bold">Ongkir: <span className="font-medium">Rp {Number(order.delivery_price || 0).toLocaleString('id-ID')}</span></p>
              <p className="font-bold text-[9px]">Total Bayar: <span className="font-extrabold">Rp {Number(order.delivery_price || 0).toLocaleString('id-ID')}</span></p>
              <p className="font-bold">Kode Booking: <span className="font-mono font-medium">{order.booking_id || order.task_code}</span></p>
            </div>
          </div>

          {/* Customer Service Info */}
          <div className="border-t border-black pt-1 text-[7px] text-center text-gray-500 font-medium flex items-center justify-between">
            <span>CS: 021-5066-3333</span>
            <span>Email: cs@anteraja.id</span>
            <span>Web: anteraja.id</span>
          </div>
        </div>

      </div>

      {/* ── Direct Print Styles Override ── */}
      <style jsx global>{`
        @media print {
          /* Hide everything except the label */
          body * {
            visibility: hidden !important;
          }
          #printable-label, #printable-label * {
            visibility: visible !important;
          }
          /* Position label at the top-left of printable page */
          #printable-label {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100mm !important;
            height: 150mm !important;
            margin: 0 !important;
            padding: 3mm !important;
            border: none !important;
            box-shadow: none !important;
          }
          /* Control page dimensions (A6) */
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
          /* Disable default headers and footers */
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
      
    </div>
  );
}
