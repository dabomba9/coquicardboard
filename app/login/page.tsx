"use client";

import { useActionState } from "react";
import { sendMagicLink, signInWithGoogle } from "@/lib/actions/auth";
import { Button, Input, Label, Panel } from "@/components/ui/primitives";

export default function LoginPage() {
  const [state, action, pending] = useActionState(sendMagicLink, null as
    | null
    | { error?: string; ok?: boolean; email?: string });

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted">
        Track your Michael Jordan collection across the hierarchy.
      </p>

      <Panel className="mt-6 p-6">
        {state?.ok ? (
          <p className="text-sm">
            Check <span className="font-medium">{state.email}</span> for a magic link to sign in.
          </p>
        ) : (
          <form action={action} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>
            {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Sending…" : "Email me a magic link"}
            </Button>
          </form>
        )}

        <div className="my-4 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <form action={signInWithGoogle}>
          <Button type="submit" variant="secondary" className="w-full">
            Continue with Google
          </Button>
        </form>
      </Panel>
    </div>
  );
}
