'use client';

import { useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import AwbLabelTemplate, { LabelData } from '@/components/AwbLabelTemplate';

interface User {
  name: string;
  nia: string;
}

const FILL = { fontVariationSettings: "'FILL' 1" } as const;

export default function PrintClient({ user }: { user: User }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [awb, setAwb] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [labelData, setLabelData] = useState<LabelData | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [trackingWarning, setTrackingWarning] = useState<{message: string, timestamp: string} | null>(null);
  const [paperSize, setPaperSize] = useState<'100x150' | '80x100' | '80mm'>('100x150');
  
  const printRef = useRef<HTMLDivElement>(null);

  const fetchAwbData = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!awb.trim()) return;

    setIsLoading(true);
    setError('');
    setLabelData(null);
    setIsFallback(false);
    setTrackingWarning(null);

    try {
      const res = await fetch(`/api/awb/${awb.trim()}`);
      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body.message || 'Data AWB tidak ditemukan');
      }

      const task = body.data;

      // Transform backend MaaTask to LabelData format
      const parsedData: LabelData = {
        awb: task.waybill || awb,
        sourceOrderNo: task.sourceOrderNo,
        orderSource: task.orderSource,
        invoice: task.invoice,
        shippedDate: task.shippedDate,
        estimatedDate: task.estimatedDate,
        serviceCode: task.serviceCode || 'REG',
        weight: task.weight || 1,
        codAmount: task.codAmount || 0,
        shipper: {
          name: task.shipperInfo?.name || task.shipperName || '-',
          address: task.shipperInfo?.address || '-',
          phone: task.shipperInfo?.phone || '-',
          city: task.shipperInfo?.city_name || '-',
          zip: task.shipperInfo?.zip || task.shipperInfo?.postcode || '',
        },
        receiver: {
          name: task.receiverInfo?.name || task.receiverName || '-',
          address: task.receiverInfo?.address || task.destinationCity || '-',
          phone: task.receiverInfo?.phone || '-',
          city: task.receiverInfo?.city_name || '-',
          zip: task.receiverInfo?.zip || task.receiverInfo?.postcode || '',
        },
        items: task.items || [],
      };

      setLabelData(parsedData);
      setIsFallback(body.isFallback || false);
      setTrackingWarning(body.lastHistory || null);
    } catch (err: any) {
      setError(err.message || 'Gagal mencari AWB');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="flex h-screen bg-[#f8f9fb] overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar user={user} isOpen={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen min-w-0 relative">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 shrink-0 print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[22px] text-gray-600">menu</span>
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Cetak Label AWB</h2>
            </div>
          </div>
        </header>

        {/* Scrollable Main Area - hidden during print */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 print:hidden">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Input Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Cari AWB untuk Dicetak</h3>
              
              <form onSubmit={fetchAwbData} className="flex gap-3">
                <input
                  type="text"
                  value={awb}
                  onChange={(e) => setAwb(e.target.value)}
                  placeholder="Scan atau ketik nomor AWB..."
                  className="flex-1 h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isLoading || !awb.trim()}
                  className="h-12 px-6 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[20px]" style={FILL}>search</span>
                  )}
                  <span>Cari</span>
                </button>
              </form>

              {error && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 text-rose-700">
                  <span className="material-symbols-outlined shrink-0">error</span>
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Warning Section for Already Claimed / Fallback */}
            {isFallback && trackingWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-amber-900 shadow-sm animate-fade-in print:hidden">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-500 shrink-0 mt-0.5">warning</span>
                  <div>
                    <h4 className="font-bold text-sm mb-1">Perhatian: AWB Sudah Diproses / Diklaim</h4>
                    <p className="text-sm opacity-90 mb-2">Sistem menggunakan data pelacakan publik karena resi ini sudah diklaim oleh pihak lain atau tidak ditemukan di daftar tugas MAA Anda.</p>
                    <div className="bg-white/60 rounded-lg p-3 border border-amber-100 text-xs">
                      <div className="font-semibold mb-1">Update Pelacakan Terakhir:</div>
                      <div className="text-amber-800">{trackingWarning.message}</div>
                      <div className="text-amber-600/80 mt-1">{trackingWarning.timestamp}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Section */}
            {labelData && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Settings Panel */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h4 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-400" style={FILL}>settings</span>
                      Pengaturan Cetak
                    </h4>
                    
                    <div className="space-y-3">
                      <label className="block">
                        <span className="block text-xs font-semibold text-gray-600 mb-1.5">Ukuran Kertas (Thermal)</span>
                        <select 
                          value={paperSize}
                          onChange={(e) => setPaperSize(e.target.value as any)}
                          className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                        >
                          <option value="100x150">100 × 150 mm (Standar)</option>
                          <option value="80x100">80 × 100 mm (Kecil)</option>
                          <option value="80mm">80 mm (Struk)</option>
                        </select>
                      </label>

                      <button
                        onClick={handlePrint}
                        className="w-full h-12 mt-4 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[20px]" style={FILL}>print</span>
                        Cetak Label Sekarang
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Preview Panel */}
                <div className="lg:col-span-2 bg-gray-200 rounded-2xl border border-gray-300 p-6 overflow-x-auto flex justify-center items-start shadow-inner min-h-[500px]">
                  <div className="pointer-events-none shadow-lg scale-90 md:scale-100 origin-top">
                    {/* Render the label directly in preview mode (not print exact mode) so we can see it on screen */}
                    {/* The same component is used, but without triggering the global print styles until actually printed */}
                    <AwbLabelTemplate data={labelData} paperSize={paperSize} />
                  </div>
                </div>

              </div>
            )}
          </div>
        </main>

        {/* Hidden Print Container */}
        {/* Only visible when printing */}
        <div className="hidden print:block absolute inset-0 bg-white z-[9999]">
          {labelData && <AwbLabelTemplate data={labelData} paperSize={paperSize} ref={printRef} />}
        </div>
      </div>
    </div>
  );
}
