import { MainContentArea } from '@/components/layout/MainContentArea';
import { ComingSoonPlaceholder } from '@/components/common/ComingSoonPlaceholder';

export default function MonthlySummaryPage() {
  return (
    <MainContentArea>
      <ComingSoonPlaceholder
        icon="chart"
        title="Monthly Summary"
        description="View monthly occupancy, revenue, and collection reports."
      />
    </MainContentArea>
  );
}
