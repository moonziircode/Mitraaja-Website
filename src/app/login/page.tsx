'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [nia, setNia] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nia, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect to dashboard on successful login
        router.push('/dashboard');
      } else {
        setError(data.message || 'Login gagal. Periksa kembali NIA dan password Anda.');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <div className="pastel-gradient-bg min-h-screen flex items-center justify-center p-4 md:p-8 font-sans text-[#191c1e]">
      <main className="w-full max-w-md animate-fade-in">
        <div className="glass-panel rounded-2xl shadow-lg p-8 overflow-hidden relative">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="h-16 flex items-center justify-center mb-4">
              <Image
                src="/logo-anteraja.png"
                alt="Anteraja Logo"
                width={148}
                height={60}
                className="h-12 w-auto object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-semibold text-[#191c1e] mb-1 tracking-tight">Login Agent Gateway</h1>
            <p className="text-sm text-gray-500">Masuk untuk mengelola paket dan klaim AWB</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2" htmlFor="nia">
                NIA (Agent ID)
              </label>
              <div className="relative input-focus-ring rounded-lg border border-gray-200 bg-white/50 transition-all duration-200">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-lg">badge</span>
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-3 border-none bg-transparent rounded-lg text-sm text-gray-800 placeholder-gray-400/70 focus:ring-0 outline-none"
                  id="nia"
                  name="nia"
                  placeholder="Contoh: 50004786"
                  required
                  type="text"
                  value={nia}
                  onChange={(e) => setNia(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2" htmlFor="password">
                Password
              </label>
              <div className="relative input-focus-ring rounded-lg border border-gray-200 bg-white/50 transition-all duration-200">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-lg">lock</span>
                </div>
                <input
                  className="block w-full pl-10 pr-10 py-3 border-none bg-transparent rounded-lg text-sm text-gray-800 placeholder-gray-400/70 focus:ring-0 outline-none"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-800 transition-colors focus:outline-none"
                  id="togglePassword"
                  type="button"
                  onClick={togglePasswordVisibility}
                >
                  <span className="material-symbols-outlined text-lg">
                    {isPasswordVisible ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>
            
            {error && <p className="text-xs text-red-600 text-center font-medium">{error}</p>}

            <div className="pt-2 space-y-4">
              <button
                className="w-full bg-primary text-white font-semibold text-base py-3 rounded-lg shadow-sm hover:shadow-md hover:bg-primary-light transition-all duration-200 flex justify-center items-center relative overflow-hidden group disabled:bg-gray-400"
                id="submitBtn"
                type="submit"
                disabled={isLoading}
              >
                <span className={`transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                  Masuk Sekarang
                </span>
                <span className={`material-symbols-outlined absolute right-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all duration-300 ${isLoading ? 'hidden' : ''}`}>
                  arrow_forward
                </span>
                <div className={`absolute inset-0 flex items-center justify-center bg-primary ${!isLoading ? 'hidden' : ''}`}>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                  </svg>
                </div>
              </button>
              <div className="text-center">
                <a className="text-xs text-primary hover:text-primary-light transition-colors inline-flex items-center gap-1" href="#" onClick={(e) => { e.preventDefault(); alert('Silakan hubungi administrator pusat untuk bantuan masuk.'); }}>
                  <span className="material-symbols-outlined text-sm">help_center</span>
                  Lupa password atau kendala login?
                </a>
              </div>
            </div>
          </form>
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#ffdad5]/30 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#d5e4f8]/40 rounded-full blur-2xl pointer-events-none"></div>
        </div>
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500/80">© 2026 Mitraaja Gateway. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
