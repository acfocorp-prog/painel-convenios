import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getDueInfo } from '@/lib/dates';

export type RegistroTipo = 'CONVENIO' | 'SIMEC' | 'BIENIO' | 'MANDATO';

export interface Deadline {
  id: string;
  tipo: RegistroTipo;
  href: string;
  title: string;
  subtitle: string;
  dueDate: string;
  statusCode: string;
  /** Dias até o prazo. Negativo = atrasado. */
  daysUntil: number;
}

export interface ModuleCounter {
  total: number;
  atrasado: number;
  emAndamento: number;
  concluido: number;
}

const initialEMAndamento: Record<RegistroTipo, ModuleCounter> = {
  CONVENIO: { total: 0, atrasado: 0, emAndamento: 0, concluido: 0 },
  SIMEC: { total: 0, atrasado: 0, emAndamento: 0, concluido: 0 },
  BIENIO: { total: 0, atrasado: 0, emAndamento: 0, concluido: 0 },
  MANDATO: { total: 0, atrasado: 0, emAndamento: 0, concluido: 0 },
};

export function useOverview(diasAntecedencia = 7) {
  return useQuery({
    queryKey: ['overview'],
    queryFn: async () => {
      // Fetch em paralelo. select enxuto — só o suficiente para Visão Geral.
      const [convenios, simec, bienios, mandatos] = await Promise.all([
        supabase
          .from('convenios')
          .select(
            'id, year, ref, due_date, priority, verba_tipos:verba_tipo_id (label), escolas:escola_id (name), status_catalog:status_id (code, is_terminal)',
          )
          .is('deleted_at', null),
        supabase
          .from('simec_adhesions')
          .select(
            'id, program, due_date, priority, escolas:escola_id (name), status_catalog:status_id (code, is_terminal)',
          )
          .is('deleted_at', null),
        supabase
          .from('bienios')
          .select(
            'id, start_year, end_year, due_date, priority, escolas:escola_id (name), status_catalog:status_id (code, is_terminal)',
          )
          .is('deleted_at', null),
        supabase
          .from('mandatos_tampao')
          .select(
            'id, start_date, end_date, due_date, priority, escolas:escola_id (name), status_catalog:status_id (code, is_terminal)',
          )
          .is('deleted_at', null),
      ]);

      const deadlines: Deadline[] = [];
      const counters: Record<RegistroTipo, ModuleCounter> = {
        ...initialEMAndamento,
        CONVENIO: { ...initialEMAndamento.CONVENIO },
        SIMEC: { ...initialEMAndamento.SIMEC },
        BIENIO: { ...initialEMAndamento.BIENIO },
        MANDATO: { ...initialEMAndamento.MANDATO },
      };

      // Convenios
      (convenios.data ?? []).forEach((c: any) => {
        const code = c.status_catalog?.code ?? 'EM_ANDAMENTO';
        const terminal = c.status_catalog?.is_terminal ?? false;
        counters.CONVENIO.total++;
        if (code === 'CONCLUIDO' || terminal) counters.CONVENIO.concluido++;
        else if (code === 'CANCELADO') counters.CONVENIO.concluido++;
        else if (
          c.due_date &&
          new Date(c.due_date) < new Date(new Date().toDateString())
        ) {
          counters.CONVENIO.atrasado++;
        } else {
          counters.CONVENIO.emAndamento++;
        }

        if (c.due_date) {
          const info = getDueInfo(c.due_date, code, diasAntecedencia);
          if (
            info.category === 'atrasado' ||
            info.category === 'hoje' ||
            info.category === 'proximo'
          ) {
            deadlines.push({
              id: c.id,
              tipo: 'CONVENIO',
              href: `/convenios/${c.id}`,
              title: c.verba_tipos?.label ?? 'Convênio',
              subtitle: `${c.year}${
                c.ref ? ' · ' + c.ref : ''
              }${c.escolas?.name ? ' · ' + c.escolas.name : ''}`,
              dueDate: c.due_date,
              statusCode: code,
              daysUntil: info.daysUntil ?? 0,
            });
          }
        }
      });

      // SIMEC
      (simec.data ?? []).forEach((s: any) => {
        const code = s.status_catalog?.code ?? 'EM_ANDAMENTO';
        const terminal = s.status_catalog?.is_terminal ?? false;
        counters.SIMEC.total++;
        if (code === 'CONCLUIDO' || terminal) counters.SIMEC.concluido++;
        else if (code === 'CANCELADO') counters.SIMEC.concluido++;
        else if (
          s.due_date &&
          new Date(s.due_date) < new Date(new Date().toDateString())
        ) {
          counters.SIMEC.atrasado++;
        } else {
          counters.SIMEC.emAndamento++;
        }

        if (s.due_date) {
          const info = getDueInfo(s.due_date, code, diasAntecedencia);
          if (
            info.category === 'atrasado' ||
            info.category === 'hoje' ||
            info.category === 'proximo'
          ) {
            deadlines.push({
              id: s.id,
              tipo: 'SIMEC',
              href: `/simec`,
              title: s.program,
              subtitle: s.escolas?.name ?? '',
              dueDate: s.due_date,
              statusCode: code,
              daysUntil: info.daysUntil ?? 0,
            });
          }
        }
      });

      // Biênios
      (bienios.data ?? []).forEach((b: any) => {
        const code = b.status_catalog?.code ?? 'EM_ANDAMENTO';
        const terminal = b.status_catalog?.is_terminal ?? false;
        counters.BIENIO.total++;
        if (code === 'CONCLUIDO' || terminal) counters.BIENIO.concluido++;
        else if (code === 'CANCELADO') counters.BIENIO.concluido++;
        else if (
          b.due_date &&
          new Date(b.due_date) < new Date(new Date().toDateString())
        ) {
          counters.BIENIO.atrasado++;
        } else {
          counters.BIENIO.emAndamento++;
        }

        if (b.due_date) {
          const info = getDueInfo(b.due_date, code, diasAntecedencia);
          if (
            info.category === 'atrasado' ||
            info.category === 'hoje' ||
            info.category === 'proximo'
          ) {
            deadlines.push({
              id: b.id,
              tipo: 'BIENIO',
              href: `/bienios`,
              title: `Biênio ${b.start_year}–${b.end_year}`,
              subtitle: b.escolas?.name ?? '',
              dueDate: b.due_date,
              statusCode: code,
              daysUntil: info.daysUntil ?? 0,
            });
          }
        }
      });

      // Mandatos
      (mandatos.data ?? []).forEach((m: any) => {
        const code = m.status_catalog?.code ?? 'EM_ANDAMENTO';
        const terminal = m.status_catalog?.is_terminal ?? false;
        counters.MANDATO.total++;
        if (code === 'CONCLUIDO' || terminal) counters.MANDATO.concluido++;
        else if (code === 'CANCELADO') counters.MANDATO.concluido++;
        else if (
          m.due_date &&
          new Date(m.due_date) < new Date(new Date().toDateString())
        ) {
          counters.MANDATO.atrasado++;
        } else {
          counters.MANDATO.emAndamento++;
        }

        if (m.due_date) {
          const info = getDueInfo(m.due_date, code, diasAntecedencia);
          if (
            info.category === 'atrasado' ||
            info.category === 'hoje' ||
            info.category === 'proximo'
          ) {
            deadlines.push({
              id: m.id,
              tipo: 'MANDATO',
              href: `/mandatos`,
              title: 'Mandato tampão',
              subtitle: m.escolas?.name ?? '',
              dueDate: m.due_date,
              statusCode: code,
              daysUntil: info.daysUntil ?? 0,
            });
          }
        }
      });

      // Ordena por proximidade do prazo (negativos primeiro = mais atrasado).
      deadlines.sort((a, b) => a.daysUntil - b.daysUntil);

      const atrasados = deadlines.filter(
        (d) =>
          getDueInfo(d.dueDate, d.statusCode, diasAntecedencia).category ===
          'atrasado',
      );
      const proximos = deadlines.filter(
        (d) =>
          getDueInfo(d.dueDate, d.statusCode, diasAntecedencia).category !==
          'atrasado',
      );

      const totalAtrasados =
        counters.CONVENIO.atrasado +
        counters.SIMEC.atrasado +
        counters.BIENIO.atrasado +
        counters.MANDATO.atrasado;

      return {
        counters,
        deadlines,
        atrasados,
        proximos,
        totalAtrasados,
      };
    },
    staleTime: 30_000,
  });
}
