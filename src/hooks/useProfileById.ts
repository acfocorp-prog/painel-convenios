import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Profile cacheado pelo id — usado por AuditTrail e StatusHistory.
 */
export function useProfileById(id: string | null | undefined) {
  return useQuery({
    queryKey: ['profile_by_id', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}
