'use client';

import { useState, useMemo, useEffect, useRef, useCallback, type FormEvent } from 'react';
import Sidebar from '@/components/Sidebar';

interface User {
  name: string;
  nia: string;
}

interface HistoryItem {
  id: string;
  awb: string;
  shipperName: string;
  receiverName: string;
  destinationCity: string;
  status: 'success' | 'error';
  message: string;
  timestamp: number;
}

interface ScanResult {
  status: 'success' | 'error' | 'searching';
  awb: string;
  message: string;
  shipperName: string;
  receiverName: string;
  destinationCity: string;
}

const FILL = { fontVariationSettings: "'FILL' 1" } as const;
const HISTORY_KEY = 'mitraaja_scan_history';

export default function DashboardClient({ user }: { user: User }) {
  // ── Scan State ──
  const [awbValue, setAwbValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── UI State ──
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Load History from localStorage ──
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  // ── Persist History ──
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      /* noop */
    }
  }, [history]);

  // ── Scanner Focus Persistence ──
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.focus();
    const refocusHandler = () => {
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    document.addEventListener('click', refocusHandler);
    return () => document.removeEventListener('click', refocusHandler);
  }, []);

  // ── Computed Stats ──
  const stats = useMemo(() => {
    const total = history.length;
    const success = history.filter((h) => h.status === 'success').length;
    return { total, success, error: total - success };
  }, [history]);

  // ── Play Beep ──
  const playBeep = (success = true) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = success ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(success ? 1200 : 300, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (success ? 0.1 : 0.3));
    } catch (e) {
      console.log('Audio disabled', e);
    }
  };

  // ── Form Handler ──
  const handleScanSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = awbValue.trim();
      if (!trimmed || isScanning) return;

      setIsScanning(true);
      setScanResult({
        status: 'searching',
        awb: trimmed,
        message: 'Mencari & mengklaim...',
        shipperName: '-',
        receiverName: '-',
        destinationCity: '-',
      });

      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ awb: trimmed }),
        });
        const data = await res.json();
        const result: ScanResult = {
          status: data.status,
          awb: data.data?.awb || trimmed,
          message: data.message,
          shipperName: data.data?.shipperName || '-',
          receiverName: data.data?.receiverName || '-',
          destinationCity: data.data?.destinationCity || '-',
        };
        setScanResult(result);
        playBeep(result.status === 'success');

        setHistory((prev) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            awb: result.awb,
            shipperName: result.shipperName,
            receiverName: result.receiverName,
            destinationCity: result.destinationCity,
            status: result.status === 'success' ? 'success' : 'error',
            message: result.message,
            timestamp: Date.now(),
          },
          ...prev,
        ]);
      } catch {
        setScanResult({
          status: 'error',
          awb: trimmed,
          message: 'Gagal terhubung ke server.',
          shipperName: '-',
          receiverName: '-',
          destinationCity: '-',
        });
        playBeep(false);
      } finally {
        setIsScanning(false);
        setAwbValue('');
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [awbValue, isScanning]
  );

  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    return d.toLocaleString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleNewSession = () => {
    if (confirm('Mulai sesi baru? Riwayat scan saat ini akan dihapus.')) {
      setHistory([]);
      setScanResult(null);
      setAwbValue('');
    }
  };

  const downloadCSV = () => {
    if (history.length === 0) return;
    const header = 'No,AWB,Pengirim,Penerima,Kota Tujuan,Status,Pesan,Waktu';
    const rows = history.map(
      (h, i) =>
        `${i + 1},"${h.awb}","${h.shipperName}","${h.receiverName}","${h.destinationCity}","${h.status}","${h.message}","${new Date(
          h.timestamp
        ).toLocaleString('id-ID')}"`
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Konsol Operasional</h2>
              <p className="text-[11px] text-gray-400 font-medium hidden sm:block">{currentDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
              <span className="material-symbols-outlined text-[16px] text-gray-400">badge</span>
              <span className="text-xs font-semibold text-gray-600">NIA: {user.nia}</span>
            </div>
            <button
              onClick={handleNewSession}
              className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-[#b5000b] hover:bg-[#b5000b]/5 border border-gray-100 transition-colors"
              title="Sesi Baru"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span className="hidden sm:inline">Sesi Baru</span>
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Stats Dashboard */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-gray-400 font-semibold mb-1 uppercase tracking-wider">Total Scan</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-gray-400 text-[20px]" style={FILL}>inventory_2</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-gray-400 font-semibold mb-1 uppercase tracking-wider">Berhasil</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.success}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-500 text-[20px]" style={FILL}>check_circle</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-gray-400 font-semibold mb-1 uppercase tracking-wider">Gagal</p>
                    <p className="text-2xl font-bold text-rose-600">{stats.error}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-rose-500 text-[20px]" style={FILL}>cancel</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scanner Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#b5000b]/8 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#b5000b] text-[20px]" style={FILL}>qr_code_scanner</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-[15px]">Scan & Claim Paket</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Arahkan scanner atau ketik nomor resi di bawah</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 text-[11px] font-semibold ${isFocused ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isFocused ? 'bg-emerald-500 animate-pulse-ring' : 'bg-gray-300'}`} />
                  {isFocused ? 'Scanner Aktif' : 'Standby'}
                </div>
              </div>

              {/* Input Field */}
              <div className="p-6">
                <form onSubmit={handleScanSubmit}>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">barcode_scanner</span>
                    <input
                      ref={inputRef}
                      autoFocus
                      className="w-full h-14 pl-12 pr-32 bg-gray-50 border-2 border-gray-100 rounded-xl text-base font-mono font-semibold text-gray-900 uppercase placeholder:text-gray-300 placeholder:normal-case placeholder:font-sans focus:border-[#b5000b]/25 focus:ring-4 focus:ring-[#b5000b]/5 focus:bg-white transition-all outline-none"
                      placeholder="Masukkan atau scan resi AWB..."
                      value={awbValue}
                      onChange={(e) => setAwbValue(e.target.value.toUpperCase())}
                      disabled={isScanning}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="submit"
                      disabled={!awbValue.trim() || isScanning}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-5 bg-[#b5000b] text-white rounded-lg font-semibold text-sm hover:bg-[#9a0009] active:scale-[0.97] transition-all disabled:opacity-40 flex items-center gap-2"
                    >
                      {isScanning ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <span className="material-symbols-outlined text-[18px]">send</span>
                      )}
                      <span>Klaim</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Feedback State */}
              {scanResult && (
                <div className="px-6 pb-6 animate-fade-in-up">
                  {scanResult.status === 'searching' && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-800 text-sm">Memproses Claim...</h4>
                        <p className="text-sm font-mono text-blue-600 mt-0.5">{scanResult.awb}</p>
                      </div>
                    </div>
                  )}

                  {scanResult.status === 'success' && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-emerald-600 text-2xl" style={FILL}>check_circle</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-emerald-800 text-[15px]">Klaim Sukses</h4>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Berhasil</span>
                          </div>
                          <p className="text-sm font-mono font-semibold text-emerald-700 mb-3">{scanResult.awb}</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <span className="text-[10px] font-semibold text-emerald-600/60 uppercase tracking-wider">Pengirim</span>
                              <p className="text-xs font-semibold text-emerald-800 truncate">{scanResult.shipperName}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-emerald-600/60 uppercase tracking-wider">Penerima</span>
                              <p className="text-xs font-semibold text-emerald-800 truncate">{scanResult.receiverName}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-emerald-600/60 uppercase tracking-wider">Tujuan</span>
                              <p className="text-xs font-semibold text-emerald-800 truncate">{scanResult.destinationCity}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {scanResult.status === 'error' && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-rose-600 text-2xl" style={FILL}>cancel</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-rose-800 text-[15px] mb-1">Klaim Gagal</h4>
                          <p className="text-sm font-mono font-semibold text-rose-700 mb-2">{scanResult.awb}</p>
                          <p className="text-xs text-rose-700 bg-rose-100/60 p-3 rounded-lg">{scanResult.message}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scan History Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-[15px]">Riwayat Sesi</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">{history.length} Scan Terdaftar</p>
                </div>
                <div className="flex gap-2">
                  {history.length > 0 && (
                    <>
                      <button
                        onClick={downloadCSV}
                        className="h-8 px-3 text-[11px] font-semibold text-gray-500 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[15px]">download</span>
                        Ekspor CSV
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Hapus seluruh riwayat scan?')) setHistory([]);
                        }}
                        className="h-8 px-3 text-[11px] font-semibold text-gray-500 bg-gray-50 rounded-lg border border-gray-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                        Bersihkan
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50/95 backdrop-blur-sm">
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-10">No</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">No. Resi (AWB)</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pengirim</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tujuan</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Waktu</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">barcode_scanner</span>
                          <p className="text-sm text-gray-400 font-medium">Belum ada scan terdaftar</p>
                          <p className="text-[11px] text-gray-300 mt-1">Gunakan barcode scanner atau ketik manual resi</p>
                        </td>
                      </tr>
                    ) : (
                      history.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3.5 text-xs text-gray-400 font-mono">{idx + 1}</td>
                          <td className="px-4 py-3.5 text-sm font-mono font-semibold text-gray-800">{item.awb}</td>
                          <td className="px-4 py-3.5 text-xs font-medium text-gray-600">{item.shipperName}</td>
                          <td className="px-4 py-3.5 text-xs font-medium text-gray-600">
                            {item.receiverName && item.receiverName !== '-' && item.receiverName !== item.destinationCity ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900">{item.receiverName}</span>
                                <span className="text-[10px] text-gray-400 mt-0.5">{item.destinationCity}</span>
                              </div>
                            ) : (
                              item.destinationCity
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-mono text-gray-400">{formatTime(item.timestamp)}</td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === 'success'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {item.status === 'success' ? 'SUKSES' : 'GAGAL'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
