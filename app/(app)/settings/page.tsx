import { getMyProfile } from "@/lib/queries";
import { SettingsForm } from "@/components/settings-form";
import { AccountActions } from "@/components/account-actions";
import { Panel } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getMyProfile();

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="font-display text-lg uppercase tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted">Your public profile and sharing preferences.</p>
      <Panel className="mt-6 p-6">
        {profile ? <SettingsForm profile={profile} /> : <p className="text-sm text-muted">No profile found.</p>}
      </Panel>
      {profile && (
        <Panel className="mt-4 p-6">
          <AccountActions username={profile.username} />
        </Panel>
      )}
    </div>
  );
}
