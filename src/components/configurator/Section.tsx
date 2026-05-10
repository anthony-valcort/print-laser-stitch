export function Section({
  title,
  value,
  icon,
  children,
}: {
  title: string;
  value?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>
        {value && (
          <span className="flex items-center gap-1.5 text-sm text-foreground-muted">
            {icon}
            <span className="text-foreground">{value}</span>
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
