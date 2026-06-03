"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateProfile, type ProfileState } from "@/lib/actions/profile";
import { Button, Input, Label } from "@/components/ui/primitives";
import type { Profile } from "@/lib/types";

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, null);

  useEffect(() => {
    if (state?.ok) toast.success("Profile saved");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" defaultValue={profile.username} required />
        <p className="mt-1 text-xs text-muted">Your public URL: /u/{profile.username}</p>
      </div>
      <div>
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" defaultValue={profile.display_name ?? ""} />
      </div>
      <div>
        <Label htmlFor="bio">Bio</Label>
        <Input id="bio" name="bio" defaultValue={profile.bio ?? ""} placeholder="Optional" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_public" defaultChecked={profile.is_public} />
        Make my collection public
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-400">Saved.</p>}

      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
