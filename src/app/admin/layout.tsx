'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/leads', label: 'Leads', icon: '👤' },
  { href: '/admin/imoveis', label: 'Imóveis', icon: '🏠' },
  { href: '/admin/corretores', label: 'Corretores', icon: '🤝' },
  { href: '/admin/agenda', label: 'Agenda & Escala', icon: '📆' },
  { href: '/admin/carteira', label: 'Carteira', icon: '📋' },
  { href: '/admin/config', label: 'Configurações', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [countryMode, setCountryMode] = useState<string>('PT');

  useEffect(() => {
    fetch('/api/imobiliaria')
      .then(res => res.json())
      .then(data => {
        if (data && data.config_pais) {
          setCountryMode(data.config_pais);
        }
      })
      .catch(() => {});
  }, []);

  const countryFlag = countryMode === 'PT' ? '🇵🇹' : '🇧🇷';

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar-bg flex flex-col shrink-0">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-white/5">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="text-2xl">🏠</span>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">ImobIA</h1>
              <p className="text-xs text-slate-500 mt-0.5">Painel Admin {countryFlag}</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-sidebar-active text-sidebar-text-active shadow-lg shadow-primary/20'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-all duration-200"
          >
            <span className="text-lg">🚪</span>
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
