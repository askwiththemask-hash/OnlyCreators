import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ username: "", email: "", password: "", accountType: "customer" as "customer" | "creator" });
  const [error, setError] = useState("");
  const register = useRegister();

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    register.mutate(
      { data: form },
      {
        onSuccess: (data) => {
          localStorage.setItem("auth_token", data.token);
          queryClient.invalidateQueries();
          setLocation(form.accountType === "creator" ? "/dashboard/profile" : "/");
        },
        onError: (err: unknown) => {
          const apiErr = err as { data?: { error?: string }; message?: string };
          setError(apiErr?.data?.error ?? apiErr?.message ?? "Registration failed");
        },
      }
    );
  };

  return (
    <MainLayout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Join Only Creators</h1>
            <p className="text-muted-foreground mt-2">The premium gaming creator marketplace</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-card p-8 shadow-[0_0_80px_-20px_hsl(var(--primary)/0.3)]">
            {/* Account type selector */}
            <div className="flex rounded-xl overflow-hidden border border-white/10 mb-6">
              <button
                type="button"
                onClick={() => update("accountType", "customer")}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${form.accountType === "customer" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
              >
                I'm a Customer
              </button>
              <button
                type="button"
                onClick={() => update("accountType", "creator")}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${form.accountType === "creator" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
              >
                I'm a Creator
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="GamingLegend123" value={form.username} onChange={(e) => update("username", e.target.value)} required minLength={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Min 6 characters" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button type="submit" className="w-full h-12 text-base font-bold shadow-[0_0_30px_-5px_hsl(var(--primary))]" disabled={register.isPending}>
                {register.isPending ? "Creating account…" : form.accountType === "creator" ? "Create Creator Account" : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
