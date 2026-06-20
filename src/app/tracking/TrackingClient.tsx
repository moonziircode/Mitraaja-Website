'use client';

import { useState, useCallback, type FormEvent } from 'react';
import Sidebar from '@/components/Sidebar';

interface User {
  name: string;
  nia: string;
}

interface TrackingEvent {
  opcode: number;
  status: string;
  time: string;
  detail: string;
  icon: string;
  color: string;
}

interface TrackingData {
  awb: string;
  status: string;
  service: string;
  weight: string;
  sender: string;
  receiver: string;
  destination: string;
  history: TrackingEvent[];
}

const FILL = { fontVariationSettings: "'FILL' 1" } as const;

export default function TrackingClient({ user }: { user: User }) {
  const [trackingAwb, setTrackingAwb] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackingResult, setTrackingResult] = useState<TrackingData | null>(null);
  const [trackingError, setTrackingError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleTrackingSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = trackingAwb.trim();
      if (!trimmed || isTracking) return;

      setIsTracking(true);
      setTrackingResult(null);
      setTrackingError('');

      try {
        const res = await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ awb: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Tracking gagal');
        setTrackingResult(data);
      } catch (err) {
        setTrackingError(err instanceof Error ? err.message : 'Gagal melacak resi.');
      } finally {
        setIsTracking(false);
      }
    },
    [trackingAwb, isTracking]
  );

  const quickTrack = (awb: string) => {
    setTrackingAwb(awb);
    setTrackingResult(null);
    setTrackingError('');
    setIsTracking(true);

    setTimeout(async () => {
      try {
        const res = await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ awb }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Tracking gagal');
        setTrackingResult(data);
      } catch (err) {
        setTrackingError(err instanceof Error ? err.message : 'Gagal melacak resi.');
      } finally {
        setIsTracking(false);
      }
    }, 50);
  };

  const getStatusDetails = (iconName: string) => {
    switch (iconName) {
      case 'check_circle':
        return { color: 'text-emerald-600', bgColor: 'bg-emerald-50' };
      case 'two_wheeler':
        return { color: 'text-blue-600', bgColor: 'bg-blue-50' };
      case 'storefront':
        return { color: 'text-indigo-600', bgColor: 'bg-indigo-50' };
      case 'flight_takeoff':
        return { color: 'text-sky-600', bgColor: 'bg-sky-50' };
      case 'warehouse':
        return { color: 'text-violet-600', bgColor: 'bg-violet-50' };
      default:
        return { color: 'text-gray-500', bgColor: 'bg-gray-50' };
    }
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
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Lacak Paket Real-Time</h2>
              <p className="text-[11px] text-gray-400 font-medium hidden sm:block">{currentDate}</p>
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
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Tracking Search Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600 text-[20px]" style={FILL}>location_on</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-[15px]">Pencarian Resi Anteraja</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Dapatkan detail tracking AWB secara instan</p>
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={handleTrackingSubmit} className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                    <input
                      className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 uppercase placeholder:text-gray-400 placeholder:normal-case focus:border-blue-200 focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all outline-none disabled:opacity-50"
                      placeholder="Masukkan nomor resi AWB..."
                      value={trackingAwb}
                      onChange={(e) => setTrackingAwb(e.target.value.toUpperCase())}
                      disabled={isTracking}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!trackingAwb.trim() || isTracking}
                    className="h-12 px-5 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 active:scale-[0.97] transition-all disabled:opacity-40 flex items-center gap-2 shrink-0"
                  >
                    {isTracking ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">travel_explore</span>
                    )}
                    <span>Lacak</span>
                  </button>
                </form>

                <button
                  onClick={() => quickTrack('11003838770507')}
                  className="mt-3 text-[11px] text-primary hover:text-primary-light font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[13px]">play_circle</span>
                  Coba lacak nomor tes: 11003838770507
                </button>
              </div>
            </div>

            {/* Error Message */}
            {trackingError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 flex items-start gap-4 animate-fade-in-up">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-rose-600 text-xl" style={FILL}>error</span>
                </div>
                <div>
                  <h4 className="font-bold text-rose-800 text-sm mb-1">Paket Tidak Ditemukan</h4>
                  <p className="text-sm text-rose-700">{trackingError}</p>
                </div>
              </div>
            )}

            {/* Tracking Result Details */}
            {trackingResult && (
              <div className="space-y-6 animate-fade-in-up">
                
                {/* Info Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nomor Resi (AWB)</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <h3 className="text-xl font-bold font-mono text-gray-900 tracking-wide">{trackingResult.awb}</h3>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(trackingResult.awb);
                            alert('AWB disalin!');
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                          title="Salin AWB"
                        >
                          <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        </button>
                        <button
                          onClick={() => quickTrack(trackingResult.awb)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Cek Ulang"
                        >
                          <span className="material-symbols-outlined text-[16px]">refresh</span>
                        </button>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                      <span className="material-symbols-outlined text-[14px]" style={FILL}>check_circle</span>
                      {trackingResult.status}
                    </span>
                  </div>

                  <div className="h-px bg-gray-100 my-4" />

                  <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Layanan</span>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{trackingResult.service}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Berat</span>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{trackingResult.weight}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pengirim</span>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-gray-400">person</span>
                        {trackingResult.sender}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Penerima</span>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-gray-400">person_pin</span>
                        {trackingResult.receiver}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kota Tujuan</span>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{trackingResult.destination}</p>
                    </div>
                  </div>
                </div>

                {/* Timeline Journey */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-500 text-[20px]">timeline</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-[15px]">Riwayat Perjalanan Paket</h3>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="relative">
                      {/* Vertical Line */}
                      <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-gray-100 rounded-full" />

                      <div className="space-y-6">
                        {trackingResult.history.map((event, idx) => {
                          const isFirst = idx === 0;
                          const styles = getStatusDetails(event.icon);
                          return (
                            <div key={idx} className="relative flex gap-4">
                              {/* Dot / Icon */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                                isFirst
                                  ? `${styles.bgColor} shadow-md`
                                  : 'bg-white border-2 border-gray-200'
                              }`}>
                                <span className={`material-symbols-outlined text-[15px] ${isFirst ? styles.color : 'text-gray-400'}`} style={isFirst ? FILL : undefined}>
                                  {event.icon}
                                </span>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center justify-between gap-3 mb-0.5">
                                  <h4 className={`text-sm font-semibold truncate ${isFirst ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {event.status}
                                  </h4>
                                  <span className="text-[10px] font-mono text-gray-400 shrink-0">{event.time}</span>
                                </div>
                                <p className={`text-xs leading-relaxed ${isFirst ? 'text-gray-600' : 'text-gray-400'}`}>
                                  {event.detail}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Empty State */}
            {!trackingResult && !trackingError && !isTracking && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
                  <span className="material-symbols-outlined text-blue-400 text-[32px]">local_shipping</span>
                </div>
                <h4 className="text-base font-semibold text-gray-800 mb-2">Lacak Paket Anda</h4>
                <p className="text-xs text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                  Masukkan nomor AWB paket Anteraja di atas untuk memeriksa status perjalanannya secara mendetail.
                </p>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
