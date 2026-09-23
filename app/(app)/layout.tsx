import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getReviewQueueCount } from "@/lib/api/reviews";
import { getCurrentCycle } from "@/lib/api/reference";
import { AppShell } from "@/components/shell/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/logout");
  const queueCount = await getReviewQueueCount((await getCurrentCycle()).cycle_id);

  return (
    <AppShell
      user={{ display_name: user.display_name, role: user.role }}
      isAdmin={user.role === "admin"}
      queueCount={queueCount}
    >
      {children}
    </AppShell>
  );
}
