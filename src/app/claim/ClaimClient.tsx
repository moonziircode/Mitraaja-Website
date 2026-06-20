'use client';

import { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';

interface User {
  name: string;
  nia: string;
}

interface ClaimItem {
  awb: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

const FILL = { fontVariationSettings: "'FILL' 1" } as const;

export default function ClaimClient({ user }: { user: User }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [inputText, setInputText] = useState('');
  const [claimItems, setClaimItems] = useState<ClaimItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse input into unique valid AWBs
  const handleParseInput = () => {
    const rawLines = inputText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Duplicate detection and basic validation
    const uniqueAwbs = new Set<string>();
    const newItems: ClaimItem[] = [];

    rawLines.forEach(awb => {
      // Basic AWB validation (alphanumeric, typical length)
      const isValidFormat = /^[A-Za-z0-9_-]{5,30}$/.test(awb);
      if (isValidFormat && !uniqueAwbs.has(awb)) {
        uniqueAwbs.add(awb);
        newItems.push({ awb, status: 'pending' });
      }
    });

    setClaimItems(newItems);
  };

  const handleClaimAll = async () => {
    if (claimItems.length === 0) return;
    setIsProcessing(true);

    try {
      const ordersToClaim = claimItems.filter(item => item.status === 'pending' || item.status === 'error').map(item => ({ claim_key: item.awb }));
      
      const res = await fetch('/api/parcels/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: ordersToClaim })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Map the results back to claimItems
        const resultItems = claimItems.map(item => {
          const match = data.content?.orders?.find((o: any) => o.claim_key === item.awb);
          if (match) {
            return {
              ...item,
              status: match.claim_status === 'SUCCESS' ? 'success' as const : 'error' as const,
              message: match.claim_message
            };
          }
          // If the API failed entirely or didn't return this order
          return { ...item, status: 'error' as const, message: data.info || 'Gagal klaim' };
        });
        setClaimItems(resultItems);
      } else {
        // Entire request failed
        setClaimItems(prev => prev.map(item => ({
          ...item,
          status: 'error',
          message: data.info || 'Request failed'
        })));
      }
    } catch (err) {
      setClaimItems(prev => prev.map(item => ({
        ...item,
        status: 'error',
        message: 'Koneksi terputus'
      })));
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: claimItems.length,
      pending: claimItems.filter(i => i.status === 'pending').length,
      success: claimItems.filter(i => i.status === 'success').length,
      error: claimItems.filter(i => i.status === 'error').length
    };
  }, [claimItems]);

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
      <Sidebar user={user} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[22px] text-gray-600">menu</span>
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Klaim Paket Terdaftar</h2>
              <p className="text-[11px] text-gray-400 font-medium hidden sm:block">Bulk Claim System</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
              <span className="material-symbols-outlined text-[16px] text-gray-400">badge</span>
              <span className="text-xs font-semibold text-gray-600">NIA: {user.nia}</span>
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Panel */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]" style={FILL}>format_list_bulleted</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Input AWB (Bulk)</h3>
                    <p className="text-xs text-gray-500">Pisahkan dengan baris baru (Enter)</p>
                  </div>
                </div>

                <textarea
                  className="w-full flex-1 min-h-[240px] p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none resize-none transition-all placeholder:font-sans"
                  placeholder="Contoh:&#10;10008888000123&#10;10008888000124&#10;AWB-12345"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-400">
                    {inputText.split('\n').filter(l => l.trim().length > 0).length} baris terdeteksi
                  </span>
                  <button
                    onClick={handleParseInput}
                    disabled={inputText.trim().length === 0}
                    className="h-10 px-5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">filter_alt</span>
                    Validasi & Filter Duplikat
                  </button>
                </div>
              </div>

              {/* Action & Result Panel */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100">
                      <span className="material-symbols-outlined text-[20px]" style={FILL}>fact_check</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Daftar Klaim ({stats.total})</h3>
                      <p className="text-xs text-gray-500">Antrian yang siap dieksekusi</p>
                    </div>
                  </div>
                  
                  {stats.total > 0 && (
                    <button
                      onClick={handleClaimAll}
                      disabled={isProcessing || stats.pending === 0}
                      className="h-10 px-5 bg-primary hover:bg-primary-light text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-colors flex items-center gap-2 shadow-md shadow-primary/10"
                    >
                      {isProcessing ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">send</span>
                      )}
                      {isProcessing ? 'Memproses...' : 'Proses Klaim'}
                    </button>
                  )}
                </div>

                {claimItems.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl p-8 text-center text-gray-400">
                    <span className="material-symbols-outlined text-[48px] mb-2 text-gray-200">checklist</span>
                    <p className="font-semibold text-sm">Belum ada AWB tervalidasi</p>
                    <p className="text-[11px] mt-1">Masukkan list AWB lalu tekan "Validasi"</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase">Menunggu</span>
                        <span className="font-bold text-gray-900">{stats.pending}</span>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded-lg text-center border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-600 block uppercase">Sukses</span>
                        <span className="font-bold text-emerald-700">{stats.success}</span>
                      </div>
                      <div className="bg-rose-50 p-2 rounded-lg text-center border border-rose-100">
                        <span className="text-[10px] font-bold text-rose-600 block uppercase">Gagal</span>
                        <span className="font-bold text-rose-700">{stats.error}</span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[300px] border border-gray-100 rounded-xl divide-y divide-gray-50">
                      {claimItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50/50 transition-colors">
                          <span className="font-mono text-xs font-semibold text-gray-800">{item.awb}</span>
                          <div className="flex items-center gap-2">
                            {item.status === 'success' && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                <span className="material-symbols-outlined text-[12px]" style={FILL}>check_circle</span>
                                SUKSES
                              </span>
                            )}
                            {item.status === 'error' && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100" title={item.message}>
                                <span className="material-symbols-outlined text-[12px]" style={FILL}>error</span>
                                GAGAL
                              </span>
                            )}
                            {item.status === 'pending' && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                                <span className="material-symbols-outlined text-[12px]">schedule</span>
                                PENDING
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
