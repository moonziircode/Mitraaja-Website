'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface SidebarProps {
  user?: {
    name: string;
    nia: string;
  };
  isOpen?: boolean;
}

const FILL = { fontVariationSettings: "'FILL' 1" } as const;

export default function Sidebar({ user = { name: 'Agent Budi Santoso', nia: '50004786' }, isOpen = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('mitraaja_sidebar_collapsed');
    if (stored === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem('mitraaja_sidebar_collapsed', String(newVal));
  };

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
    { href: '/tasklist', label: 'Tertunda', icon: 'task' },
    { href: '/settings', label: 'Pengaturan', icon: 'settings' },
  ];

  const userInitials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 bg-surface border-r border-gray-100 flex flex-col transition-all duration-300 ease-in-out md:translate-x-0 md:relative md:z-auto ${isCollapsed ? 'w-[88px]' : 'w-64 md:w-72'} ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Toggle Button for Desktop */}
      <button
        onClick={toggleSidebar}
        className="hidden md:flex absolute -right-3.5 top-8 w-7 h-7 bg-white border border-gray-200 rounded-full items-center justify-center text-gray-400 hover:text-primary hover:border-primary transition-colors z-50 shadow-sm"
      >
        <span className="material-symbols-outlined text-[18px]">{isCollapsed ? 'chevron_right' : 'chevron_left'}</span>
      </button>

      {/* Brand */}
      <div className={`px-3 md:px-4 py-4 md:py-6 flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center border-b border-gray-50 h-[60px] md:h-[76px] shrink-0`}>
        <Link href="/dashboard" className="flex items-center justify-center hover:opacity-90 transition-opacity">
          {isCollapsed ? (
            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-extrabold text-xl shadow-sm">
              M
            </div>
          ) : (
            <Image
              src="/logo-anteraja.png"
              alt="Anteraja Logo"
              width={148}
              height={60}
              className="h-8 md:h-11 w-auto object-contain"
              priority
            />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${isCollapsed ? 'px-3' : 'px-4'} py-5 space-y-2 overflow-y-auto`}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 md:gap-4 px-3 md:px-4'} py-2.5 md:py-3 rounded-2xl text-[13px] md:text-[14px] font-bold transition-all duration-300 ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary hover:scale-[1.02]'
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
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className={`px-4 py-5 border-t border-gray-50 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Akhiri Sesi' : undefined}
          className={`w-full h-10 flex items-center justify-center ${isCollapsed ? 'px-0' : 'gap-2 px-4'} rounded-xl text-xs font-semibold text-text-secondary hover:text-rose-600 hover:bg-rose-50 border border-gray-100 transition-colors`}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {!isCollapsed && <span>Akhiri Sesi</span>}
        </button>
      </div>
    </aside>
  );
}
