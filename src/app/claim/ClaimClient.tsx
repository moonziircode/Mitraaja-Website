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
  taskCode?: string;
  trackingCode?: string | number;
  finalStatus?: string;
  finalResult?: string;
}

const FILL = { fontVariationSettings: "'FILL' 1" } as const;

export default function ClaimClient({ user }: { user: User }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [inputText, setInputText] = useState('');
  const [claimItems, setClaimItems] = useState<ClaimItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse input into unique valid AWBs (strictly 14 digits)
  const handleParseInput = () => {
    const rawLines = inputText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Duplicate detection and strict 14-digit validation
    const uniqueAwbs = new Set<string>();
    const newItems: ClaimItem[] = [];

    rawLines.forEach(awb => {
      // Must be exactly 14 digits
      const isValidFormat = /^[0-9]{14}$/.test(awb);
      if (!uniqueAwbs.has(awb)) {
        uniqueAwbs.add(awb);
        if (isValidFormat) {
          newItems.push({ awb, status: 'pending' });
        } else {
          newItems.push({
            awb,
            status: 'error',
            message: 'Format tidak valid (harus tepat 14 digit angka numerik).',
          });
        }
      }
    });

    setClaimItems(newItems);
  };

  const handleClaimAll = async () => {
    const pendingOrders = claimItems.filter(item => item.status === 'pending');
    if (pendingOrders.length === 0) return;
    setIsProcessing(true);

    try {
      const ordersToClaim = pendingOrders.map(item => ({ claim_key: item.awb }));
      
      const res = await fetch('/api/parcels/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: ordersToClaim })
      });
      
      const data = await res.json();
      
      if (data.success && Array.isArray(data.results)) {
        // Map the results back to claimItems
        const resultItems = claimItems.map(item => {
          const match = data.results.find((o: any) => o.awb === item.awb);
          if (match) {
            return {
              ...item,
              status: match.success ? ('success' as const) : ('error' as const),
              message: match.claim_message,
              taskCode: match.task_code,
              trackingCode: match.tracking_code,
              finalStatus: match.final_task_status,
              finalResult: match.final_result,
            };
          }
          return item;
        });
        setClaimItems(resultItems);
      } else {
        // Entire request failed
        setClaimItems(prev => prev.map(item => {
          if (item.status === 'pending') {
            return {
              ...item,
              status: 'error',
              message: data.message || 'Request failed',
            };
          }
          return item;
        }));
      }
    } catch {
      setClaimItems(prev => prev.map(item => {
        if (item.status === 'pending') {
          return {
            ...item,
            status: 'error',
            message: 'Koneksi terputus',
          };
        }
        return item;
      }));
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
      <Sidebar user={user} isOpen={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 shrink-0 relative overflow-hidden">
          <svg className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,0 C40,40 60,-20 100,20 L100,0 L0,0 Z" fill="var(--color-primary)"></path>
          </svg>
          <div className="flex items-center gap-4 relative z-10">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[22px] text-text-primary">menu</span>
            </button>
            <div>
              <h2 className="text-lg font-bold text-text-primary tracking-tight">Klaim Paket Terdaftar</h2>
              <p className="text-[11px] text-text-secondary font-medium hidden sm:block">Bulk Claim System</p>
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Panel */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col relative overflow-hidden">
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]" style={FILL}>format_list_bulleted</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary text-sm">Input AWB (Bulk)</h3>
                    <p className="text-xs text-text-secondary">Pisahkan dengan baris baru (Enter)</p>
                  </div>
                </div>

                <textarea
                  className="w-full flex-1 min-h-[240px] p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-text-primary focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 outline-none resize-none transition-all placeholder:font-sans relative z-10"
                  placeholder="Contoh:&#10;10008888000123&#10;10008888000124&#10;AWB-12345"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />

                <div className="mt-4 flex items-center justify-between relative z-10">
                  <span className="text-xs font-medium text-text-secondary">
                    {inputText.split('\n').filter(l => l.trim().length > 0).length} baris terdeteksi
                  </span>
                  <button
                    onClick={handleParseInput}
                    disabled={inputText.trim().length === 0}
                    className="h-10 px-5 bg-text-primary hover:bg-black text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">filter_alt</span>
                    Validasi & Filter Duplikat
                  </button>
                </div>
              </div>

              {/* Action & Result Panel */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col relative overflow-hidden">
                <svg className="absolute bottom-0 right-0 w-full h-full opacity-5 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0,100 C40,60 60,120 100,80 L100,100 L0,100 Z" fill="var(--color-secondary)"></path>
                </svg>

                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-primary border border-gray-100">
                      <span className="material-symbols-outlined text-[20px]" style={FILL}>fact_check</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary text-sm">Daftar Klaim ({stats.total})</h3>
                      <p className="text-xs text-text-secondary">Antrian yang siap dieksekusi</p>
                    </div>
                  </div>
                  
                  {stats.total > 0 && (
                    <button
                      onClick={handleClaimAll}
                      disabled={isProcessing || stats.pending === 0}
                      className="h-10 px-5 bg-primary hover:bg-primary-light text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-colors flex items-center gap-2 shadow-md shadow-primary/20"
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
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-text-secondary relative z-10">
                    <span className="material-symbols-outlined text-[48px] mb-2 text-gray-300">checklist</span>
                    <p className="font-bold text-sm text-text-primary">Belum ada AWB tervalidasi</p>
                    <p className="text-xs mt-1">Masukkan list AWB lalu tekan "Validasi"</p>
                  </div>
                ) : (
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                        <span className="text-[10px] font-bold text-text-secondary block uppercase">Menunggu</span>
                        <span className="font-bold text-text-primary">{stats.pending}</span>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded-lg text-center border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-600 block uppercase">Sukses</span>
                        <span className="font-bold text-emerald-700">{stats.success}</span>
                      </div>
                      <div className="bg-primary-light/10 p-2 rounded-lg text-center border border-primary-light/20">
                        <span className="text-[10px] font-bold text-primary block uppercase">Gagal</span>
                        <span className="font-bold text-primary-dark">{stats.error}</span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[300px] border border-gray-100 rounded-xl divide-y divide-gray-50">
                      {claimItems.map((item, idx) => (
                        <div key={idx} className="p-3 hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-semibold text-text-primary">{item.awb}</span>
                            <div className="flex items-center gap-2">
                              {item.status === 'success' && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                  <span className="material-symbols-outlined text-[12px]" style={FILL}>check_circle</span>
                                  SUKSES
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary-light/10 px-2 py-0.5 rounded-full border border-primary-light/20">
                                  <span className="material-symbols-outlined text-[12px]" style={FILL}>error</span>
                                  GAGAL
                                </span>
                              )}
                              {item.status === 'pending' && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-text-secondary bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                                  PENDING
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Extra info for success or failure */}
                          {item.status === 'success' && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[9px] text-emerald-700">
                              <span className="bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-mono">
                                Task: {item.taskCode || 'OK'}
                              </span>
                              <span className="bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-mono">
                                Tracking 201
                              </span>
                              <span className="bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                                {item.finalStatus || 'WAITING_FOR_HANDOVER_SERAH'}
                              </span>
                            </div>
                          )}

                          {item.status === 'error' && item.message && (
                            <p className="mt-1 text-[10px] text-primary bg-primary/5 px-2 py-1 rounded">
                              {item.message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
