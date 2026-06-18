'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

interface User {
  name: string;
  nia: string;
}

const FILL = { fontVariationSettings: "'FILL' 1" } as const;

export default function SettingsClient({ user }: { user: User }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [beepOnSuccess, setBeepOnSuccess] = useState(true);
  const [beepOnFailure, setBeepOnFailure] = useState(true);
  const [autoClearInput, setAutoClearInput] = useState(true);

  const testBeep = (success: boolean) => {
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
      console.log('Audio Context error', e);
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
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Pengaturan &amp; Bantuan</h2>
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
          <div className="max-w-[760px] mx-auto space-y-6">
            
            {/* Scanner Preferences */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#b5000b] text-[20px]" style={FILL}>settings_input_hdmi</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Konfigurasi Barcode Scanner</h3>
                  <p className="text-[11px] text-gray-400">Atur preferensi hardware scanner Anda</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800">Suara Beep (Klaim Berhasil)</h4>
                    <p className="text-xs text-gray-400">Bunyikan nada tinggi saat paket sukses di-claim</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => testBeep(true)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                    >
                      Tes Nada
                    </button>
                    <input
                      type="checkbox"
                      checked={beepOnSuccess}
                      onChange={(e) => setBeepOnSuccess(e.target.checked)}
                      className="w-9 h-5 rounded-full bg-gray-200 border-none cursor-pointer focus:ring-0 focus:ring-offset-0 checked:bg-[#b5000b] transition-all accent-[#b5000b]"
                    />
                  </div>
                </div>

                <div className="h-px bg-gray-50" />

                <div className="flex items-center justify-between py-2">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800">Suara Beep (Klaim Gagal)</h4>
                    <p className="text-xs text-gray-400">Bunyikan nada rendah saat klaim gagal atau AWB tidak ditemukan</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => testBeep(false)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                    >
                      Tes Nada
                    </button>
                    <input
                      type="checkbox"
                      checked={beepOnFailure}
                      onChange={(e) => setBeepOnFailure(e.target.checked)}
                      className="w-9 h-5 rounded-full bg-gray-200 border-none cursor-pointer focus:ring-0 focus:ring-offset-0 checked:bg-[#b5000b] transition-all accent-[#b5000b]"
                    />
                  </div>
                </div>

                <div className="h-px bg-gray-50" />

                <div className="flex items-center justify-between py-2">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800">Auto Clear Input</h4>
                    <p className="text-xs text-gray-400">Kosongkan kotak input otomatis setelah barcode di-scan</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoClearInput}
                    onChange={(e) => setAutoClearInput(e.target.checked)}
                    className="w-9 h-5 rounded-full bg-gray-200 border-none cursor-pointer focus:ring-0 focus:ring-offset-0 checked:bg-[#b5000b] transition-all accent-[#b5000b]"
                  />
                </div>
              </div>
            </div>

            {/* Profile Detail */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600 text-[20px]" style={FILL}>badge</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Informasi Agen</h3>
                  <p className="text-[11px] text-gray-400">Data profil operasional terdaftar</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Nama Staff</span>
                  <p className="text-sm font-semibold text-gray-800 mt-1">{user.name}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">NIA (Agent Staff ID)</span>
                  <p className="text-sm font-semibold text-gray-800 mt-1">{user.nia}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 col-span-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Nama Gerai / Store</span>
                  <p className="text-sm font-semibold text-gray-800 mt-1">Gudang Utama Mitra Anteraja (Mock Store)</p>
                </div>
              </div>
            </div>

            {/* Help & Support */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600 text-[20px]" style={FILL}>help_center</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Pusat Bantuan &amp; FAQ</h3>
                  <p className="text-[11px] text-gray-400">Panduan penyelesaian kendala sistem</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl flex gap-3.5">
                  <span className="material-symbols-outlined text-emerald-600 shrink-0">info</span>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Butuh Bantuan Segera?</h4>
                    <p className="text-xs text-emerald-700 leading-relaxed mt-1">
                      Apabila terjadi kendala sinkronisasi data AWB atau API timeout, harap hubungi Koordinator Hub Area Anda atau kirim tiket ke <a href="mailto:support@anteraja.id" className="underline font-semibold">support@anteraja.id</a>.
                    </p>
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                  <div className="p-4 bg-white hover:bg-gray-50/50 transition-colors">
                    <h4 className="text-xs font-bold text-gray-800">Bagaimana cara men-scan AWB menggunakan scanner hardware?</h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      Arahkan kursor Anda ke dalam kotak input di halaman Dashboard. Nyalakan hardware scanner Anda, dekatkan ke barcode AWB, dan tekan pelatuk scanner. Input akan otomatis dikirim secara instan.
                    </p>
                  </div>
                  <div className="p-4 bg-white hover:bg-gray-50/50 transition-colors">
                    <h4 className="text-xs font-bold text-gray-800">Mengapa status klaim saya gagal (SUDAH DI-CLAIM)?</h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      Hal ini berarti nomor resi (AWB) tersebut sudah pernah sukses di-claim oleh staf agen lain sebelumnya di sistem Anteraja. Harap periksa status fisik paket.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
