import { MainContentArea } from '@/components/layout/MainContentArea';
import { ComingSoonPlaceholder } from '@/components/common/ComingSoonPlaceholder';

export default function RoomManagementPage() {
  return (
    <MainContentArea>
      <ComingSoonPlaceholder
        icon="rooms"
        title="Room Management"
        description="Manage room listings, availability, and pricing."
      />
    </MainContentArea>
  );
}
