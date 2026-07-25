import { MainContentArea } from '@/components/layout/MainContentArea';
import { ComingSoonPlaceholder } from '@/components/common/ComingSoonPlaceholder';

export default function UserManagementPage() {
  return (
    <MainContentArea>
      <ComingSoonPlaceholder
        icon="users"
        title="User Management"
        description="Manage admin and staff accounts, roles, and permissions from here soon."
      />
    </MainContentArea>
  );
}
