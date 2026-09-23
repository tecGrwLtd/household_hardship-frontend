import { Empty } from "antd";
import type { LucideIcon } from "lucide-react";
import { LinkButton } from "./LinkButton";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14">
      <Empty
        image={
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
            <Icon className="size-8 text-muted-foreground" />
          </span>
        }
        description={
          <>
            <span className="block text-base font-semibold text-foreground">{title}</span>
            {description && <span className="mt-1 block text-sm text-muted-foreground">{description}</span>}
          </>
        }
      >
        {actionLabel && actionHref && (
          <LinkButton type="primary" href={actionHref}>
            {actionLabel}
          </LinkButton>
        )}
      </Empty>
    </div>
  );
}
