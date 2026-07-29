import {
  AlertTriangle,
  FileText,
  GraduationCap,
  CalendarCheck,
  Gavel,
  Clock,
  Megaphone,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { StatTile } from '@/components/overview/StatTile';
import { DeadlineRow } from '@/components/overview/DeadlineRow';
import { InstallBanner } from '@/components/shared/InstallBanner';
import { useOverview } from '@/hooks/useOverview';
import { useOfficialDeadlines, CATEGORY_LABEL, SOURCE_LABEL } from '@/hooks/useOfficialDeadlines';
import { cn, formatDate } from '@/lib/utils';
import { RankingCard } from './RankingCard';

export function OverviewPage() {
  const { data, isLoading } = useOverview();
  const { data: avisos = [] } = useOfficialDeadlines();

  if (isLoading) return <LoadingSpinner />;

  const topAvisos = avisos.filter((a) => !a.is_read).slice(0, 5);

  const c = data?.counters ?? {
    CONVENIO: { total: 0, atrasado: 0, emAndamento: 0, concluido: 0 },
    SIMEC: { total: 0, atrasado: 0, emAndamento: 0, concluido: 0 },
    BIENIO: { total: 0, atrasado: 0, emAndamento: 0, concluido: 0 },
    MANDATO: { total: 0, atrasado: 0, emAndamento: 0, concluido: 0 },
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="Visão geral"
        description={
          data
            ? `${data.deadlines.length} prazo${
                data.deadlines.length === 1 ? '' : 's'
              } próximo${data.deadlines.length === 1 ? '' : 's'} · ${
                data.totalAtrasados
              } atrasado${data.totalAtrasados === 1 ? '' : 's'}`
            : ''
        }
      />

      <InstallBanner />

      <div className="grid grid-cols-2 gap-2.5 px-4">
        <StatTile
          to="/convenios"
          icon={FileText}
          label="Convênios"
          value={c.CONVENIO.atrasado}
          valueLabel="atrasados"
          secondary={`${c.CONVENIO.emAndamento} em aberto · ${c.CONVENIO.concluido} ok`}
          accentClass="bg-brand-50 text-brand-700"
        />
        <StatTile
          to="/simec"
          icon={GraduationCap}
          label="SIMEC"
          value={c.SIMEC.atrasado}
          valueLabel="atrasados"
          secondary={`${c.SIMEC.emAndamento} em aberto · ${c.SIMEC.concluido} ok`}
          accentClass="bg-brand-100 text-brand-800"
        />
        <StatTile
          to="/bienios"
          icon={CalendarCheck}
          label="Biênio"
          value={c.BIENIO.atrasado}
          valueLabel="atrasados"
          secondary={`${c.BIENIO.emAndamento} em aberto · ${c.BIENIO.concluido} ok`}
          accentClass="bg-accent-50 text-accent-700"
        />
        <StatTile
          to="/mandatos"
          icon={Gavel}
          label="Mandato"
          value={c.MANDATO.atrasado}
          valueLabel="atrasados"
          secondary={`${c.MANDATO.emAndamento} em aberto · ${c.MANDATO.concluido} ok`}
          accentClass="bg-rose-50 text-rose-700"
        />
      </div>

      {/* Atrasados */}
      <section className="px-4">
        <header className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-status-danger" />
          <h2 className="text-sm font-semibold text-slate-900">
            Atrasados{' '}
            <span className="text-status-danger">
              ({data?.atrasados.length ?? 0})
            </span>
          </h2>
        </header>

        {!data || data.atrasados.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-slate-500">
              Nada atrasado. 🎉
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {data.atrasados.map((d) => (
              <li key={`${d.tipo}-${d.id}`}>
                <DeadlineRow deadline={d} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Avisos oficiais não lidos */}
      <section className="px-4">
        <header className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-brand-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              Avisos oficiais{' '}
              <span className="text-slate-500">
                ({topAvisos.length} não lido{topAvisos.length === 1 ? '' : 's'})
              </span>
            </h2>
          </div>
          <Link
            to="/avisos-oficiais"
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            Ver todos →
          </Link>
        </header>

        {topAvisos.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-center text-sm text-slate-500">
              Nenhum aviso oficial pendente. 🎉
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {topAvisos.map((a) => {
              const sevDot =
                a.severity === 'URGENTE'
                  ? 'bg-rose-600'
                  : a.severity === 'ATENCAO'
                    ? 'bg-amber-500'
                    : 'bg-slate-400';
              return (
                <li key={a.id}>
                  <Link
                    to="/avisos-oficiais"
                    className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
                  >
                    <span
                      aria-hidden
                      className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', sevDot)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {a.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {SOURCE_LABEL[a.source]} ·{' '}
                        {CATEGORY_LABEL[a.category]} ·{' '}
                        publicado em {formatDate(a.published_at)}
                        {a.due_date && (
                          <>
                            {' · prazo '}
                            <span
                              className={cn(
                                a.severity === 'URGENTE' && 'font-semibold text-rose-700',
                                a.severity === 'ATENCAO' && 'font-semibold text-amber-700',
                              )}
                            >
                              {formatDate(a.due_date)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Ranking */}
      <section className="px-4">
        <RankingCard />
      </section>

      {/* Próximos */}
      <section className="px-4">
        <header className="mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-status-warn" />
          <h2 className="text-sm font-semibold text-slate-900">
            Próximos prazos{' '}
            <span className="text-slate-500">
              ({data?.proximos.length ?? 0})
            </span>
          </h2>
        </header>

        {!data || data.proximos.length === 0 ? (
          <EmptyState
            title="Sem prazos próximos"
            description="Quando um convênio, SIMEC, biênio ou mandato tiver prazo em até 7 dias, ele aparece aqui."
          />
        ) : (
          <ul className="space-y-2">
            {data.proximos.map((d) => (
              <li key={`${d.tipo}-${d.id}`}>
                <DeadlineRow deadline={d} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
