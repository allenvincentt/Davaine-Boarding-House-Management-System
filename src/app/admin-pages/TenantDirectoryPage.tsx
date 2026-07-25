import { MainContentArea } from '@/components/layout/MainContentArea';
import { ComingSoonPlaceholder } from '@/components/common/ComingSoonPlaceholder';

export default function TenantDirectoryPage() {
  return (
    <MainContentArea>
      <ComingSoonPlaceholder
        icon="directory"
        title="Tenant Directory"
        description="Browse tenant profiles, contact info, and move-in history."
      />
    </MainContentArea>
  );
}
