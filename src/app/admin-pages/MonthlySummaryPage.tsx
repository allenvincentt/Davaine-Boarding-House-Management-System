import { PageShell } from '@/components/layout/PageShell';
import { MainContentArea } from '@/components/layout/MainContentArea';
import { ComingSoonPlaceholder } from '@/components/common/ComingSoonPlaceholder';

export default function MonthlySummaryPage() {
  return (
    <PageShell>
      <MainContentArea>
        <ComingSoonPlaceholder
          icon="chart"
          title="Monthly Summary"
          description="View monthly occupancy, revenue, and collection reports."
        />
      </MainContentArea>
    </PageShell>
  );
}
