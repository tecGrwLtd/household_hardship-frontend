"use client";

import { Pagination as AntPagination } from "antd";
import { useSearchParamNav } from "./useSearchParamNav";

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const nav = useSearchParamNav();
  return (
    <div className="mt-5 flex justify-end">
      <AntPagination
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        showTotal={(t, [from, to]) => `${from.toLocaleString()}–${to.toLocaleString()} of ${t.toLocaleString()}`}
        onChange={(p) => nav.set("page", p > 1 ? String(p) : undefined)}
      />
    </div>
  );
}
