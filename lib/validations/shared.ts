import { z } from "zod";

// Form inputs arrive as "" (empty text/select) or NaN (empty number input
// registered with valueAsNumber). These helpers turn both into null/undefined.

const isBlank = (v: unknown) =>
  v === "" || v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));

export function requiredNumber(label: string, opts: { min?: number; max?: number; int?: boolean } = {}) {
  let n = z.number({ error: `${label} is required` });
  if (opts.int) n = n.int(`${label} must be a whole number`);
  if (opts.min !== undefined) n = n.min(opts.min, `${label} must be at least ${opts.min}`);
  if (opts.max !== undefined) n = n.max(opts.max, `${label} must be at most ${opts.max}`);
  return z.preprocess((v) => (isBlank(v) ? undefined : v), n);
}

export function optionalNumber(label: string, opts: { min?: number; max?: number; int?: boolean } = {}) {
  let n = z.number();
  if (opts.int) n = n.int(`${label} must be a whole number`);
  if (opts.min !== undefined) n = n.min(opts.min, `${label} must be at least ${opts.min}`);
  if (opts.max !== undefined) n = n.max(opts.max, `${label} must be at most ${opts.max}`);
  return z.preprocess((v) => (isBlank(v) ? null : v), n.nullable());
}

export function optionalEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess((v) => (isBlank(v) ? null : v), z.enum(values).nullable());
}

export function optionalText(max = 50) {
  return z.preprocess((v) => (isBlank(v) ? null : v), z.string().max(max).nullable());
}
