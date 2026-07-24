import { PageShell } from '@/components/layout/PageShell';
import { MainContentArea } from '@/components/layout/MainContentArea';
import { ComingSoonPlaceholder } from '@/components/common/ComingSoonPlaceholder';

export default function BillsPage() {
  return (
    <PageShell>
      <MainContentArea>
        <ComingSoonPlaceholder
          icon="money"
          title="Bills"
          description="Generate, track, and manage tenant billing and payments."
        />
      </MainContentArea>
    </PageShell>
  );
}
