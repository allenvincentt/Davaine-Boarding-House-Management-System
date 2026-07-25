import { MainContentArea } from '@/components/layout/MainContentArea';
import { ComingSoonPlaceholder } from '@/components/common/ComingSoonPlaceholder';

export default function FeedbackPage() {
  return (
    <MainContentArea>
      <ComingSoonPlaceholder
        icon="feedback"
        title="Feedback"
        description="Review and respond to tenant feedback and support requests."
      />
    </MainContentArea>
  );
}
