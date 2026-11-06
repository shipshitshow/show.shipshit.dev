/** The page title. The sidebar already lists the Library sections. */
export function LibraryHeader({ title }: { title: string }) {
  return (
    <header>
      <h1 className="text-2xl font-semibold">{title}</h1>
    </header>
  );
}
