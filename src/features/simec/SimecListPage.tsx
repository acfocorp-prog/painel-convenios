import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';

export function SimecListPage() {
  return (
    <div className="space-y-3">
      <PageHeader
        title="SIMEC"
        description="Adesões a programas do MEC por escola."
      />
      <div className="px-4">
        <Card className="p-1">
          <EmptyState
            icon={Construction}
            title="Em construção"
            description="Este módulo entra na próxima iteração. Os convênios e escolas já estão funcionando."
          />
        </Card>
      </div>
    </div>
  );
}
