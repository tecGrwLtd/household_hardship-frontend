"use client";

import { Select } from "antd";
import { useSearchParamNav } from "./useSearchParamNav";

/** A select that writes its value to the URL (and resets paging). */
export function FilterSelect({
  name,
  label,
  options,
  allLabel = "All",
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  const nav = useSearchParamNav();
  const value = nav.searchParams.get(name) ?? "";
  const id = `filter-${name}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <Select
        id={id}
        value={value}
        onChange={(next) => nav.set(name, next)}
        options={[{ value: "", label: allLabel }, ...options]}
        showSearch={options.length > 8 ? { optionFilterProp: "label" } : false}
        popupMatchSelectWidth={false}
        className="min-w-44"
      />
    </div>
  );
}
