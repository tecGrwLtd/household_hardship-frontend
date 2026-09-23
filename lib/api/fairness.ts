import "server-only";
import { fairnessAudit } from "@/lib/mock/views";
import { delay } from "./utils";

/**
 * fairness_audits rows (output of the spec's audit()) for one cycle, or all
 * cycles pooled when cycleId is null. The only API that uses protected
 * attributes, and only in aggregate.
 */
export async function getFairnessAudit(cycleId: number | null) {
  await delay();
  return fairnessAudit(cycleId);
}
