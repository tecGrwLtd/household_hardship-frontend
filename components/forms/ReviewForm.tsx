"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Form, Input, InputNumber, Radio } from "antd";
import { submitReviewAction } from "@/lib/actions";
import { reviewSchema } from "@/lib/validations/review";
import { validateWithZod, zodRule } from "@/lib/zodForm";
import { FormError } from "@/components/FormError";

export function ReviewForm({
  applicationId,
  isAppeal,
  lean,
  amountRequested,
  currency,
}: {
  applicationId: number;
  isAppeal: boolean;
  lean: "approve" | "defer";
  amountRequested: number;
  currency: string;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>();
  const approveValue = isAppeal ? "appeal_upheld" : "approved";

  const decision = Form.useWatch("final_decision", form);
  const approving = decision !== undefined && decision !== "deferred";
  const overriding = decision !== undefined && (lean === "approve") !== approving;

  async function onSubmit() {
    const values = await validateWithZod(form, reviewSchema);
    if (!values) return;
    setServerError(undefined);
    startTransition(async () => {
      const result = await submitReviewAction(values);
      if (result && "error" in result) setServerError(result.error);
      else {
        message.success("Decision recorded.");
        router.refresh();
      }
    });
  }

  const options = [
    {
      value: approveValue,
      title: isAppeal ? "Uphold the appeal and award" : "Approve and award",
      hint: "Creates an award for the amount below.",
    },
    { value: "deferred", title: "Defer", hint: "The applicant can still appeal." },
  ];

  return (
    <Form
      form={form}
      layout="vertical"
      size="large"
      requiredMark={false}
      initialValues={{ application_id: applicationId, award_amount: amountRequested, notes: "" }}
      onFinish={onSubmit}
    >
      {serverError && (
        <div className="mb-4">
          <FormError message={serverError} />
        </div>
      )}
      <p className="mb-5 text-muted-foreground">
        Model leans <strong className="font-medium text-foreground">{lean === "approve" ? "approve" : "defer"}</strong>.
        Deciding the other way is logged as an override.
      </p>

      <Form.Item name="final_decision" label="Decision" rules={[zodRule(reviewSchema, "final_decision")]}>
        <Radio.Group className="grid w-full gap-3 sm:grid-cols-2">
          {options.map((o) => (
            <Radio
              key={o.value}
              value={o.value}
              className={`m-0 rounded-lg border p-4 transition-colors ${
                decision === o.value ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <span className="block font-medium">{o.title}</span>
              <span className="block text-sm text-muted-foreground">{o.hint}</span>
            </Radio>
          ))}
        </Radio.Group>
      </Form.Item>

      {approving && (
        <Form.Item
          name="award_amount"
          label="Award amount"
          rules={[zodRule(reviewSchema, "award_amount")]}
          className="max-w-xs"
        >
          <InputNumber min={1} step={1000} suffix={currency} className="w-full" />
        </Form.Item>
      )}

      <Form.Item
        name="notes"
        label={overriding ? "Notes (required for an override)" : "Notes (optional)"}
        dependencies={["final_decision"]}
        rules={[
          zodRule(reviewSchema, "notes"),
          {
            validator: (_, v: string | undefined) =>
              overriding && (v ?? "").trim().length < 10
                ? Promise.reject(new Error("Explain why you are going against the model (at least 10 characters)."))
                : Promise.resolve(),
          },
        ]}
      >
        <Input.TextArea rows={3} />
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={pending}>
        {pending ? "Saving…" : "Record decision"}
      </Button>
    </Form>
  );
}
