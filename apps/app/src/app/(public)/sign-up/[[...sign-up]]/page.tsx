import { SignUp } from '@clerk/nextjs';
import { AuthShell } from '@/components/AuthShell';

export default function Page() {
  return (
    <AuthShell>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </AuthShell>
  );
}
