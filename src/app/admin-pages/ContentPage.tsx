import { PageShell } from '@/components/layout/PageShell';
import { MainContentArea } from '@/components/layout/MainContentArea';
import { ComingSoonPlaceholder } from '@/components/common/ComingSoonPlaceholder';

export default function ContentPage() {
  return (
    <PageShell>
      <MainContentArea>
        <ComingSoonPlaceholder
          icon="document"
          title="Content"
          description="Edit website content, announcements, and amenities without touching code."
        />
      </MainContentArea>
    </PageShell>
  );
}
