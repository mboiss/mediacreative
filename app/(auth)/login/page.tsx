import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const error = params.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <Card className="w-full max-w-md border-white/10 bg-slate-900/80 text-white backdrop-blur-2xl shadow-2xl">
        <CardHeader className="text-center flex flex-col items-center">
          <div className="mb-3 flex justify-center">
            <Image
              src="/logo.png"
              alt="Media Creative Logo"
              width={180}
              height={60}
              style={{ objectFit: "contain", height: "auto" }}
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Control Center Login
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            Enter your admin credentials to access the workspace
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 text-center">
              ⚠️ {error}
            </div>
          )}

          <form action={signIn} className="space-y-4">
            <div>
              <label className="text-xs text-slate-300 font-medium mb-1 block">Email</label>
              <Input
                name="email"
                type="email"
                placeholder="admin@mediacreative.com"
                defaultValue="admin@mediacreative.com"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium mb-1 block">Password</label>
              <Input
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-500"
              />
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-semibold text-white transition-all shadow-lg py-2">
              Sign In
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-white/5 bg-white/5 p-3 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-200">🔑 Kredensial Login Default:</p>
            <p><span className="text-slate-300 font-mono">Email:</span> admin@mediacreative.com</p>
            <p><span className="text-slate-300 font-mono">Password:</span> admin123456</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}