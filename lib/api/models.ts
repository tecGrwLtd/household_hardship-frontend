import "server-only";
import type { ModelVersion } from "@/types";
import { db } from "@/lib/mock/db";
import { delay } from "./utils";

// Training happens in the backend (`python -m backend.ml train`); the
// frontend only lists versions and shows which one is active.

export async function getModelVersions(): Promise<ModelVersion[]> {
  await delay();
  return [...db.model_versions];
}
