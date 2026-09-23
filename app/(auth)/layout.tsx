import { Scale } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <aside className="hidden flex-col bg-[#1c3a2b] px-14 py-12 text-[#efeadd] lg:flex">
        <Brand tone="dark" />

        <div className="my-auto max-w-md py-12">
          <p className="text-3xl leading-snug font-medium tracking-tight">
            Each funding cycle has a fixed budget. Applications are ranked by need, and anything close to the cutoff
            goes to a caseworker.
          </p>
        </div>

        <p className="text-base text-[#efeadd]/60">Internal use only.</p>
      </aside>

      <main className="flex flex-col px-6 py-8 sm:px-10 lg:px-16">
        <div className="lg:hidden">
          <Brand tone="light" />
        </div>
        <div className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}

function Brand({ tone }: { tone: "light" | "dark" }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={
          tone === "dark"
            ? "flex size-10 items-center justify-center rounded-xl bg-[#efeadd] text-[#1c3a2b]"
            : "flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
        }
      >
        <Scale className="size-5" />
      </span>
      <span className="text-xl font-semibold tracking-tight">Hardship Allocation</span>
    </div>
  );
}
