import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, Button, Badge, EmptyState, Spinner } from "@/components/ui";
import { useAccounts, useDisconnectAccount, useSyncAccount } from "@/hooks/useApi";
import { authApi } from "@/services/api";
import { Link2, RefreshCw, Trash2, Youtube, Instagram, Linkedin, Twitter } from "lucide-react";
import { format } from "date-fns";

const PLATFORMS = [
  { id: "youtube",   label: "YouTube",     icon: Youtube,   color: "bg-red-50 text-red-500"   },
  { id: "instagram", label: "Instagram",   icon: Instagram, color: "bg-pink-50 text-pink-500" },
  { id: "linkedin",  label: "LinkedIn",    icon: Linkedin,  color: "bg-blue-50 text-blue-600" },
  { id: "x",         label: "X (Twitter)", icon: Twitter,   color: "bg-surface-100 text-ink-secondary" },
];

async function connectPlatform(platform: string) {
  try {
    const resp = await authApi.oauthStart(platform);
    window.location.href = resp.data.redirect_url;
  } catch (err) {
    console.error(err);
  }
}

export default function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts();
  const disconnect = useDisconnectAccount();
  const sync = useSyncAccount();

  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = async (accountId: string) => {
    setSyncingId(accountId);
    try {
      await sync.mutateAsync(accountId);
    } finally {
      setSyncingId(null);
    }
  };

  const connectedSet = new Set(accounts?.map((a: any) => a.platform) ?? []);

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-ink">Connected Accounts</h1>
          <p className="text-sm text-ink-secondary mt-0.5">Connect your social platforms to start creating content.</p>
        </div>

        {/* ── Connect a platform ────────────────────────────────────── */}
        <Card>
          <p className="text-sm font-semibold text-ink mb-4">Connect a Platform</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PLATFORMS.map(({ id, label, icon: Icon, color }) => {
              const connected = connectedSet.has(id);
              return (
                <button
                  key={id}
                  onClick={() => !connected && connectPlatform(id)}
                  disabled={connected}
                  className={[
                    "flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all text-center",
                    connected
                      ? "border-green-200 bg-green-50/50 cursor-default"
                      : "border-surface-200 hover:border-brand-300 hover:shadow-card-md cursor-pointer bg-white",
                  ].join(" ")}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-sm font-medium text-ink">{label}</span>
                  {connected && <Badge color="green">Connected</Badge>}
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── Connected accounts list ───────────────────────────────── */}
        <div>
          <p className="text-sm font-semibold text-ink mb-3">Your Accounts</p>
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : !accounts?.length ? (
            <Card>
              <EmptyState
                icon={<Link2 size={44} />}
                title="No accounts connected"
                description="Connect at least 2 platforms to unlock all features."
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {accounts.map((account: any) => {
                const platform = PLATFORMS.find((p) => p.id === account.platform);
                const Icon = platform?.icon ?? Link2;
                const isSyncing = syncingId === account.id;
                return (
                  <Card key={account.id} padding="sm" className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${platform?.color ?? "bg-surface-100 text-ink-secondary"}`}>
                      <Icon size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-ink text-sm">{platform?.label ?? account.platform}</p>
                        <Badge color={account.is_active ? "green" : "red"}>
                          {account.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {account.platform_username && (
                        <p className="text-xs text-ink-secondary">@{account.platform_username}</p>
                      )}
                      {account.last_synced_at && (
                        <p className="text-xs text-ink-tertiary mt-0.5">
                          Synced {format(new Date(account.last_synced_at), "MMM d, h:mm a")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={isSyncing}
                        onClick={() => handleSync(account.id)}
                      >
                        <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
                        {isSyncing ? "Syncing…" : "Sync"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => disconnect.mutate(account.id)}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
