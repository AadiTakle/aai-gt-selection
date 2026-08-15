const surfaces = [
  ['Family portal', '/family', 'Application, status, Snapshot, and correction shell.'],
  ['Reviewer workspace', '/review', 'Blind assigned-case review shell.'],
  ['Admissions dashboard', '/admissions', 'Routing, pending, and correction shell.'],
  ['Configuration and audit', '/config-audit', 'Policy, replay, and audit shell.'],
] as const;

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const { auth } = await searchParams;
  return (
    <>
      <p className="eyebrow">Mode A linked sub-application</p>
      <h1>GT Admissions architecture shell</h1>
      <p>
        Role-scoped placeholders verify the application boundary before any admissions workflow or
        decision logic is implemented.
      </p>
      {auth === 'required' ? (
        <p className="boundary">
          Please <a href="/login">sign in</a> to continue.
        </p>
      ) : (
        <p>
          <a href="/login">Sign in</a> to reach your portal.
        </p>
      )}
      <div className="surface-grid">
        {surfaces.map(([title, href, description]) => (
          <a className="surface-card" href={href} key={href}>
            <strong>{title}</strong>
            <p>{description}</p>
          </a>
        ))}
      </div>
    </>
  );
}
