/**
 * Tipos da base do Supabase.
 *
 * Quando o projeto Supabase estiver criado, regenere este arquivo rodando:
 *   npx supabase gen types typescript --project-id <SEU-PROJECT-REF> > src/types/database.ts
 *
 * O conteúdo abaixo é um placeholder mínimo para o app compilar antes do
 * Supabase existir — substitua pelo arquivo gerado.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: 'user' | 'admin';
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string;
          full_name: string;
          email: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      escolas: {
        Row: {
          id: string;
          inep: string;
          name: string;
          active: boolean;
          last_movement_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['escolas']['Row'],
          'id' | 'created_at' | 'updated_at' | 'last_movement_at'
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          last_movement_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['escolas']['Row']>;
        Relationships: [];
      };
      verba_tipos: {
        Row: {
          id: string;
          code: string;
          label: string;
          requires_bank_info: boolean;
          sort_order: number;
          active: boolean;
        };
        Insert: Partial<Database['public']['Tables']['verba_tipos']['Row']> & {
          code: string;
          label: string;
          requires_bank_info: boolean;
        };
        Update: Partial<Database['public']['Tables']['verba_tipos']['Row']>;
        Relationships: [];
      };
      status_catalog: {
        Row: {
          id: string;
          code: 'EM_ANDAMENTO' | 'ATRASADO' | 'CONCLUIDO' | 'CANCELADO';
          label: string;
          color: string;
          is_terminal: boolean;
          sort_order: number;
        };
        Insert: Partial<Database['public']['Tables']['status_catalog']['Row']> & {
          code: Database['public']['Tables']['status_catalog']['Row']['code'];
          label: string;
        };
        Update: Partial<Database['public']['Tables']['status_catalog']['Row']>;
        Relationships: [];
      };
      convenios: {
        Row: {
          id: string;
          ref: string | null;
          year: number;
          verba_tipo_id: string;
          description: string | null;
          amount: number | null;
          due_date: string | null;
          launched: boolean;
          launched_at: string | null;
          status_id: string;
          priority: boolean;
          notes: string | null;
          escola_id: string | null;
          bank_branch: string | null;
          bank_account: string | null;
          process_link: string | null;
          created_by: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['convenios']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['convenios']['Row']>;
        Relationships: [];
      };
      simec_adhesions: {
        Row: {
          id: string;
          escola_id: string;
          program: string;
          year: number;
          due_date: string | null;
          status_id: string;
          priority: boolean;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['simec_adhesions']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['simec_adhesions']['Row']>;
        Relationships: [];
      };
      bienios: {
        Row: {
          id: string;
          escola_id: string;
          start_year: number;
          end_year: number;
          due_date: string | null;
          ata_signed_at: string | null;
          notary_validated: boolean;
          notary_validation_date: string | null;
          status_id: string;
          priority: boolean;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['bienios']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bienios']['Row']>;
        Relationships: [];
      };
      mandatos_tampao: {
        Row: {
          id: string;
          escola_id: string | null;
          start_date: string;
          end_date: string;
          due_date: string | null;
          status_id: string;
          priority: boolean;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['mandatos_tampao']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database['public']['Tables']['mandatos_tampao']['Row']
        >;
        Relationships: [];
      };
      status_history: {
        Row: {
          id: string;
          registro_tipo: 'CONVENIO' | 'SIMEC' | 'BIENIO' | 'MANDATO';
          registro_id: string;
          old_status_id: string | null;
          new_status_id: string;
          comment: string | null;
          changed_by: string;
          changed_at: string;
        };
        Insert: Partial<Database['public']['Tables']['status_history']['Row']> & {
          registro_tipo: Database['public']['Tables']['status_history']['Row']['registro_tipo'];
          registro_id: string;
          new_status_id: string;
          changed_by: string;
        };
        Update: Partial<Database['public']['Tables']['status_history']['Row']>;
        Relationships: [];
      };
      school_notes: {
        Row: {
          id: string;
          escola_id: string;
          body: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['school_notes']['Row'],
          'id' | 'created_at'
        > & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['school_notes']['Row']>;
        Relationships: [];
      };
      process_links: {
        Row: {
          id: string;
          registro_tipo: 'CONVENIO' | 'SIMEC' | 'BIENIO' | 'MANDATO';
          registro_id: string;
          url: string;
          label: string | null;
          added_by: string | null;
          added_at: string;
        };
        Insert: Partial<
          Database['public']['Tables']['process_links']['Row']
        > & {
          registro_tipo: Database['public']['Tables']['process_links']['Row']['registro_tipo'];
          registro_id: string;
          url: string;
        };
        Update: Partial<Database['public']['Tables']['process_links']['Row']>;
        Relationships: [];
      };
      message_templates: {
        Row: {
          id: string;
          title: string;
          body: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['message_templates']['Row'],
          'id' | 'created_at'
        > & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<
          Database['public']['Tables']['message_templates']['Row']
        >;
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          registro_tipo: 'CONVENIO' | 'SIMEC' | 'BIENIO' | 'MANDATO';
          registro_id: string;
          file_name: string;
          storage_path: string;
          mime_type: string | null;
          size_bytes: number | null;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: Partial<Database['public']['Tables']['attachments']['Row']> & {
          registro_tipo: Database['public']['Tables']['attachments']['Row']['registro_tipo'];
          registro_id: string;
          file_name: string;
          storage_path: string;
        };
        Update: Partial<Database['public']['Tables']['attachments']['Row']>;
        Relationships: [];
      };
      config: {
        Row: {
          key: string;
          value: Json;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['config']['Row']> & {
          key: string;
          value: Json;
        };
        Update: Partial<Database['public']['Tables']['config']['Row']>;
        Relationships: [];
      };
      official_deadlines: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          source:
            | 'DOU'
            | 'FNDE'
            | 'MEC'
            | 'PREFEITURA'
            | 'QUERIDO_DIARIO'
            | 'OUTRO';
          source_url: string | null;
          source_external_id: string | null;
          category: 'CONVENIO' | 'SIMEC' | 'BIENIO' | 'MANDATO' | 'GERAL';
          severity: 'INFO' | 'ATENCAO' | 'URGENTE';
          due_date: string | null;
          published_at: string;
          is_archived: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['official_deadlines']['Row'],
          'id' | 'created_at' | 'is_archived'
        > & {
          id?: string;
          created_at?: string;
          is_archived?: boolean;
        };
        Update: Partial<
          Database['public']['Tables']['official_deadlines']['Row']
        >;
        Relationships: [];
      };
      official_deadline_reads: {
        Row: {
          deadline_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: Partial<
          Database['public']['Tables']['official_deadline_reads']['Row']
        > & {
          deadline_id: string;
          user_id: string;
        };
        Update: Partial<
          Database['public']['Tables']['official_deadline_reads']['Row']
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      registro_tipo: 'CONVENIO' | 'SIMEC' | 'BIENIO' | 'MANDATO';
      status_code: 'EM_ANDAMENTO' | 'ATRASADO' | 'CONCLUIDO' | 'CANCELADO';
    };
    CompositeTypes: Record<string, never>;
  };
}
