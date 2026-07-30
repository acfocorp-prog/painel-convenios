import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Database } from '@/types/database';

export type Escola = {
  id: string;
  inep: string;
  name: string;
  active: boolean;
  last_movement_at: string | null;
  created_at: string;
  updated_at: string;
  // Campos opcionais (modelo FNDE)
  phone: string | null;
  email: string | null;
  cnpj_eex: string | null;
  cnpj_uex: string | null;
  rede_atendimento: string | null;
  localizacao: string | null;
  mandato_dirigente: string | null;
  data_fim_mandato: string | null;
};

export type EscolaInsert = {
  inep: string;
  name: string;
  active?: boolean;
  phone?: string | null;
  email?: string | null;
  cnpj_eex?: string | null;
  cnpj_uex?: string | null;
  rede_atendimento?: string | null;
  localizacao?: string | null;
  mandato_dirigente?: string | null;
  data_fim_mandato?: string | null;
};

export function useEscolas(search?: string) {
  return useQuery({
    queryKey: ['escolas', search ?? ''],
    queryFn: async () => {
      let q = supabase
        .from('escolas')
        .select(
          'id, inep, name, active, last_movement_at, created_at, updated_at, ' +
            'phone, email, cnpj_eex, cnpj_uex, rede_atendimento, localizacao, ' +
            'mandato_dirigente, data_fim_mandato',
        )
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (search && search.trim().length > 0) {
        const term = search.trim();
        q = q.or(`name.ilike.%${term}%,inep.ilike.%${term}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Escola[];
    },
    staleTime: 60_000,
  });
}

export function useEscola(id: string | undefined) {
  return useQuery({
    queryKey: ['escola', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escolas')
        .select('*')
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data as Escola | null;
    },
  });
}

export function useCreateEscola() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: EscolaInsert) => {
      const { data, error } = await supabase
        .from('escolas')
        .insert({
          inep: input.inep.trim(),
          name: input.name.trim(),
          active: input.active ?? true,
          phone: input.phone ?? null,
          email: input.email ?? null,
          cnpj_eex: input.cnpj_eex ?? null,
          cnpj_uex: input.cnpj_uex ?? null,
          rede_atendimento: input.rede_atendimento ?? null,
          localizacao: input.localizacao ?? null,
          mandato_dirigente: input.mandato_dirigente ?? null,
          data_fim_mandato: input.data_fim_mandato ?? null,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
          deleted_at: null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Escola;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escolas'] });
    },
  });
}

export function useUpdateEscola(id: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<EscolaInsert>) => {
      // Só envia o que veio preenchido no input — evita sobrescrever
      // campos opcionais com null quando o form não toca neles.
      const update: Database['public']['Tables']['escolas']['Update'] = {
        updated_by: user?.id ?? null,
      };
      if (input.inep !== undefined) update.inep = input.inep.trim();
      if (input.name !== undefined) update.name = input.name.trim();
      if (input.active !== undefined) update.active = input.active;
      if (input.phone !== undefined) update.phone = input.phone;
      if (input.email !== undefined) update.email = input.email;
      if (input.cnpj_eex !== undefined) update.cnpj_eex = input.cnpj_eex;
      if (input.cnpj_uex !== undefined) update.cnpj_uex = input.cnpj_uex;
      if (input.rede_atendimento !== undefined)
        update.rede_atendimento = input.rede_atendimento;
      if (input.localizacao !== undefined) update.localizacao = input.localizacao;
      if (input.mandato_dirigente !== undefined)
        update.mandato_dirigente = input.mandato_dirigente;
      if (input.data_fim_mandato !== undefined)
        update.data_fim_mandato = input.data_fim_mandato;

      const { data, error } = await supabase
        .from('escolas')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Escola;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escolas'] });
      qc.invalidateQueries({ queryKey: ['escola', id] });
    },
  });
}

export function useDeleteEscola() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('escolas')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escolas'] });
    },
  });
}

/* Notas (diário) da escola */

export type SchoolNote = {
  id: string;
  escola_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
};

export function useSchoolNotes(escolaId: string | undefined) {
  return useQuery({
    queryKey: ['school_notes', escolaId],
    enabled: !!escolaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_notes')
        .select('id, escola_id, body, created_by, created_at')
        .eq('escola_id', escolaId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SchoolNote[];
    },
  });
}

export function useCreateSchoolNote(escolaId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data, error } = await supabase
        .from('school_notes')
        .insert({
          escola_id: escolaId,
          body,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SchoolNote;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['school_notes', escolaId] });
      qc.invalidateQueries({ queryKey: ['escola', escolaId] });
    },
  });
}

export function useDeleteSchoolNote(escolaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('school_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['school_notes', escolaId] });
    },
  });
}
