import type { FormInstance, FormRule } from "antd";
import type { ZodType } from "zod";

type NamePath = (string | number)[];

/**
 * antd rule that checks one field against the shared zod schema, so the form
 * shows the same messages the server action would return.
 */
export function zodRule(schema: ZodType, name: string | NamePath): FormRule {
  const key = (Array.isArray(name) ? name : [name]).join(".");
  return ({ getFieldsValue }) => ({
    validator() {
      const result = schema.safeParse(getFieldsValue(true));
      if (result.success) return Promise.resolve();
      const issue = result.error.issues.find((i) => i.path.join(".") === key);
      return issue ? Promise.reject(new Error(issue.message)) : Promise.resolve();
    },
  });
}

/** Validates every field, then returns all form values (including ones not rendered) parsed by the schema. */
export async function validateWithZod<T>(form: FormInstance, schema: ZodType<T>): Promise<T | null> {
  try {
    await form.validateFields();
  } catch {
    return null;
  }
  const result = schema.safeParse(form.getFieldsValue(true));
  if (result.success) return result.data;
  form.setFields(result.error.issues.map((i) => ({ name: i.path as NamePath, errors: [i.message] })));
  return null;
}
