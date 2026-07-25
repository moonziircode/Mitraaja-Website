'use client';

import { useState, useMemo, useEffect, useRef, useCallback, type FormEvent } from 'react';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
  const router = useRouter();
  // ── Scan State ──
  const [awbValue, setAwbValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── UI State ──
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // ── Draft Check ──
  useEffect(() => {
    try {
      const draft = localStorage.getItem('mitraaja_draft_order');
      if (draft) setHasDraft(true);
    } catch {
      // ignore
    }
  }, []);

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

  // ── Scroll and Focus Scanner ──
  const handleScrollToScan = () => {
    const scannerElement = document.getElementById('scanner-card');
    if (scannerElement) {
      scannerElement.scrollIntoView({ behavior: 'smooth' });
    }
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 500);
  };

  // ── Perform Claim Action ──
  const performClaim = useCallback(
    async (awbToClaim: string) => {
      const trimmed = awbToClaim.trim();
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
    [isScanning]
  );

  // ── Form Handler ──
  const handleScanSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      performClaim(awbValue);
    },
    [awbValue, performClaim]
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
      <Sidebar user={user} isOpen={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen min-w-0">
        {/* Top Header */}
        <header className="h-[60px] md:h-[76px] bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-20 flex items-center justify-between px-4 md:px-10 shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-gray-600">menu</span>
            </button>
            <div>
              <h2 className="text-[17px] md:text-xl font-extrabold text-text-primary tracking-tight">Hai, {user.name} 👋</h2>
              <p className="text-[11px] md:text-[12px] text-text-secondary font-medium hidden sm:block mt-0.5">{currentDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors relative"
                title="Notifikasi"
              >
                <span className="material-symbols-outlined text-[18px] md:text-[20px]">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white"></span>
              </button>

              {isNotificationOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsNotificationOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-[320px] bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 z-50 overflow-hidden animate-fade-in-up">
                    <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                      <h3 className="font-extrabold text-gray-900 tracking-tight">Notifikasi Terbaru</h3>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto">
                      <div className="p-4 hover:bg-gray-50/80 transition-colors cursor-pointer border-b border-gray-50 group">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-primary text-[20px]">campaign</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 mb-1 leading-snug">📢 Informasi Update Aplikasi MAA</h4>
                            <div className="text-[12px] text-gray-600 leading-relaxed font-medium">
                              Halo, Pengusaha Anteraja!<br/><br/>
                              Diinformasikan bahwa hari ini akan dilakukan update aplikasi MAA. Mohon dipastikan aplikasi dapat segera diperbarui ke versi terbaru setelah update tersedia. Apabila mengalami kendala segera infokan kepada Tim Pengusaha Anteraja.<br/><br/>
                              Terima kasih<br/><br/>
                              Salam, Anteraja
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 font-bold">17 Juli 2026</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 text-center border-t border-gray-50 bg-gray-50/30">
                      <button className="text-xs font-bold text-primary hover:text-primary-light transition-colors">Lihat semua notifikasi</button>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="w-px h-6 md:h-8 bg-gray-200 hidden md:block" />

            <div className="flex items-center gap-2 md:gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-text-primary">{user.name}</p>
                <p className="text-[11px] text-text-secondary font-medium">Admin</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm">
                {user.name.charAt(0)}
              </div>
              <span className="material-symbols-outlined text-gray-400 text-[18px] md:text-[20px] hidden md:block">expand_more</span>
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-8">
          
            {/* Draft Alert / Hero Banner */}
            {hasDraft && (
              <div className="relative w-full h-[140px] md:h-[220px] lg:h-[250px] rounded-[16px] md:rounded-[20px] overflow-hidden shadow-sm animate-fade-in-up bg-white group border border-gray-100">
                <Image 
                  src="/Banner_Order_Tertunda.png"
                  alt="Draft Order"
                  fill
                  className="object-cover object-right group-hover:scale-105 transition-transform duration-700"
                  priority
                />
                {/* Overlay gradient putih di kiri (sekitar 40-50%) yang memudar ke transparan di kanan */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/95 from-35% via-white/70 via-50% to-transparent to-70% flex flex-col justify-center px-4 md:px-[40px] lg:px-[48px]">
                  <div className="flex items-center gap-1.5 md:gap-3 mb-1 md:mb-2">
                    <div className="w-6 h-6 md:w-10 md:h-10 bg-secondary/20 text-secondary rounded-lg md:rounded-xl flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-[14px] md:text-[20px] text-secondary" style={FILL}>assignment_returned</span>
                    </div>
                    <h3 className="font-extrabold text-gray-900 text-[14px] md:text-2xl tracking-tight">Ada Draft Order Tertunda</h3>
                  </div>
                  <p className="text-[9px] md:text-sm text-gray-700 font-medium max-w-[200px] md:max-w-md mb-2 md:mb-5 leading-snug md:leading-relaxed">Anda memiliki order yang belum selesai. Lanjutkan prosesnya sekarang.</p>
                  <button
                    onClick={() => router.push('/orders/create')}
                    className="w-fit h-7 md:h-10 px-3 md:px-6 bg-secondary hover:bg-yellow-400 text-text-primary font-bold text-[10px] md:text-sm rounded-full transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center gap-1 md:gap-2"
                  >
                    Lanjutkan <span className="material-symbols-outlined text-[12px] md:text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
              {/* Card 1: Create Order (Col Span 2) */}
              <div 
                onClick={() => router.push('/orders/create')}
                className="col-span-2 md:col-span-2 bg-primary rounded-[16px] md:rounded-[20px] p-3 md:p-6 text-white shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden group"
              >
                {/* SVG Curve Background */}
                <svg className="absolute bottom-0 right-0 w-full h-full opacity-20 pointer-events-none transition-transform duration-700 group-hover:scale-110" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0,100 C40,50 60,110 100,20 L100,100 L0,100 Z" fill="#ffffff"></path>
                </svg>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-40 transition-opacity duration-300 group-hover:translate-x-2">
                   <span className="material-symbols-outlined text-[60px] md:text-[80px]">local_shipping</span>
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center mb-2 md:mb-6">
                    <span className="material-symbols-outlined text-white text-[16px] md:text-[24px]">add</span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[13px] md:text-lg tracking-tight mb-0.5 md:mb-1">Buat Order</h3>
                    <p className="text-[9px] md:text-xs text-white/90 font-medium">Hitung ongkir & cetak resi</p>
                  </div>
                  <div className="absolute bottom-3 right-3 md:bottom-6 md:right-6 w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[12px] md:text-[16px]">arrow_forward_ios</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Klaim Paket */}
              <div 
                onClick={handleScrollToScan}
                className="bg-white rounded-[12px] md:rounded-[20px] p-3 md:p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden group flex flex-col justify-between"
              >
                <div className="absolute -right-2 -bottom-2 md:-right-4 md:-bottom-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-500 text-gray-900">
                  <span className="material-symbols-outlined text-[60px] md:text-[100px]">qr_code_scanner</span>
                </div>
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-primary/10 border border-primary/5 flex items-center justify-center text-primary mb-2 md:mb-6">
                  <span className="material-symbols-outlined text-[16px] md:text-[24px]">qr_code_scanner</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-[11px] md:text-[15px] tracking-tight leading-tight">Klaim Paket</h3>
                  <p className="text-[9px] md:text-[11px] text-gray-500 font-medium mt-0.5 md:mt-1">Via scan AWB</p>
                </div>
              </div>

              {/* Card 3: Cek Ongkir */}
              <div 
                onClick={() => router.push('/rates/check')}
                className="bg-white rounded-[12px] md:rounded-[20px] p-3 md:p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden group flex flex-col justify-between"
              >
                <div className="absolute -right-2 -bottom-2 md:-right-4 md:-bottom-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-500 text-gray-900">
                  <span className="material-symbols-outlined text-[60px] md:text-[100px]">calculate</span>
                </div>
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-primary/10 border border-primary/5 flex items-center justify-center text-primary mb-2 md:mb-6">
                  <span className="material-symbols-outlined text-[16px] md:text-[24px]">calculate</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-[11px] md:text-[15px] tracking-tight leading-tight">Cek Ongkir</h3>
                  <p className="text-[9px] md:text-[11px] text-gray-500 font-medium mt-0.5 md:mt-1">Kalkulator tarif</p>
                </div>
              </div>

              {/* Card 4: Lacak Resi */}
              <div 
                onClick={() => router.push('/tracking')}
                className="bg-white rounded-[12px] md:rounded-[20px] p-3 md:p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden group flex flex-col justify-between"
              >
                <div className="absolute -right-2 -bottom-2 md:-right-4 md:-bottom-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-500 text-gray-900">
                  <span className="material-symbols-outlined text-[60px] md:text-[100px]">location_on</span>
                </div>
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-primary/10 border border-primary/5 flex items-center justify-center text-primary mb-2 md:mb-6">
                  <span className="material-symbols-outlined text-[16px] md:text-[24px]">location_on</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-[11px] md:text-[15px] tracking-tight leading-tight">Lacak Resi</h3>
                  <p className="text-[9px] md:text-[11px] text-gray-500 font-medium mt-0.5 md:mt-1">Status paket</p>
                </div>
              </div>
            </div>
            
            {/* Stats Dashboard */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-[12px] md:rounded-[20px] border border-gray-100 shadow-sm p-3 md:p-5 relative overflow-hidden group hover:border-gray-200 transition-colors">
                <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                  <span className="material-symbols-outlined text-[80px] md:text-[120px]">inventory_2</span>
                </div>
                <div className="flex items-center justify-between relative z-10 h-full">
                  <div className="flex flex-col justify-center h-full">
                    <p className="text-[8px] md:text-[10px] text-gray-400 font-bold mb-0.5 md:mb-1 uppercase tracking-wider">Total</p>
                    <p className="text-lg md:text-3xl font-extrabold text-gray-900 tracking-tight leading-none">{stats.total}</p>
                    <p className="text-[8px] md:text-[11px] text-gray-500 font-medium mt-1 hidden md:block">Paket discan</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[16px] md:text-[24px]" style={FILL}>inventory_2</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-emerald-50/30 rounded-[12px] md:rounded-[20px] border border-gray-100 shadow-sm p-3 md:p-5 relative overflow-hidden group hover:border-gray-200 transition-colors">
                <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                  <span className="material-symbols-outlined text-[80px] md:text-[120px]">check_circle</span>
                </div>
                <div className="flex items-center justify-between relative z-10 h-full">
                  <div className="flex flex-col justify-center h-full">
                    <p className="text-[8px] md:text-[10px] text-gray-400 font-bold mb-0.5 md:mb-1 uppercase tracking-wider">Berhasil</p>
                    <p className="text-lg md:text-3xl font-extrabold text-emerald-600 tracking-tight leading-none">{stats.success}</p>
                    <p className="text-[8px] md:text-[11px] text-gray-500 font-medium mt-1 hidden md:block">Paket berhasil</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-emerald-600 text-[16px] md:text-[24px]" style={FILL}>check_circle</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-rose-50/30 rounded-[12px] md:rounded-[20px] border border-gray-100 shadow-sm p-3 md:p-5 relative overflow-hidden group hover:border-gray-200 transition-colors">
                <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                  <span className="material-symbols-outlined text-[80px] md:text-[120px]">cancel</span>
                </div>
                <div className="flex items-center justify-between relative z-10 h-full">
                  <div className="flex flex-col justify-center h-full">
                    <p className="text-[8px] md:text-[10px] text-gray-400 font-bold mb-0.5 md:mb-1 uppercase tracking-wider">Gagal</p>
                    <p className="text-lg md:text-3xl font-extrabold text-rose-600 tracking-tight leading-none">{stats.error}</p>
                    <p className="text-[8px] md:text-[11px] text-gray-500 font-medium mt-1 hidden md:block">Paket gagal</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-rose-600 text-[16px] md:text-[24px]" style={FILL}>cancel</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scan and History Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              
              {/* Scanner Card */}
              <div id="scanner-card" className="bg-white rounded-[16px] md:rounded-[24px] border border-gray-100 shadow-sm overflow-hidden scroll-mt-6 flex flex-col">
                <div className="px-4 py-3 md:px-6 md:py-5 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[16px] md:text-[20px]" style={FILL}>qr_code_scanner</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-[13px] md:text-[16px] leading-tight">Scan & Claim</h3>
                      <p className="text-[9px] md:text-[11px] text-gray-500 font-medium mt-0 md:mt-0.5 hidden sm:block">Arahkan scanner atau ketik nomor resi di bawah</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[11px] font-bold px-2.5 py-1 md:px-3 md:py-1.5 rounded-full ${isFocused ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0 ${isFocused ? 'bg-emerald-500 animate-pulse-ring' : 'bg-gray-300'}`} />
                    {isFocused ? 'Scanner Aktif' : 'Standby'}
                  </div>
                </div>

                {/* Input Field */}
                <div className="p-4 md:p-8 flex-1 flex flex-col justify-center">
                  <form onSubmit={handleScanSubmit}>
                    <div className="relative group">
                      <span className={`material-symbols-outlined absolute left-3 md:left-5 top-1/2 -translate-y-1/2 transition-colors ${isFocused ? 'text-primary' : 'text-gray-400'} text-[18px] md:text-[24px]`}>barcode_scanner</span>
                      <input
                        ref={inputRef}
                        autoFocus
                        className="w-full h-12 md:h-16 pl-10 md:pl-14 pr-24 md:pr-36 bg-gray-50 border-2 border-gray-100 rounded-[12px] md:rounded-[16px] text-sm md:text-lg font-mono font-bold text-gray-900 uppercase placeholder:text-gray-400 placeholder:normal-case placeholder:font-sans focus:border-primary/40 focus:ring-4 focus:ring-primary/10 focus:bg-white transition-all outline-none"
                        placeholder="Scan / Ketik resi..."
                        value={awbValue}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setAwbValue(val);
                          if (val.trim().length === 14) {
                            performClaim(val);
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData.getData('text').trim().toUpperCase();
                          if (pasted) {
                            setAwbValue(pasted);
                            performClaim(pasted);
                          }
                        }}
                        disabled={isScanning}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        type="submit"
                        disabled={!awbValue.trim() || isScanning}
                        className="absolute right-1.5 md:right-2.5 top-1/2 -translate-y-1/2 h-9 md:h-11 px-3 md:px-6 bg-primary text-white rounded-lg md:rounded-xl font-bold text-xs md:text-sm hover:bg-primary-light active:scale-[0.97] transition-all disabled:opacity-40 flex items-center gap-1 md:gap-2 shadow-sm"
                      >
                        {isScanning ? (
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <span className="material-symbols-outlined text-[16px] md:text-[20px]">send</span>
                        )}
                        <span className="hidden sm:inline">Klaim</span>
                      </button>
                    </div>
                    <p className="text-[9px] md:text-[11px] text-gray-500 font-medium mt-3 md:mt-4 flex items-center gap-1.5 justify-center">
                       <span className="material-symbols-outlined text-[12px] md:text-[14px]">info</span>
                       Pastikan kursor di kotak ini saat memakai scanner.
                    </p>
                  </form>
                </div>
                
                {/* Feedback State */}
                {scanResult && (
                  <div className="px-4 md:px-8 pb-4 md:pb-8 animate-fade-in-up">
                    {scanResult.status === 'searching' && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 md:p-5 flex items-center gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-800 text-xs md:text-sm">Memproses Claim...</h4>
                          <p className="text-xs md:text-sm font-mono text-blue-600 mt-0.5">{scanResult.awb}</p>
                        </div>
                      </div>
                    )}

                    {scanResult.status === 'success' && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 md:p-5">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-11 md:h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-emerald-600 text-lg md:text-2xl" style={FILL}>check_circle</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-emerald-800 text-[13px] md:text-[15px]">Klaim Sukses</h4>
                              <span className="text-[9px] md:text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Berhasil</span>
                            </div>
                            <p className="text-xs md:text-sm font-mono font-semibold text-emerald-700 mb-2 md:mb-3">{scanResult.awb}</p>
                            <div className="grid grid-cols-3 gap-2 md:gap-3">
                              <div>
                                <span className="text-[9px] md:text-[10px] font-semibold text-emerald-600/60 uppercase tracking-wider">Pengirim</span>
                                <p className="text-[10px] md:text-xs font-semibold text-emerald-800 truncate">{scanResult.shipperName}</p>
                              </div>
                              <div>
                                <span className="text-[9px] md:text-[10px] font-semibold text-emerald-600/60 uppercase tracking-wider">Penerima</span>
                                <p className="text-[10px] md:text-xs font-semibold text-emerald-800 truncate">{scanResult.receiverName}</p>
                              </div>
                              <div>
                                <span className="text-[9px] md:text-[10px] font-semibold text-emerald-600/60 uppercase tracking-wider">Tujuan</span>
                                <p className="text-[10px] md:text-xs font-semibold text-emerald-800 truncate">{scanResult.destinationCity}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {scanResult.status === 'error' && (
                      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 md:p-5">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-11 md:h-11 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-rose-600 text-lg md:text-2xl" style={FILL}>cancel</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-rose-800 text-[13px] md:text-[15px] mb-1">Klaim Gagal</h4>
                            <p className="text-xs md:text-sm font-mono font-semibold text-rose-700 mb-2">{scanResult.awb}</p>
                            <p className="text-[10px] md:text-xs text-rose-700 bg-rose-100/60 p-2 md:p-3 rounded-lg">{scanResult.message}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Scan History Table */}
              <div className="bg-white rounded-[16px] md:rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[280px] md:h-[400px]">
                <div className="px-4 py-3 md:px-6 md:py-5 border-b border-gray-50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gray-50 flex items-center justify-center">
                       <span className="material-symbols-outlined text-gray-500 text-[16px] md:text-[20px]">history</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-[13px] md:text-[16px] leading-tight">Riwayat Sesi</h3>
                      <p className="text-[9px] md:text-[11px] text-gray-500 font-medium mt-0 md:mt-0.5">{history.length} Scan Terdaftar</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 md:gap-2">
                    {history.length > 0 && (
                      <>
                        <button
                          onClick={downloadCSV}
                          className="h-7 md:h-8 px-2.5 md:px-3 text-[10px] md:text-[11px] font-bold text-gray-500 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors flex items-center gap-1 md:gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[14px] md:text-[15px]">download</span>
                          <span className="hidden sm:inline">CSV</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Hapus seluruh riwayat scan?')) setHistory([]);
                          }}
                          className="h-7 md:h-8 px-2 md:px-3 text-[10px] md:text-[11px] font-bold text-gray-500 bg-gray-50 rounded-lg border border-gray-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-colors flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-[14px] md:text-[15px]">delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto overflow-y-auto">
                  {history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 md:p-8 text-center bg-gray-50/30">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
                        <span className="material-symbols-outlined text-3xl md:text-4xl text-gray-300">inventory_2</span>
                      </div>
                      <h4 className="text-xs md:text-sm font-bold text-gray-700 mb-1">Belum ada data sesi</h4>
                      <p className="text-[10px] md:text-xs text-gray-400 font-medium max-w-[180px] md:max-w-[200px] mb-4 md:mb-6 leading-relaxed">Mulai scan paket untuk melihat riwayat di sini.</p>
                      <button 
                        onClick={handleScrollToScan}
                        className="h-8 md:h-9 px-4 md:px-5 bg-white border border-gray-200 shadow-sm text-gray-600 font-bold text-[10px] md:text-xs rounded-full hover:border-gray-300 hover:text-gray-800 transition-colors"
                      >
                        Mulai Scan
                      </button>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-50/95 backdrop-blur-sm">
                          <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider w-8 md:w-10">No</th>
                          <th className="px-3 py-2 md:px-4 md:py-3 text-left text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">AWB</th>
                          <th className="px-3 py-2 md:px-4 md:py-3 text-left text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tujuan</th>
                          <th className="px-3 py-2 md:px-4 md:py-3 text-left text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {history.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-3 py-2.5 md:px-6 md:py-4 text-[10px] md:text-xs text-gray-400 font-mono">{idx + 1}</td>
                            <td className="px-3 py-2.5 md:px-4 md:py-4 text-[10px] md:text-xs font-mono font-bold text-gray-800">{item.awb}</td>
                            <td className="px-3 py-2.5 md:px-4 md:py-4 text-[10px] md:text-xs font-medium text-gray-600 truncate max-w-[80px] md:max-w-[120px]">{item.destinationCity}</td>
                            <td className="px-3 py-2.5 md:px-4 md:py-4">
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full text-[9px] md:text-[10px] font-bold ${
                                  item.status === 'success'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <span className="hidden sm:inline">{item.status === 'success' ? 'SUKSES' : 'GAGAL'}</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Activity Summary & Promo Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 pb-4 md:pb-6">
              
              {/* Activity Chart */}
              <div className="bg-white rounded-[16px] md:rounded-[24px] border border-gray-100 shadow-sm p-4 md:p-8">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <div>
                     <h3 className="font-bold text-gray-900 text-[13px] md:text-[16px]">Ringkasan Aktivitas</h3>
                     <p className="text-[9px] md:text-[11px] text-gray-500 font-medium mt-0 md:mt-0.5">Statistik sesi saat ini</p>
                  </div>
                  <select className="text-[10px] md:text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 md:px-3 md:py-1.5 font-semibold text-gray-600 outline-none focus:border-primary/50">
                    <option>Sesi Saat Ini</option>
                  </select>
                </div>
                
                <div className="flex items-end h-28 md:h-40 gap-4 md:gap-8 mt-4 md:mt-6 border-b border-gray-100 pb-2 px-2 md:px-4">
                  <div className="flex-1 flex flex-col justify-end items-center group h-full">
                    <div className="w-full max-w-[40px] md:max-w-[60px] bg-primary/20 group-hover:bg-primary/40 rounded-t-lg md:rounded-t-xl transition-all duration-500 ease-out" style={{ height: `${Math.max((stats.total / (Math.max(stats.total, 1))) * 100, 5)}%` }}></div>
                    <span className="text-[9px] md:text-[11px] font-bold text-gray-600 mt-2 md:mt-3">Total</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-end items-center group h-full">
                    <div className="w-full max-w-[40px] md:max-w-[60px] bg-emerald-200 group-hover:bg-emerald-300 rounded-t-lg md:rounded-t-xl transition-all duration-500 ease-out" style={{ height: `${Math.max((stats.success / (Math.max(stats.total, 1))) * 100, 5)}%` }}></div>
                    <span className="text-[9px] md:text-[11px] font-bold text-gray-600 mt-2 md:mt-3">Berhasil</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-end items-center group h-full">
                    <div className="w-full max-w-[40px] md:max-w-[60px] bg-rose-200 group-hover:bg-rose-300 rounded-t-lg md:rounded-t-xl transition-all duration-500 ease-out" style={{ height: `${Math.max((stats.error / (Math.max(stats.total, 1))) * 100, 5)}%` }}></div>
                    <span className="text-[9px] md:text-[11px] font-bold text-gray-600 mt-2 md:mt-3">Gagal</span>
                  </div>
                </div>
              </div>

              {/* Promo Banner */}
              <div className="relative w-full h-[140px] md:h-auto md:min-h-[200px] rounded-[16px] md:rounded-[24px] overflow-hidden shadow-sm group border border-gray-100 bg-white">
                <Image 
                  src="/Banner_Kirim_Paket.jpeg"
                  alt="Kirim Paket Promosi"
                  fill
                  className="object-cover object-right group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent flex flex-col justify-center px-4 md:px-10">
                  <h3 className="font-extrabold text-primary text-lg md:text-2xl mb-1 md:mb-2 tracking-tight">Kirim Paket?</h3>
                  <p className="text-[9px] md:text-xs text-gray-700 font-bold max-w-[160px] md:max-w-[220px] mb-3 md:mb-5 leading-relaxed">Nikmati layanan Anteraja yang cepat, aman, dan terpercaya.</p>
                  <button
                    onClick={() => router.push('/orders/create')}
                    className="w-fit h-7 md:h-10 px-4 md:px-6 bg-primary hover:bg-primary-light text-white font-bold text-[10px] md:text-xs rounded-full transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    Buat Order &gt;
                  </button>
                </div>
              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
