import { PageShell } from '@/components/layout/PageShell';
import { MainContentArea } from '@/components/layout/MainContentArea';
import { ComingSoonPlaceholder } from '@/components/common/ComingSoonPlaceholder';

export default function RoomManagementPage() {
  return (
    <PageShell>
      <MainContentArea>
        <ComingSoonPlaceholder
          icon="rooms"
          title="Room Management"
          description="Manage room listings, availability, and pricing."
        />
      </MainContentArea>
    </PageShell>
  );
}
