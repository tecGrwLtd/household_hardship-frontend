"use client";

import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "antd";

/** An antd Button that navigates client-side like next/link. */
export function LinkButton({ href, ...props }: Omit<ButtonProps, "href" | "onClick"> & { href: string }) {
  const router = useRouter();
  return (
    <Button
      {...props}
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        router.push(href);
      }}
    />
  );
}
