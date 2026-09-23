"use client";

import { Table } from "antd";

export interface DataColumn {
  key: string;
  title: React.ReactNode;
  align?: "left" | "right" | "center";
  width?: number | string;
}

/**
 * antd Table for server pages. Server components can't pass render functions,
 * so each row carries its cells already rendered, keyed by column key.
 */
export function DataTable({
  columns,
  rows,
  highlightKey,
  highlightTitle,
  minWidth = 720,
  bordered = true,
}: {
  columns: DataColumn[];
  rows: ({ key: string | number } & Record<string, React.ReactNode>)[];
  /** One row to mark with a heavier top border, e.g. where the budget runs out. */
  highlightKey?: string | number;
  highlightTitle?: string;
  minWidth?: number;
  bordered?: boolean;
}) {
  return (
    <div className={bordered ? "overflow-hidden rounded-xl border border-border bg-card" : undefined}>
      <Table
        size="middle"
        pagination={false}
        scroll={{ x: minWidth }}
        // Cells arrive from the server as React nodes, some of them lazy references; rendering them
        // through a fragment lets React resolve those instead of rc-table dropping them.
        columns={columns.map((c) => ({
          key: c.key,
          dataIndex: c.key,
          title: c.title,
          align: c.align,
          width: c.width,
          render: (value: React.ReactNode) => <>{value}</>,
        }))}
        dataSource={rows}
        rowClassName={(r) => (r.key === highlightKey ? "cutoff-row" : "")}
        onRow={(r) => (r.key === highlightKey && highlightTitle ? { title: highlightTitle } : {})}
      />
    </div>
  );
}
