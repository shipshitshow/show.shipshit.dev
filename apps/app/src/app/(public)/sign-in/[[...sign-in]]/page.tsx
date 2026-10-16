import { SignIn } from '@clerk/nextjs';
import { BrandPageShell } from '@/components/BrandPageShell';

export default function Page() {
  return (
    <BrandPageShell>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/studio"
      />
    </BrandPageShell>
  );
}
