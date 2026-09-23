"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { App, Button } from "antd";
import type { ActionResult } from "@/lib/actions";

export function ActionButton({
  action,
  label,
  pendingLabel,
  confirm,
  variant = "default",
}: {
  action: () => Promise<ActionResult>;
  label: string;
  pendingLabel: string;
  confirm?: string;
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result) message.error(result.error);
      else {
        message.success(result?.message ?? "Done.");
        router.refresh();
      }
    });
  }

  return (
    <Button
      type={variant === "default" ? "primary" : "default"}
      size="large"
      loading={pending}
      onClick={() => {
        if (!confirm) return run();
        modal.confirm({ title: label, content: confirm, okText: label, onOk: run });
      }}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
