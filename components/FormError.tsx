import { Alert } from "antd";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <Alert type="error" showIcon title={message} role="alert" />;
}
