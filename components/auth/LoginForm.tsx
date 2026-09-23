"use client";

import { useState, useTransition } from "react";
import { Button, Form, Input } from "antd";
import { Lock, User } from "lucide-react";
import { loginAction } from "@/lib/auth/actions";
import { loginSchema } from "@/lib/validations/auth";
import { validateWithZod, zodRule } from "@/lib/zodForm";
import { FormError } from "@/components/FormError";

// Mock accounts from lib/api/auth.ts. Remove once the real backend login is wired up.
const testAccounts = [
  { label: "Admin", username: "admin", password: "admin-dev-only" },
  { label: "Caseworker", username: "juwase", password: "caseworker-dev-only" },
];

export function LoginForm({ next }: { next?: string }) {
  const [form] = Form.useForm();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>();

  async function onSubmit() {
    const values = await validateWithZod(form, loginSchema);
    if (!values) return;
    setServerError(undefined);
    startTransition(async () => {
      const result = await loginAction(values, next);
      if (result?.error) setServerError(result.error);
    });
  }

  function fillTestAccount(username: string, password: string) {
    form.setFieldsValue({ username, password });
    form.validateFields();
    setServerError(undefined);
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-base text-muted-foreground">Log in with your staff account.</p>

      <Form
        form={form}
        layout="vertical"
        size="large"
        requiredMark={false}
        onFinish={onSubmit}
        initialValues={{ username: "", password: "" }}
        className="mt-8"
      >
        {serverError && (
          <div className="mb-5">
            <FormError message={serverError} />
          </div>
        )}
        <Form.Item label="Username" name="username" rules={[zodRule(loginSchema, "username")]}>
          <Input
            autoComplete="username"
            autoCapitalize="none"
            prefix={<User className="size-4 text-muted-foreground" />}
            placeholder="Your username"
          />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[zodRule(loginSchema, "password")]}>
          <Input.Password
            autoComplete="current-password"
            prefix={<Lock className="size-4 text-muted-foreground" />}
            placeholder="Your password"
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={pending} className="mt-2">
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </Form>

      <div className="mt-10 rounded-xl border border-dashed border-border bg-muted/40 p-4">
        <p className="text-sm font-medium text-muted-foreground">Test accounts</p>
        <ul className="mt-2 flex flex-col gap-1">
          {testAccounts.map(({ label, username, password }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="w-24 text-sm text-muted-foreground">{label}</span>
              <span className="font-mono text-sm">
                {username} / {password}
              </span>
              <Button type="link" size="small" className="ml-auto" onClick={() => fillTestAccount(username, password)}>
                Use
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
