import { PageShell } from '@/components/layout/PageShell';
import { MainContentArea } from '@/components/layout/MainContentArea';
import { ComingSoonPlaceholder } from '@/components/common/ComingSoonPlaceholder';

export default function TenantDirectoryPage() {
  return (
    <PageShell>
      <MainContentArea>
        <ComingSoonPlaceholder
          icon="directory"
          title="Tenant Directory"
          description="Browse tenant profiles, contact info, and move-in history."
        />
      </MainContentArea>
    </PageShell>
  );
}
