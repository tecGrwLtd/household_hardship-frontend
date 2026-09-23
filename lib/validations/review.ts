import { z } from "zod";
import { optionalNumber } from "./shared";

export const reviewSchema = z
  .object({
    application_id: z.number().int(),
    final_decision: z.enum(["approved", "deferred", "appeal_upheld"], {
      error: "Choose a decision",
    }),
    award_amount: optionalNumber("Award amount", { min: 1 }),
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => v.final_decision === "deferred" || (v.award_amount ?? 0) > 0, {
    message: "Enter the award amount",
    path: ["award_amount"],
  });

export type ReviewInput = z.input<typeof reviewSchema>;
export type ReviewValues = z.output<typeof reviewSchema>;
