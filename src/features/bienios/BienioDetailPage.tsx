import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';

export function BienioDetailPage() {
  return (
    <div className="space-y-2">
      <PageHeader title="Biênio" />
      <div className="px-4">
        <Card className="p-1">
          <EmptyState
            icon={Construction}
            title="Em construção"
            description="Detalhe do Biênio entra na próxima iteração."
          />
        </Card>
      </div>
    </div>
  );
}
