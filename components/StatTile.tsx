import Link from "next/link";
import { Card, Progress } from "antd";
import { TriangleAlert } from "lucide-react";

export function StatTile({
  label,
  value,
  detail,
  href,
  warning,
  children,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  href?: string;
  warning?: string;
  children?: React.ReactNode;
}) {
  const card = (
    <Card hoverable={!!href} className="h-full">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-[1.75rem] leading-tight font-semibold tracking-tight">{value}</p>
      {detail && <p className="mt-1.5 text-sm text-muted-foreground">{detail}</p>}
      {children}
      {warning && (
        <p className="mt-3 flex items-start gap-1.5 text-sm font-medium text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {warning}
        </p>
      )}
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  ) : (
    card
  );
}

export function Meter({
  value,
  max,
  label,
  showInfo = false,
  className = "mt-2 mb-0",
}: {
  value: number;
  max: number;
  label: string;
  showInfo?: boolean;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <Progress
      percent={Math.round(pct * 10) / 10}
      showInfo={showInfo}
      size="small"
      aria-label={label}
      className={className}
      strokeColor="#009966"
    />
  );
}
