"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Card, Checkbox, Form, Input, InputNumber, Select } from "antd";
import { createApplicationAction } from "@/lib/actions";
import { CHANNEL_LABELS, NEED_CATEGORY_LABELS, humanize } from "@/lib/labels";
import { validateWithZod, zodRule } from "@/lib/zodForm";
import { CHANNELS, NEED_CATEGORIES, REFERRAL_SOURCES, newApplicationSchema } from "@/lib/validations/application";
import { FormError } from "@/components/FormError";

const rule = (name: string) => [zodRule(newApplicationSchema, name)];

export function ApplicationForm({
  householdId,
  currency,
  cycleName,
}: {
  householdId?: string;
  currency: string;
  cycleName: string;
}) {
  const [form] = Form.useForm();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>();

  async function onSubmit() {
    const values = await validateWithZod(form, newApplicationSchema);
    if (!values) return;
    setServerError(undefined);
    startTransition(async () => {
      const result = await createApplicationAction(values);
      if (result && "error" in result) setServerError(result.error);
    });
  }

  const money = { min: 0, step: 1000, className: "w-full", suffix: currency } as const;

  return (
    <Form
      form={form}
      layout="vertical"
      size="large"
      requiredMark="optional"
      initialValues={{ household_id: householdId ?? "", referral_source: undefined, documentation_provided: false }}
      onFinish={onSubmit}
      className="flex flex-col gap-6"
    >
      <FormError message={serverError} />

      <Card title="Applicant">
        <div className="grid gap-x-5 lg:grid-cols-3">
          <Form.Item
            name="household_id"
            label="Household ID"
            required
            rules={rule("household_id")}
            extra="Register the household first if it's new."
            className="lg:col-span-2"
          >
            <Input className="font-mono" placeholder="e.g. 88f7a85b-af58-43b6-976f-37dc44406262" />
          </Form.Item>
          <Form.Item name="application_channel" label="How it came in" required rules={rule("application_channel")}>
            <Select placeholder="Choose…" options={CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABELS[c] }))} />
          </Form.Item>
          <Form.Item name="referral_source" label="Referred by" rules={rule("referral_source")}>
            <Select
              allowClear
              placeholder="Not recorded"
              options={REFERRAL_SOURCES.map((r) => ({ value: r, label: humanize(r) }))}
            />
          </Form.Item>
        </div>
      </Card>

      <Card title="Need">
        <div className="grid gap-x-5 sm:grid-cols-2 xl:grid-cols-4">
          <Form.Item name="need_category" label="Need" required rules={rule("need_category")}>
            <Select
              placeholder="Choose…"
              options={NEED_CATEGORIES.map((c) => ({ value: c, label: NEED_CATEGORY_LABELS[c] }))}
            />
          </Form.Item>
          <Form.Item name="amount_requested" label="Amount requested" required rules={rule("amount_requested")}>
            <InputNumber {...money} min={1} />
          </Form.Item>
          <Form.Item name="stated_need_amount" label="Amount that would close the gap" rules={rule("stated_need_amount")}>
            <InputNumber {...money} />
          </Form.Item>
          <Form.Item
            name="days_since_hardship_onset"
            label="Days since the hardship began"
            rules={rule("days_since_hardship_onset")}
          >
            <InputNumber min={0} step={1} className="w-full" />
          </Form.Item>
        </div>
        <Form.Item name="documentation_provided" valuePropName="checked" className="mb-0">
          <Checkbox>Supporting documents provided</Checkbox>
        </Form.Item>
      </Card>

      <Alert
        type="info"
        showIcon
        title={
          <>
            Goes into <strong>{cycleName}</strong>. Tell the applicant the budget is fixed, so the outcome also depends on
            who else applies.
          </>
        }
      />

      <div>
        <Button type="primary" size="large" htmlType="submit" loading={pending}>
          {pending ? "Saving…" : "Submit application"}
        </Button>
      </div>
    </Form>
  );
}
