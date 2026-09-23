"use client";

import { useState } from "react";
import { Input } from "antd";
import { Search } from "lucide-react";
import { useSearchParamNav } from "./useSearchParamNav";

export function SearchBox({ placeholder, name = "q" }: { placeholder: string; name?: string }) {
  const nav = useSearchParamNav();
  const [value, setValue] = useState(nav.searchParams.get(name) ?? "");
  const id = `search-${name}`;

  return (
    <form
      role="search"
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        nav.set(name, value.trim() || undefined);
      }}
    >
      <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        Search
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        prefix={<Search className="size-4 text-muted-foreground" />}
        allowClear
        onClear={() => nav.set(name, undefined)}
        className="w-72"
      />
    </form>
  );
}
