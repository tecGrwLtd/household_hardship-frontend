import Link from "next/link";
import { Breadcrumb } from "antd";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  extra,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Parent pages, e.g. [{ href: "/households", label: "Households" }, { label: "Register" }]. */
  breadcrumb?: { href?: string; label: string }[];
  /** Shown next to the title, e.g. a status tag. */
  extra?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {breadcrumb && (
        <Breadcrumb
          className="mb-2"
          items={breadcrumb.map((b) => ({ title: b.href ? <Link href={b.href}>{b.label}</Link> : b.label }))}
        />
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">{title}</h1>
            {extra}
          </div>
          {description && <p className="mt-1.5 text-base text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
