import { SidebarStateProvider } from '@/components/livestreams/SidebarStateContext';
import { ProductionShell } from '@/components/ProductionShell';
import { QueryProvider } from '@/components/QueryProvider';
import { requireProducerPage } from '@/lib/producer-auth';
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProducerPage();
  return (
    <QueryProvider>
      <SidebarStateProvider>
        <ProductionShell>{children}</ProductionShell>
      </SidebarStateProvider>
    </QueryProvider>
  );
}
