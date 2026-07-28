import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  GraduationCap,
  CalendarCheck,
  Gavel,
  School,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/overview', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/convenios', label: 'Convênios', icon: FileText },
  { to: '/simec', label: 'SIMEC', icon: GraduationCap },
  { to: '/bienios', label: 'Biênio', icon: CalendarCheck },
  { to: '/mandatos', label: 'Mandato', icon: Gavel },
  { to: '/escolas', label: 'Escolas', icon: School },
  { to: '/concluidos', label: 'Concluídos', icon: CheckCircle2 },
] as const;

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85"
      aria-label="Navegação principal"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/overview'}
              className={({ isActive }) =>
                cn(
                  'flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                  isActive
                    ? 'text-brand-700'
                    : 'text-slate-500 hover:text-slate-900',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-transform',
                      isActive && 'scale-110',
                    )}
                    aria-hidden
                  />
                  <span className="leading-none">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
