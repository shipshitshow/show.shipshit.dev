import { SignIn } from '@clerk/nextjs';
import { AuthShell } from '@/components/AuthShell';

export default function Page() {
  return (
    <AuthShell>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/studio"
      />
    </AuthShell>
  );
}
