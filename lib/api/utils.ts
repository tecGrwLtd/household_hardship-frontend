import "server-only";

/** Simulated network latency for the mock layer. */
export function delay(ms = 60): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface Page<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function paginate<T>(rows: T[], page = 1, pageSize = 25): Page<T> {
  const p = Math.max(1, page);
  return { rows: rows.slice((p - 1) * pageSize, p * pageSize), total: rows.length, page: p, pageSize };
}

export class ApiError extends Error {}
