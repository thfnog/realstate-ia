'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { CommandPalette } from '@/components/CommandPalette';
import { NotificationBell } from '@/components/layout/NotificationBell';

const navGroups = [
  {
    label: 'Dashboard',
    module: 'dashboard',
    items: [
      { href: '/admin', label: 'Início', icon: '📊' },
    ]
  },
  {
    label: 'CRM',
    module: 'crm',
    items: [
      { href: '/admin/leads', label: 'Leads', icon: '👤' },
      { href: '/admin/webhook-logs', label: 'Fila de Ingestão', icon: '🔄' },
    ]
  },
  {
    label: 'Inventário',
    module: 'inventario',
    items: [
      { href: '/admin/imoveis', label: 'Imóveis', icon: '🏠' },
    ]
  },
  {
    label: 'Locação',
    module: 'locacao',
    items: [
      { href: '/admin/alugueis/propostas', label: 'Propostas', icon: '📨' },
      { href: '/admin/contratos', label: 'Contratos', icon: '📄' },
      { href: '/admin/financeiro/mensal', label: 'Financeiro', icon: '💰' },
    ]
  },
  {
    label: 'Operação',
    module: 'operacao',
    items: [
      { href: '/admin/corretores', label: 'Corretores', icon: '🤝' },
      { href: '/admin/agenda', label: 'Agenda & Escala', icon: '📆' },
      { href: '/admin/carteira', label: 'Carteira', icon: '📋' },
    ]
  },
  {
    label: 'Sistema',
    module: 'sistema',
    items: [
      { href: '/admin/usuarios', label: 'Usuários', icon: '👤' },
      { href: '/admin/perfil', label: 'Meu Perfil', icon: '🆔' },
      { href: '/admin/config/plano', label: 'Assinatura', icon: '💎' },
      { href: '/admin/config', label: 'Configurações', icon: '⚙️' },
    ]
  }
];

const masterNavGroups = [
  {
    label: 'Plataforma',
    module: 'master',
    items: [
      { href: '/admin/master', label: 'Painel Global', icon: '🌐' },
      { href: '/admin/master/imobiliarias', label: 'Imobiliárias', icon: '🏢' },
      { href: '/admin/master/planos', label: 'Planos & Módulos', icon: '💎' },
    ]
  },
  {
    label: 'Financeiro',
    module: 'master',
    items: [
      { href: '/admin/master/financeiro', label: 'Receita Global', icon: '📈' },
    ]
  },
  {
    label: 'Infraestrutura',
    module: 'master',
    items: [
      { href: '/admin/master/status', label: 'Status do Sistema', icon: '⚡' },
    ]
  }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [countryMode, setCountryMode] = useState<string>('PT');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; app_role: string } | null>(null);
  const [activePlanModules, setActivePlanModules] = useState<string[]>(['dashboard', 'crm', 'sistema']);

  const isMasterPath = pathname.startsWith('/admin/master');

  useEffect(() => {
    fetch('/api/imobiliaria')
      .then(res => res.json())
      .then(data => {
        if (data && data.config_pais) setCountryMode(data.config_pais);
        if (data.active_modules) setActivePlanModules(data.active_modules);
      })
      .catch(() => {});

    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data && data.app_role) {
          setUser(data);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const isMaster = user?.email === 'admin@imobia.com' || user?.app_role === 'master';

  const filteredNavGroups = (isMasterPath ? masterNavGroups : navGroups.map(group => {
    if (group.module === 'master') return null;
    if (group.module !== 'dashboard' && group.module !== 'sistema' && !activePlanModules.includes(group.module)) return null;

    return {
      ...group,
      items: group.items.filter(item => {
        if (user?.app_role === 'admin' || user?.app_role === 'master') return true;
        const restricted = ['/admin/config', '/admin/carteira', '/admin/webhook-logs', '/admin/usuarios'];
        return !restricted.includes(item.href);
      })
    };
  })).filter(group => group !== null && group?.items?.length > 0) as typeof navGroups;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const SidebarContent = () => (
    <>
      <div className="px-6 py-5 border-b border-white/5">
        <Link href="/admin" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3">
          <span className="text-2xl">{isMasterPath ? '💎' : '🏠'}</span>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">
              {isMasterPath ? 'Master ImobIA' : 'ImobIA'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isMasterPath ? 'Administração Global' : `Painel ${user?.app_role === 'admin' ? 'Admin' : 'Corretor'} ${countryMode === 'PT' ? '🇵🇹' : '🇧🇷'}`}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-8 overflow-y-auto custom-scrollbar">
        {isMasterPath && (
           <div className="px-4 mb-4">
             <Link 
               href="/admin" 
               className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-slate-300 uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg"
             >
               ↩ Voltar para Imobiliária
             </Link>
           </div>
        )}

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
                    <span className={`text-lg transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mock Mode Banner */}
        {process.env.NEXT_PUBLIC_MOCK_MODE === 'true' && (
          <div className="bg-amber-500 text-amber-950 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-center shadow-inner flex items-center justify-center gap-2 z-[60]">
            <span>⚠️ MOCK MODE ATIVO</span>
            <span className="opacity-60 font-medium">Dados não persistentes • Apenas para testes locais</span>
          </div>
        )}

        {/* Unified Top Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-md border-b border-slate-100 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden sm:block">
               <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">ImobIA</h2>
               <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-1">Real Estate Management</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            
            <div className="w-px h-6 bg-slate-100 mx-1 hidden sm:block" />
            
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-2xl border border-slate-100 bg-slate-50/50">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-900 leading-none truncate max-w-[100px]">{user?.email?.split('@')[0]}</span>
                <span className="text-[8px] font-black text-primary uppercase tracking-widest mt-0.5">{user?.app_role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto scroll-smooth bg-slate-50/30">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <Toaster position="top-right" richColors closeButton />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
