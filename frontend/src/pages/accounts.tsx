import { Layout } from "@/components/Layout";
import { Card, Button, Badge, EmptyState, Spinner } from "@/components/ui";
import { useAccounts, useDisconnectAccount, useSyncAccount } from "@/hooks/useApi";
import { Link2, RefreshCw, Trash2, Youtube, Instagram, Linkedin, Twitter, Mail } from "lucide-react";
import { format } from "date-fns";

const PLATFORMS = [
  { id: "youtube", label: "YouTube", icon: Youtube, color: "bg-red-50 text-red-600" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "bg-pink-50 text-pink-600" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "bg-blue-50 text-blue-700" },
  { id: "x", label: "X (Twitter)", icon: Twitter, color: "bg-gray-50 text-gray-700" },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function connectPlatform(platform: string) {
  const token = localStorage.getItem("access_token");
  window.location.href = `${API_URL}/auth/oauth/${platform}/start?token=${token}`;
}

export default function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts();
  const disconnect = useDisconnectAccount();
  const sync = useSyncAccount();

  const connectedPlatforms = new Set(accounts?.map((a: any) => a.platform) ?? []);

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connected Accounts</h1>
          <p className="text-gray-500 mt-1">Connect your social platforms to start creating content.</p>
        </div>

        {/* Connect platforms */}
        <Card>
          <h2 className="font-semibold text-gray-800 mb-4">Connect a Platform</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PLATFORMS.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => connectPlatform(id)}
                disabled={connectedPlatforms.has(id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                  ${connectedPlatforms.has(id)
                    ? "border-green-200 bg-green-50 cursor-default"
                    : "border-gray-200 hover:border-brand-400 hover:shadow-sm cursor-pointer"
                  }`}
              >
                <div className={`p-2 rounded-lg ${color}`}>
                  <Icon size={20} />
                </div>
                <span className="text-sm font-medium text-gray-700">{label}</span>
                {connectedPlatforms.has(id) && (
                  <Badge color="green">Connected</Badge>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Connected accounts list */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-4">Your Accounts</h2>
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : accounts?.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Link2 size={48} />}
                title="No accounts connected"
                description="Connect at least 2 platforms to unlock all features."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {accounts?.map((account: any) => {
                const platform = PLATFORMS.find((p) => p.id === account.platform);
                const Icon = platform?.icon || Link2;
                return (
                  <Card key={account.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${platform?.color || "bg-gray-50 text-gray-600"}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{platform?.label || account.platform}</p>
                        {account.platform_username && (
                          <p className="text-sm text-gray-500">@{account.platform_username}</p>
                        )}
                        {account.last_synced_at && (
                          <p className="text-xs text-gray-400">
                            Last synced {format(new Date(account.last_synced_at), "MMM d, h:mm a")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge color={account.is_active ? "green" : "red"}>
                        {account.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={sync.isPending}
                        onClick={() => sync.mutate(account.id)}
                      >
                        <RefreshCw size={14} />
                        Sync
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => disconnect.mutate(account.id)}
                      >
                        <Trash2 size={14} className="text-red-500" />
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