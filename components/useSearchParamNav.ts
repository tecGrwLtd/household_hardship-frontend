"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Returns a function that writes one query param to the URL (and resets paging unless it's the page itself). */
export function useSearchParamNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return {
    searchParams,
    set(name: string, value: string | undefined) {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(name, value);
      else params.delete(name);
      if (name !== "page") params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
  };
}
