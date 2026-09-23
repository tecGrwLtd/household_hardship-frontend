import "server-only";
import type { AreaReference, Caseworker, FundingCycle } from "@/types";
import { db } from "@/lib/mock/db";
import { delay } from "./utils";

export async function getAreas(): Promise<AreaReference[]> {
  await delay();
  return [...db.area_reference].sort((a, b) => a.area_name.localeCompare(b.area_name));
}

export async function getCaseworkers(): Promise<Caseworker[]> {
  await delay();
  return [...db.caseworkers];
}

export async function getFundingCycles(): Promise<FundingCycle[]> {
  await delay();
  return [...db.funding_cycles].sort((a, b) => b.period_start.localeCompare(a.period_start));
}

/** The cycle whose period contains today, or the latest one. */
export async function getCurrentCycle(): Promise<FundingCycle> {
  await delay();
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...db.funding_cycles].sort((a, b) => a.period_start.localeCompare(b.period_start));
  return sorted.find((c) => c.period_start <= today && today <= c.period_end) ?? sorted[sorted.length - 1];
}
