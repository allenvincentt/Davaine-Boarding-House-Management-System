import { MainContentArea } from '@/components/layout/MainContentArea';
import { ComingSoonPlaceholder } from '@/components/common/ComingSoonPlaceholder';

export default function BillsPage() {
  return (
    <MainContentArea>
      <ComingSoonPlaceholder
        icon="money"
        title="Bills"
        description="Generate, track, and manage tenant billing and payments."
      />
    </MainContentArea>
  );
}
