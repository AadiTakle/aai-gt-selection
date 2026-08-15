type SurfacePlaceholderProps = {
  description: string;
  title: string;
};

export function SurfacePlaceholder({ description, title }: SurfacePlaceholderProps) {
  return (
    <section className="surface-placeholder">
      <p className="eyebrow">Architecture shell</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <p className="boundary">
        Eligibility only. No live admissions, allocation, or program-effect claim.
      </p>
    </section>
  );
}
