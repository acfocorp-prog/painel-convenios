import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export type OfficialDeadlineSource =
  | 'DOU'
  | 'FNDE'
  | 'MEC'
  | 'PREFEITURA'
  | 'QUERIDO_DIARIO'
  | 'OUTRO';

export type OfficialDeadlineCategory =
  | 'CONVENIO'
  | 'SIMEC'
  | 'BIENIO'
  | 'MANDATO'
  | 'GERAL';

export type OfficialDeadlineSeverity = 'INFO' | 'ATENCAO' | 'URGENTE';

/** Linha crua retornada pelo Supabase (sem flag de leitura). */
export interface OfficialDeadlineRow {
  id: string;
  title: string;
  description: string | null;
  source: OfficialDeadlineSource;
  source_url: string | null;
  source_external_id: string | null;
  category: OfficialDeadlineCategory;
  severity: OfficialDeadlineSeverity;
  due_date: string | null;
  published_at: string;
  is_archived: boolean;
  created_at: string;
}

/** Linha enriquecida com flag is_read calculada a partir de reads. */
export interface OfficialDeadline extends OfficialDeadlineRow {
  is_read: boolean;
}

const READ_FIELDS =
  'deadline_id, user_id, read_at' as const;

/**
 * Lista avisos oficiais não-arquivados, juntando leituras do usuário atual.
 * Ordena: urgentes não-lidos primeiro, depois por published_at desc.
 */
export function useOfficialDeadlines(opts?: { includeArchived?: boolean }) {
  const { user } = useAuth();
  const includeArchived = opts?.includeArchived ?? false;

  return useQuery({
    queryKey: ['official_deadlines', { includeArchived, uid: user?.id ?? null }],
    queryFn: async (): Promise<OfficialDeadline[]> => {
      let q = supabase
        .from('official_deadlines')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(200);
      if (!includeArchived) q = q.eq('is_archived', false);

      const readsPromise: Promise<{
        data: { deadline_id: string }[] | null;
      }> = user
        ? (supabase
            .from('official_deadline_reads')
            .select(READ_FIELDS)
            .eq('user_id', user.id) as unknown as Promise<{
            data: { deadline_id: string }[] | null;
          }>)
        : Promise.resolve({ data: [] });

      const [deadlinesRes, readsRes] = await Promise.all([q, readsPromise]);

      if (deadlinesRes.error) throw deadlinesRes.error;
      const readsErr = (readsRes as unknown as { error?: Error }).error;
      if (readsErr) throw readsErr;

      const readIds = new Set((readsRes.data ?? []).map((r) => r.deadline_id));
      const rows = (deadlinesRes.data ?? []) as OfficialDeadlineRow[];

      const enriched: OfficialDeadline[] = rows.map((d) => ({
        ...d,
        is_read: readIds.has(d.id),
      }));

      // Urgentes não-lidos no topo; o resto mantém ordem cronológica.
      enriched.sort((a, b) => {
        const aUnreadUrgent = !a.is_read && a.severity === 'URGENTE' ? 0 : 1;
        const bUnreadUrgent = !b.is_read && b.severity === 'URGENTE' ? 0 : 1;
        if (aUnreadUrgent !== bUnreadUrgent) return aUnreadUrgent - bUnreadUrgent;
        return (
          new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        );
      });

      return enriched;
    },
    staleTime: 30_000,
  });
}

/** Retorna só a quantidade de não-lidos (consulta barata para o badge). */
export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['official_deadlines_unread', { uid: user?.id ?? null }],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      // Pega ids não-arquivados e ids lidos pelo usuário; a diferença = unread.
      const [allRes, readsRes] = await Promise.all([
        supabase
          .from('official_deadlines')
          .select('id')
          .eq('is_archived', false),
        supabase
          .from('official_deadline_reads')
          .select('deadline_id')
          .eq('user_id', user.id),
      ]);

      if (allRes.error) throw allRes.error;
      if (readsRes.error) throw readsRes.error;

      const readSet = new Set((readsRes.data ?? []).map((r) => r.deadline_id));
      const unread = (allRes.data ?? []).filter((d) => !readSet.has(d.id));
      return unread.length;
    },
    staleTime: 30_000,
  });
}

/** Marca um aviso como lido pelo usuário atual (upsert idempotente). */
export function useMarkAsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (deadlineId: string) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('official_deadline_reads')
        .upsert(
          { deadline_id: deadlineId, user_id: user.id },
          { onConflict: 'deadline_id,user_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['official_deadlines'] });
      qc.invalidateQueries({ queryKey: ['official_deadlines_unread'] });
    },
  });
}

/** Marca todos os não-lidos do usuário como lidos (best-effort, paralelo). */
export function useMarkAllAsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Não autenticado');

      // Pega ids ainda não-lidos.
      const [allRes, readsRes] = await Promise.all([
        supabase
          .from('official_deadlines')
          .select('id')
          .eq('is_archived', false),
        supabase
          .from('official_deadline_reads')
          .select('deadline_id')
          .eq('user_id', user.id),
      ]);
      if (allRes.error) throw allRes.error;
      if (readsRes.error) throw readsRes.error;

      const readSet = new Set((readsRes.data ?? []).map((r) => r.deadline_id));
      const toMark = (allRes.data ?? [])
        .map((d) => d.id)
        .filter((id) => !readSet.has(id));
      if (toMark.length === 0) return 0;

      const rows = toMark.map((id) => ({
        deadline_id: id,
        user_id: user.id,
      }));
      const { error } = await supabase
        .from('official_deadline_reads')
        .upsert(rows, { onConflict: 'deadline_id,user_id' });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['official_deadlines'] });
      qc.invalidateQueries({ queryKey: ['official_deadlines_unread'] });
    },
  });
}

/** Arquiva (soft delete) um aviso — some da lista por padrão. */
export function useArchiveOfficialDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deadlineId: string) => {
      const { error } = await supabase
        .from('official_deadlines')
        .update({ is_archived: true })
        .eq('id', deadlineId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['official_deadlines'] });
      qc.invalidateQueries({ queryKey: ['official_deadlines_unread'] });
    },
  });
}

/** Desarquiva um aviso. */
export function useUnarchiveOfficialDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deadlineId: string) => {
      const { error } = await supabase
        .from('official_deadlines')
        .update({ is_archived: false })
        .eq('id', deadlineId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['official_deadlines'] });
      qc.invalidateQueries({ queryKey: ['official_deadlines_unread'] });
    },
  });
}

/** Label amigável para fonte. */
export const SOURCE_LABEL: Record<OfficialDeadlineSource, string> = {
  DOU: 'DOU',
  FNDE: 'FNDE',
  MEC: 'MEC',
  PREFEITURA: 'Prefeitura',
  QUERIDO_DIARIO: 'Querido Diário',
  OUTRO: 'Outro',
};

export const CATEGORY_LABEL: Record<OfficialDeadlineCategory, string> = {
  CONVENIO: 'Convênio',
  SIMEC: 'SIMEC',
  BIENIO: 'Biênio',
  MANDATO: 'Mandato',
  GERAL: 'Geral',
};

export const SEVERITY_LABEL: Record<OfficialDeadlineSeverity, string> = {
  INFO: 'Info',
  ATENCAO: 'Atenção',
  URGENTE: 'Urgente',
};