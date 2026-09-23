"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Card, Checkbox, Form, Input, InputNumber, Select } from "antd";
import { ShieldAlert } from "lucide-react";
import type { AreaReference } from "@/types";
import { createHouseholdAction } from "@/lib/actions";
import { humanize } from "@/lib/labels";
import { validateWithZod, zodRule } from "@/lib/zodForm";
import {
  ASSETS,
  COOKING_FUELS,
  EDUCATION_LEVELS,
  EMPLOYMENT_TYPES,
  FLOOR_MATERIALS,
  ROOF_MATERIALS,
  SANITATION_TYPES,
  SHOCKS,
  TENURES,
  WALL_MATERIALS,
  WATER_SOURCES,
  newHouseholdSchema,
  type NewHouseholdInput,
} from "@/lib/validations/household";
import { FormError } from "@/components/FormError";

type SurveyKey = keyof NewHouseholdInput["survey"];
type ProtectedKey = keyof NewHouseholdInput["protected"];

const BOOL_DEFAULTS = Object.fromEntries(
  [
    "female_headed",
    "single_caregiver",
    "literacy_head",
    "electricity",
    "chronic_illness",
    "disability_in_household",
    ...ASSETS,
    ...SHOCKS,
  ].map((k) => [k, false]),
);

const NOT_DISCLOSED = "not_disclosed";

const INITIAL_VALUES = {
  area_code: undefined,
  notes: "",
  survey: { ...BOOL_DEFAULTS, dependents_requiring_care: 0, children_under_5: 0, members_over_65: 0 },
  protected: {
    gender_head: NOT_DISCLOSED,
    disability: NOT_DISCLOSED,
    age_band: NOT_DISCLOSED,
    ethnicity: "",
    religion: "",
    nationality: "",
    immigration_status: "",
  },
};

const rule = (name: string[]) => [zodRule(newHouseholdSchema, name)];

export function HouseholdForm({ areas, currency }: { areas: AreaReference[]; currency: string }) {
  const [form] = Form.useForm();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>();
  const [hasErrors, setHasErrors] = useState(false);

  async function onSubmit() {
    const values = await validateWithZod(form, newHouseholdSchema);
    setHasErrors(!values);
    if (!values) return;
    setServerError(undefined);
    startTransition(async () => {
      const result = await createHouseholdAction(values);
      if (result && "error" in result) setServerError(result.error);
    });
  }

  const num = (name: SurveyKey, label: string, opts: { required?: boolean; step?: number; extra?: string } = {}) => (
    <Form.Item
      name={["survey", name]}
      label={label}
      required={opts.required ?? true}
      rules={rule(["survey", name])}
      extra={opts.extra}
      dependencies={
        name === "household_size"
          ? [
              ["survey", "children_under_5"],
              ["survey", "members_over_65"],
            ]
          : undefined
      }
    >
      <InputNumber min={0} step={opts.step ?? 1} className="w-full" />
    </Form.Item>
  );

  const money = (name: SurveyKey, label: string, required = true) => (
    <Form.Item name={["survey", name]} label={label} required={required} rules={rule(["survey", name])}>
      <InputNumber<number>
        min={0}
        step={1000}
        className="w-full"
        suffix={currency}
        formatter={(v) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
        parser={(v) => (v ?? "").replace(/,/g, "") as unknown as number}
      />
    </Form.Item>
  );

  const select = (name: SurveyKey, label: string, options: readonly string[]) => (
    <Form.Item name={["survey", name]} label={label} rules={rule(["survey", name])}>
      <Select allowClear placeholder="Not recorded" options={options.map((o) => ({ value: o, label: humanize(o) }))} />
    </Form.Item>
  );

  const check = (name: SurveyKey, label: string) => (
    <Form.Item name={["survey", name]} valuePropName="checked" noStyle>
      <Checkbox>{label}</Checkbox>
    </Form.Item>
  );

  const protectedSelect = (name: ProtectedKey, label: string, options: string[]) => (
    <Form.Item name={["protected", name]} label={label}>
      <Select
        options={[{ value: NOT_DISCLOSED, label: "Not disclosed" }, ...options.map((o) => ({ value: o, label: humanize(o) }))]}
      />
    </Form.Item>
  );

  const protectedText = (name: ProtectedKey, label: string) => (
    <Form.Item name={["protected", name]} label={label} rules={rule(["protected", name])}>
      <Input placeholder="Leave blank if not disclosed" />
    </Form.Item>
  );

  const grid = "grid gap-x-5 sm:grid-cols-2 xl:grid-cols-3";

  return (
    <Form
      form={form}
      layout="vertical"
      size="large"
      requiredMark="optional"
      initialValues={INITIAL_VALUES}
      onFinish={onSubmit}
      onFinishFailed={() => setHasErrors(true)}
      scrollToFirstError={{ behavior: "smooth", block: "center" }}
      className="flex flex-col gap-6"
    >
      <FormError message={serverError} />
      {hasErrors && !serverError && <Alert type="warning" showIcon title="Some fields need attention. They're marked below." />}

      <Card title="Location">
        <div className={grid}>
          <Form.Item name="area_code" label="Area" required rules={rule(["area_code"])} className="sm:col-span-2">
            <Select
              showSearch={{ optionFilterProp: "label" }}
              placeholder="Choose an area"
              options={areas.map((a) => ({ value: a.area_code, label: `${a.area_name} (${a.urban_rural})` }))}
            />
          </Form.Item>
        </div>
      </Card>

      <Card title="Who lives here">
        <div className={grid}>
          {num("household_size", "Household size")}
          {num("children_under_5", "Children under 5")}
          {num("members_over_65", "Members over 65")}
          {num("dependents_requiring_care", "Dependents needing care")}
          {select("education_head", "Head's highest education", EDUCATION_LEVELS)}
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {check("female_headed", "Female-headed household")}
          {check("single_caregiver", "Single caregiver")}
          {check("literacy_head", "Head can read and write")}
        </div>
      </Card>

      <Card title="Housing">
        <div className={grid}>
          {num("rooms", "Rooms")}
          {select("tenure", "Tenure", TENURES)}
          {select("roof_material", "Roof", ROOF_MATERIALS)}
          {select("wall_material", "Walls", WALL_MATERIALS)}
          {select("floor_material", "Floor", FLOOR_MATERIALS)}
          {select("water_source", "Water source", WATER_SOURCES)}
          {select("sanitation_type", "Sanitation", SANITATION_TYPES)}
          {select("cooking_fuel", "Cooking fuel", COOKING_FUELS)}
        </div>
        {check("electricity", "Has electricity")}
      </Card>

      <Card title="Assets and land">
        <p className="mb-3 font-medium">Owned by the household</p>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ASSETS.map((a) => (
            <div key={a}>{check(a, humanize(a.slice(6)))}</div>
          ))}
        </div>
        <div className={grid}>
          {num("livestock_count", "Livestock (rural only)", { required: false })}
          {num("land_area", "Land in hectares (rural only)", { required: false, step: 0.1 })}
        </div>
      </Card>

      <Card title="Income and work">
        <div className={grid}>
          {select("employment_type", "Main employment", EMPLOYMENT_TYPES)}
          {num("earners_count", "People earning", { required: false })}
          {num("hours_worked", "Hours worked per week", { required: false, step: 0.5, extra: "Average over 4 weeks" })}
          {money("monthly_income", "Monthly income")}
          {money("essential_costs", "Essential costs per month")}
          {money("income_std_12m", "Income variation, 12 months", false)}
          {num("income_seasonality", "Income seasonality", {
            required: false,
            step: 0.05,
            extra: "Coefficient of variation",
          })}
        </div>
      </Card>

      <Card title="Wellbeing and shocks">
        <div className={grid}>
          {num("food_security_score", "Food insecurity score", { extra: "FIES, 0 to 8" })}
        </div>
        <div className="mb-6 flex flex-wrap gap-x-8 gap-y-3">
          {check("chronic_illness", "Someone has a chronic illness")}
          {check("disability_in_household", "Someone has a disability")}
        </div>
        <p className="mb-3 font-medium">In the last 12 months, the household experienced</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SHOCKS.map((s) => (
            <div key={s}>
              {check(
                s,
                humanize(s.replace("shock_", "").replace("_12m", "")) + (s === "shock_crop_failure_12m" ? " (rural)" : ""),
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card
        className="border-dashed"
        title={
          <span className="flex items-center gap-2.5">
            <ShieldAlert className="size-5 text-muted-foreground" />
            Audit-only information
          </span>
        }
      >
        <p className="mb-5 text-muted-foreground">Optional. Only used for fairness reporting, never for scoring.</p>
        <div className={grid}>
          {protectedSelect("gender_head", "Gender of household head", ["female", "male", "other"])}
          {protectedSelect("disability", "Head has a disability", ["yes", "no"])}
          {protectedSelect("age_band", "Age of household head", ["18-25", "26-35", "36-45", "46-55", "56-65", "66+"])}
          {protectedText("ethnicity", "Ethnicity")}
          {protectedText("religion", "Religion")}
          {protectedText("nationality", "Nationality")}
          {protectedText("immigration_status", "Immigration status")}
        </div>
      </Card>

      <Card>
        <Form.Item name="notes" label="Notes" rules={rule(["notes"])}>
          <Input.TextArea rows={3} showCount maxLength={500} placeholder="Anything the next caseworker should know" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={pending}>
          {pending ? "Saving…" : "Register household"}
        </Button>
      </Card>
    </Form>
  );
}
