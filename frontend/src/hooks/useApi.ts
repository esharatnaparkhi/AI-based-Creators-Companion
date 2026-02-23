import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsApi, draftsApi, postsApi, analyticsApi } from "@/services/api";
import toast from "react-hot-toast";

// ─── Accounts ─────────────────────────────────────────────────────────────────
export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list().then((r) => r.data),
  });
}

export function useDisconnectAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountsApi.disconnect(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account disconnected");
    },
  });
}

export function useSyncAccount() {
  return useMutation({
    mutationFn: (accountId: string) => accountsApi.sync(accountId),
    onSuccess: () => toast.success("Sync started"),
    onError: () => toast.error("Sync failed"),
  });
}

// ─── Drafts ───────────────────────────────────────────────────────────────────
export function useDrafts() {
  return useQuery({
    queryKey: ["drafts"],
    queryFn: () => draftsApi.list().then((r) => r.data),
  });
}

export function useGenerateDrafts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      platform_targets: string[];
      topic?: string;
      tone?: string;
    }) => draftsApi.generate(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drafts"] });
      toast.success("Drafts generated!");
    },
    onError: () => toast.error("Draft generation failed"),
  });
}

export function useDeleteDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => draftsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drafts"] });
      toast.success("Draft deleted");
    },
  });
}

// ─── Scheduling ───────────────────────────────────────────────────────────────
export function useScheduledJobs() {
  return useQuery({
    queryKey: ["schedule-jobs"],
    queryFn: () => postsApi.listJobs().then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useSchedulePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { draft_id: string; scheduled_at: string; platforms: string[] }) =>
      postsApi.schedule(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule-jobs"] });
      toast.success("Post scheduled!");
    },
    onError: () => toast.error("Scheduling failed"),
  });
}

export function useCancelJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => postsApi.cancelJob(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule-jobs"] });
      toast.success("Job cancelled");
    },
  });
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => analyticsApi.summary().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePostingCalendar() {
  return useQuery({
    queryKey: ["posting-calendar"],
    queryFn: () => analyticsApi.calendar().then((r) => r.data),
  });
}