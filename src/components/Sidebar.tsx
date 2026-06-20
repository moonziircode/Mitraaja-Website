'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface SidebarProps {
  user?: {
    name: string;
    nia: string;
  };
}

const FILL = { fontVariationSettings: "'FILL' 1" } as const;

export default function Sidebar({ user = { name: 'Agent Budi Santoso', nia: '50004786' } }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout');
      if (res.ok) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'home' },
    { href: '/orders/create', label: 'Buat Order', icon: 'add_box' },
    { href: '/rates/check', label: 'Cek Ongkir', icon: 'calculate' },
    { href: '/tracking', label: 'Tracking', icon: 'location_on' },
    { href: '/claim', label: 'Claim Parcel', icon: 'receipt_long' },
    { href: '/orders', label: 'Riwayat Order', icon: 'list_alt' },
    { href: '/settings', label: 'Pengaturan', icon: 'settings' },
  ];

  const userInitials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-surface border-r border-gray-100 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-auto">
      {/* Brand */}
      <div className="px-6 py-6 flex justify-center border-b border-gray-50">
        <Link href="/dashboard" className="flex items-center justify-center hover:opacity-90 transition-opacity">
          <Image
            src="/logo-anteraja.png"
            alt="Anteraja Logo"
            width={148}
            height={60}
            className="h-11 w-auto object-contain"
            priority
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-5 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[14px] font-bold transition-all ${
                isActive
                  ? 'bg-background text-primary'
                  : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[24px] ${
                  isActive ? 'text-primary' : 'text-text-secondary'
                }`}
                style={isActive ? FILL : undefined}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Profile - Not fully matching mockup but good enough */}
      <div className="px-4 py-5 border-t border-gray-50">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/70">
          <div className="w-10 h-10 rounded-full bg-background text-primary flex items-center justify-center font-bold text-sm tracking-tight shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{user.name}</p>
            <p className="text-[11px] text-text-secondary truncate">NIA: {user.nia}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 w-full h-9 flex items-center justify-center gap-2 rounded-lg text-xs font-semibold text-text-secondary hover:text-primary hover:bg-background border border-gray-100 transition-colors"
        >
          <span className="material-symbols-outlined text-[17px]">logout</span>
          Akhiri Sesi
        </button>
      </div>
    </aside>
  );
}
