'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

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
    { href: '/dashboard', label: 'Dashboard', icon: 'grid_view' },
    { href: '/tracking', label: 'Tracking Resi', icon: 'route' },
    { href: '/settings', label: 'Pengaturan', icon: 'settings' },
  ];

  const userInitials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-auto">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-gray-50">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[#b5000b] rounded-xl flex items-center justify-center shadow-md shadow-[#b5000b]/15 shrink-0">
            <span className="material-symbols-outlined text-white text-[22px]" style={FILL}>
              local_shipping
            </span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-[17px] tracking-tight leading-tight">Mitraaja</h1>
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.12em]">Gateway Portal</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 pt-1 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">
          MENU UTAMA
        </p>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
                isActive
                  ? 'bg-[#b5000b]/8 text-[#b5000b]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  isActive ? 'text-[#b5000b]' : 'text-gray-400'
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

      {/* User Profile */}
      <div className="px-4 py-5 border-t border-gray-50">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/70">
          <div className="w-10 h-10 rounded-full bg-[#b5000b]/10 text-[#b5000b] flex items-center justify-center font-bold text-sm tracking-tight shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-[11px] text-gray-400 truncate">NIA: {user.nia}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 w-full h-9 flex items-center justify-center gap-2 rounded-lg text-xs font-semibold text-gray-500 hover:text-[#b5000b] hover:bg-[#b5000b]/5 border border-gray-100 transition-colors"
        >
          <span className="material-symbols-outlined text-[17px]">logout</span>
          Akhiri Sesi
        </button>
      </div>
    </aside>
  );
}
