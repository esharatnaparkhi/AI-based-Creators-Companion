import { Layout } from "@/components/Layout";
import { Card, Badge, Spinner } from "@/components/ui";
import { useAnalyticsSummary, useAccounts, useDrafts, useScheduledJobs } from "@/hooks/useApi";
import { useAuthStore } from "@/store/auth";
import { TrendingUp, TrendingDown, Minus, Eye, Heart, MessageCircle, Layers } from "lucide-react";
import Link from "next/link";

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="p-2 bg-brand-50 rounded-lg text-brand-600">{icon}</div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsSummary();
  const { data: accounts } = useAccounts();
  const { data: drafts } = useDrafts();
  const { data: jobs } = useScheduledJobs();

  const trend = analytics?.recent_trend;
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-gray-400";

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good morning, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your content.</p>
        </div>

        {/* Quick stats */}
        {analyticsLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Posts" value={analytics?.total_posts ?? 0} icon={<Layers size={20} />} />
            <StatCard label="Total Likes" value={analytics?.total_likes?.toLocaleString() ?? 0} icon={<Heart size={20} />} />
            <StatCard label="Comments" value={analytics?.total_comments?.toLocaleString() ?? 0} icon={<MessageCircle size={20} />} />
            <StatCard label="Views" value={analytics?.total_views?.toLocaleString() ?? 0} icon={<Eye size={20} />} />
          </div>
        )}

        {/* Status row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <p className="text-sm font-medium text-gray-700 mb-2">Connected Platforms</p>
            <p className="text-3xl font-bold text-gray-900">{accounts?.length ?? 0}</p>
            {(accounts?.length ?? 0) < 2 && (
              <Link href="/accounts" className="text-xs text-brand-600 hover:underline mt-2 block">
                Connect more platforms →
              </Link>
            )}
          </Card>

          <Card>
            <p className="text-sm font-medium text-gray-700 mb-2">Drafts Ready</p>
            <p className="text-3xl font-bold text-gray-900">{drafts?.length ?? 0}</p>
            <Link href="/drafts" className="text-xs text-brand-600 hover:underline mt-2 block">
              View all drafts →
            </Link>
          </Card>

          <Card>
            <p className="text-sm font-medium text-gray-700 mb-2">Scheduled Posts</p>
            <p className="text-3xl font-bold text-gray-900">
              {jobs?.filter((j: any) => j.status === "pending")?.length ?? 0}
            </p>
            <Link href="/schedule" className="text-xs text-brand-600 hover:underline mt-2 block">
              Manage schedule →
            </Link>
          </Card>
        </div>

        {/* Engagement trend */}
        {analytics && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Avg Engagement Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {analytics.avg_engagement_rate}%
                </p>
              </div>
              <div className={`flex items-center gap-1 ${trendColor}`}>
                <TrendIcon size={20} />
                <span className="text-sm font-medium capitalize">{trend}</span>
              </div>
            </div>

            {analytics.best_posting_hours?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Best posting hours (UTC)</p>
                <div className="flex gap-2">
                  {analytics.best_posting_hours.map((h: number) => (
                    <Badge key={h} color="blue">{h}:00</Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
}