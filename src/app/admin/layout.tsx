'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { CommandPalette } from '@/components/CommandPalette';

const navGroups = [
  {
    label: 'Dashboard',
    items: [
      { href: '/admin', label: 'Início', icon: '📊' },
    ]
  },
  {
    label: 'CRM',
    items: [
      { href: '/admin/leads', label: 'Leads', icon: '👤' },
      { href: '/admin/webhook-logs', label: 'Fila de Ingestão', icon: '🔄' },
    ]
  },
  {
    label: 'Inventário',
    items: [
      { href: '/admin/imoveis', label: 'Imóveis', icon: '🏠' },
    ]
  },
  {
    label: 'Locação',
    items: [
      { href: '/admin/alugueis/propostas', label: 'Propostas', icon: '📨' },
      { href: '/admin/contratos', label: 'Contratos', icon: '📄' },
      { href: '/admin/financeiro/mensal', label: 'Financeiro', icon: '💰' },
    ]
  },
  {
    label: 'Operação',
    items: [
      { href: '/admin/corretores', label: 'Corretores', icon: '🤝' },
      { href: '/admin/agenda', label: 'Agenda & Escala', icon: '📆' },
      { href: '/admin/carteira', label: 'Carteira', icon: '📋' },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/usuarios', label: 'Usuários', icon: '👤' },
      { href: '/admin/perfil', label: 'Meu Perfil', icon: '🆔' },
      { href: '/admin/config', label: 'Configurações', icon: '⚙️' },
    ]
  }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [countryMode, setCountryMode] = useState<string>('PT');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; app_role: string } | null>(null);

  useEffect(() => {
    // Fetch imobiliaria info
    fetch('/api/imobiliaria')
      .then(res => res.json())
      .then(data => {
        if (data && data.config_pais) {
          setCountryMode(data.config_pais);
        }
      })
      .catch(() => {});

    // Fetch user session
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data && data.app_role) {
          setUser(data);
        } else {
          router.push('/login');
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  const countryFlag = countryMode === 'PT' ? '🇵🇹' : '🇧🇷';

  // Filter nav groups and items based on role
  const filteredNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (user?.app_role === 'admin') return true;
      const restricted = ['/admin/config', '/admin/carteira', '/admin/webhook-logs', '/admin/usuarios'];
      return !restricted.includes(item.href);
    })
  })).filter(group => group.items.length > 0);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="px-6 py-5 border-b border-white/5">
        <Link href="/admin" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3">
          <span className="text-2xl">🏠</span>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">ImobIA</h1>
            <p className="text-xs text-slate-500 mt-0.5">Painel {user?.app_role === 'admin' ? 'Admin' : 'Corretor'} {countryFlag}</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-8 overflow-y-auto custom-scrollbar">
        {filteredNavGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-2">
            <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                      isActive
                        ? 'bg-primary text-white shadow-lg shadow-primary/30 border border-primary'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <span className={`text-lg transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="px-3 py-6 border-t border-white/5 space-y-4 bg-sidebar-bg/50 backdrop-blur-md">
        {user && (
          <div className="px-4 py-2.5 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Usuário</p>
            <p className="text-sm text-slate-300 truncate font-medium">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-300 border border-transparent hover:border-rose-500/20"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🚪</span>
            Sair da Conta
          </div>
          <span className="text-[10px] opacity-40 italic">v2.0</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <CommandPalette />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-sidebar-bg flex-col shrink-0 border-r border-white/5">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-50 lg:hidden bg-black/60 backdrop-blur-sm transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
        >
          <aside 
            className="w-72 h-full bg-sidebar-bg flex flex-col animate-slide-in-left shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mock Mode Banner */}
        {process.env.NEXT_PUBLIC_MOCK_MODE === 'true' && (
          <div className="bg-amber-500 text-amber-950 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-center shadow-inner flex items-center justify-center gap-2">
            <span>⚠️ MOCK MODE ATIVO</span>
            <span className="opacity-60 font-medium">Dados não persistentes • Apenas para testes locais</span>
          </div>
        )}

        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-sidebar-bg border-b border-white/10 shrink-0">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-xl">🏠</span>
            <span className="text-white font-bold text-base tracking-tight">ImobIA</span>
          </Link>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-white bg-white/5 rounded-lg hover:bg-white/10"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto scroll-smooth bg-background">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <Toaster position="top-right" richColors closeButton />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
