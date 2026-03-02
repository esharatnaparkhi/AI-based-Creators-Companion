import { Layout } from "@/components/Layout";
import { Card, MetricCard, Spinner, Button } from "@/components/ui";
import { useAnalyticsSummary, useAccounts, useDrafts, useScheduledJobs } from "@/hooks/useApi";
import { useAuthStore } from "@/store/auth";
import { Eye, Heart, MessageCircle, Layers, ArrowRight, Sparkles, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: analytics, isLoading } = useAnalyticsSummary();
  const { data: accounts } = useAccounts();
  const { data: drafts } = useDrafts();
  const { data: jobs } = useScheduledJobs();

  const firstName   = user?.name?.split(" ")[0] ?? "there";
  const pendingJobs = jobs?.filter((j: any) => j.status === "pending")?.length ?? 0;
  const trend       = analytics?.recent_trend;
  const TrendIcon   = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <Layout>
      <div className="space-y-4">

        {/* ── Row 1: welcome + top stats ─────────────────────────────── */}
        <div className="grid grid-cols-12 gap-4">

          {/* Welcome — dark, tall */}
          <div className="col-span-12 lg:col-span-7">
            <Card variant="dark" className="h-full min-h-[196px] flex flex-col justify-between">
              <div>
                <p className="text-white/40 text-xs font-medium uppercase tracking-widest mb-2">Overview</p>
                <h1 className="text-[2rem] font-bold text-white leading-tight">
                  Hey, {firstName}.
                </h1>
                <p className="text-white/40 text-sm mt-2">
                  {accounts?.length ?? 0} platform{(accounts?.length ?? 0) !== 1 ? "s" : ""} connected
                  {" · "}
                  {drafts?.length ?? 0} draft{(drafts?.length ?? 0) !== 1 ? "s" : ""} ready
                </p>
              </div>
              <div className="flex gap-2 mt-6">
                <Link href="/drafts">
                  <Button variant="primary" size="sm">
                    <Sparkles size={13} />
                    Generate drafts
                  </Button>
                </Link>
                <Link href="/schedule">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/50 hover:text-white hover:bg-white/10 focus:ring-white/20"
                  >
                    <Calendar size={13} />
                    Schedule
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* 2×2 mini stats */}
          <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
            <MetricCard
              label="Total Posts"
              value={isLoading ? "—" : (analytics?.total_posts ?? 0).toLocaleString()}
              icon={<Layers size={15} />}
            />
            <MetricCard
              label="Likes"
              value={isLoading ? "—" : (analytics?.total_likes ?? 0).toLocaleString()}
              icon={<Heart size={15} />}
            />
            <MetricCard
              label="Comments"
              value={isLoading ? "—" : (analytics?.total_comments ?? 0).toLocaleString()}
              icon={<MessageCircle size={15} />}
            />
            <MetricCard
              label="Views"
              value={isLoading ? "—" : (analytics?.total_views ?? 0).toLocaleString()}
              icon={<Eye size={15} />}
            />
          </div>
        </div>

        {/* ── Row 2: engagement + drafts + scheduled ──────────────────── */}
        <div className="grid grid-cols-12 gap-4">

          {/* Engagement rate — orange accent */}
          <div className="col-span-12 lg:col-span-4">
            <MetricCard
              label="Avg Engagement Rate"
              value={`${analytics?.avg_engagement_rate ?? 0}%`}
              sub={trend ? `Trending ${trend}` : "No data yet"}
              variant="accent"
              className="h-full"
              icon={<TrendIcon size={15} />}
            />
          </div>

          {/* Drafts ready — dark */}
          <div className="col-span-12 lg:col-span-4">
            <MetricCard
              label="Drafts Ready"
              value={drafts?.length ?? 0}
              sub="Awaiting review"
              variant="dark"
              className="h-full"
              action={
                <Link
                  href="/drafts"
                  className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
                >
                  View all <ArrowRight size={11} />
                </Link>
              }
            />
          </div>

          {/* Scheduled posts — light */}
          <div className="col-span-12 lg:col-span-4">
            <MetricCard
              label="Scheduled Posts"
              value={pendingJobs}
              sub="Pending publish"
              className="h-full"
              action={
                <Link
                  href="/schedule"
                  className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Manage <ArrowRight size={11} />
                </Link>
              }
            />
          </div>
        </div>

        {/* ── Row 3: best posting hours ────────────────────────────────── */}
        {analytics?.best_posting_hours?.length > 0 && (
          <Card variant="muted" padding="md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-ink">Best posting hours (UTC)</p>
              <Link
                href="/analytics"
                className="text-xs text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
              >
                Full analytics <ArrowRight size={11} />
              </Link>
            </div>
            <div className="flex gap-2 flex-wrap">
              {analytics.best_posting_hours.map((h: number) => (
                <span
                  key={h}
                  className="px-3 py-1.5 bg-white rounded-full text-sm font-medium text-ink shadow-sm"
                >
                  {h}:00
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Loading fallback */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}
      </div>
    </Layout>
  );
}
