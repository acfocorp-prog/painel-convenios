import {
  AlertTriangle,
  FileText,
  GraduationCap,
  CalendarCheck,
  Gavel,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { StatTile } from '@/components/overview/StatTile';
import { DeadlineRow } from '@/components/overview/DeadlineRow';
import { InstallBanner } from '@/components/shared/InstallBanner';
import { useOverview } from '@/hooks/useOverview';

export function OverviewPage() {
  const { data, isLoading } = useOverview();

  if (isLoading) return <LoadingSpinner />;

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
