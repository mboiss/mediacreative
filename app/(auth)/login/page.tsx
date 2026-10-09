import Image from "next/image";
import { AlertTriangle, LogIn } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Field, TextInput } from "@/components/ui/field";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const error = params.error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-10 sm:px-6">
      <Panel className="w-full max-w-md" bodyClassName="p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="Media Creative Logo"
            width={180}
            height={60}
            className="mb-4 h-auto w-[160px] object-contain sm:w-[180px]"
            priority
          />
          <h1 className="text-2xl font-bold tracking-tight text-fg">Control Center Login</h1>
          <p className="mt-1.5 text-sm text-fg-muted">Enter your admin credentials to access the workspace</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-control border border-danger-border bg-danger-bg p-3 text-sm text-danger"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <form action={signIn} className="flex flex-col gap-4">
          <Field label="Email" htmlFor="login-email">
            <TextInput
              id="login-email"
              name="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
          </Field>

          <Field label="Password" htmlFor="login-password">
            <TextInput
              id="login-password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </Field>

          <button type="submit" className="btn btn-primary mt-2 w-full justify-center">
            <LogIn size={16} aria-hidden />
            Sign In
          </button>
        </form>
      </Panel>
    </main>
  );
}
