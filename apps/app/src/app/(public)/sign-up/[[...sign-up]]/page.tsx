import { SignUp } from '@clerk/nextjs';
import { BrandPageShell } from '@/components/BrandPageShell';

export default function Page() {
  return (
    <BrandPageShell>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </BrandPageShell>
  );
}
