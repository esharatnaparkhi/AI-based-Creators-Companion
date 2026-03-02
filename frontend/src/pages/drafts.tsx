import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, Button, Badge, Spinner, Input, Select, EmptyState } from "@/components/ui";
import { useDrafts, useGenerateDrafts, useDeleteDraft, useSchedulePost } from "@/hooks/useApi";
import { Sparkles, Trash2, Calendar, ChevronDown, ChevronUp, Copy, Image as ImageIcon, X } from "lucide-react";
import { format, addHours } from "date-fns";
import toast from "react-hot-toast";

const PLATFORMS      = ["instagram", "linkedin", "x", "youtube", "email"];
const TONES          = ["casual", "professional", "witty", "educational", "inspirational"];
const STYLES         = ["story", "tips & tricks", "educational", "promotional", "conversational", "behind-the-scenes"];
const LENGTHS        = ["short", "medium", "long"];
const SCHEDULE_HOURS = [1, 2, 4, 8, 24, 48];

// ─── Draft Card ───────────────────────────────────────────────────────────────
function DraftCard({ draft, onDelete }: { draft: any; onDelete: () => void }) {
  const [expanded, setExpanded]     = useState(false);
  const [scheduleHours, setScheduleHours] = useState(24);
  const schedulePost = useSchedulePost();

  const handleSchedule = async () => {
    await schedulePost.mutateAsync({
      draft_id:     draft.id,
      scheduled_at: addHours(new Date(), scheduleHours).toISOString(),
      platforms:    draft.platform_targets || [],
    });
  };

  const copyContent = () => {
    navigator.clipboard.writeText(draft.content);
    toast.success("Copied to clipboard");
  };

  return (
    <Card className="space-y-3">
      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        {(draft.platform_targets || []).map((p: string) => (
          <Badge key={p} color="orange">{p}</Badge>
        ))}
        {draft.score && <Badge color="gray">Score {draft.score}/10</Badge>}
      </div>

      {/* Content */}
      <p className={`text-sm text-ink leading-relaxed ${!expanded ? "line-clamp-3" : ""}`}>
        {draft.content}
      </p>
      {draft.content?.length > 200 && (
        <button
          className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? <><ChevronUp size={12} /> Show less</>
            : <><ChevronDown size={12} /> Show more</>}
        </button>
      )}

      {/* Generated image */}
      {draft.image_url && (
        <div className="rounded-2xl overflow-hidden border border-surface-200">
          <img
            src={draft.image_url}
            alt="AI generated visual"
            className="w-full max-h-56 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 text-xs text-ink-tertiary">
            <ImageIcon size={10} />
            AI generated — link expires after 1 hour
          </div>
        </div>
      )}

      {/* Hook variations */}
      {expanded && draft.hook_variations?.length > 0 && (
        <div className="pl-3 border-l-2 border-brand-200 space-y-1.5">
          <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest">Hook variations</p>
          {draft.hook_variations.map((hook: string, i: number) => (
            <p key={i} className="text-sm text-ink-secondary italic">"{hook}"</p>
          ))}
        </div>
      )}

      {/* Tags */}
      {draft.tags?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {draft.tags.map((tag: string) => (
            <span key={tag} className="text-xs text-ink-tertiary">#{tag}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-surface-100 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSchedule}
            loading={schedulePost.isPending}
          >
            <Calendar size={13} />
            Schedule
          </Button>
          <select
            value={scheduleHours}
            onChange={(e) => setScheduleHours(Number(e.target.value))}
            className="text-xs border border-surface-200 rounded-xl px-2 py-1.5 text-ink-secondary bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 shadow-sm"
          >
            {SCHEDULE_HOURS.map((h) => (
              <option key={h} value={h}>{h}h</option>
            ))}
          </select>
        </div>

        <Button variant="secondary" size="sm" onClick={copyContent}>
          <Copy size={13} />
          Copy
        </Button>

        <div className="flex-1" />
        <span className="text-xs text-ink-tertiary">
          {format(new Date(draft.created_at), "MMM d")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={13} />
        </Button>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DraftsPage() {
  const { data: drafts, isLoading } = useDrafts();
  const generate    = useGenerateDrafts();
  const deleteDraft = useDeleteDraft();

  const [topic,          setTopic]          = useState("");
  const [keywords,       setKeywords]       = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "linkedin"]);
  const [tone,           setTone]           = useState("casual");
  const [contentStyle,   setContentStyle]   = useState("");
  const [postLength,     setPostLength]     = useState("medium");
  const [generateImage,  setGenerateImage]  = useState(false);
  const [showGenerator,  setShowGenerator]  = useState(false);

  const togglePlatform = (p: string) =>
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error("Enter a topic first"); return; }
    await generate.mutateAsync({
      platform_targets: selectedPlatforms,
      topic,
      tone,
      keywords:        keywords.trim() ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
      target_audience: targetAudience.trim() || undefined,
      content_style:   contentStyle || undefined,
      post_length:     postLength,
      generate_image:  generateImage,
    });
    setShowGenerator(false);
    setTopic("");
  };

  return (
    <Layout>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Drafts</h1>
            <p className="text-sm text-ink-secondary mt-0.5">AI-generated content ready to review and schedule.</p>
          </div>
          <Button onClick={() => setShowGenerator(!showGenerator)}>
            <Sparkles size={14} />
            {showGenerator ? "Cancel" : "Generate drafts"}
          </Button>
        </div>

        {/* ── Generator panel ───────────────────────────────────────── */}
        {showGenerator && (
          <Card variant="muted" padding="md" className="border border-brand-100">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-ink">New Draft</p>
              <button onClick={() => setShowGenerator(false)} className="text-ink-tertiary hover:text-ink">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="Topic / Idea *"
                placeholder="e.g. 5 productivity tips for content creators"
                value={topic}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Keywords (comma-separated)"
                  placeholder="AI, tools, growth"
                  value={keywords}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeywords(e.target.value)}
                />
                <Input
                  label="Target Audience"
                  placeholder="e.g. small business owners"
                  value={targetAudience}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetAudience(e.target.value)}
                />
              </div>

              {/* Platform toggles */}
              <div>
                <p className="text-sm font-medium text-ink mb-2">Platforms</p>
                <div className="flex gap-2 flex-wrap">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={[
                        "px-3 py-1.5 rounded-xl text-sm font-medium border transition-all",
                        selectedPlatforms.includes(p)
                          ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                          : "bg-white text-ink-secondary border-surface-200 hover:border-brand-300",
                      ].join(" ")}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Select label="Tone" value={tone} onChange={(e) => setTone(e.target.value)}>
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>

                <Select label="Style" value={contentStyle} onChange={(e) => setContentStyle(e.target.value)}>
                  <option value="">Any style</option>
                  {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>

                <Select label="Length" value={postLength} onChange={(e) => setPostLength(e.target.value)}>
                  {LENGTHS.map((l) => <option key={l} value={l}>{l}</option>)}
                </Select>
              </div>

              {/* Image generation toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-2xl bg-white border border-surface-200 hover:border-brand-200 transition-colors">
                <input
                  type="checkbox"
                  checked={generateImage}
                  onChange={(e) => setGenerateImage(e.target.checked)}
                  className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-400"
                />
                <div>
                  <p className="text-sm font-medium text-ink">Generate image</p>
                  <p className="text-xs text-ink-tertiary">DALL-E 3 · adds ~10s per draft</p>
                </div>
              </label>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleGenerate}
                  loading={generate.isPending}
                  disabled={!topic || selectedPlatforms.length === 0}
                >
                  <Sparkles size={14} />
                  Generate {selectedPlatforms.length} draft{selectedPlatforms.length !== 1 ? "s" : ""}
                  {generateImage && " + images"}
                </Button>
                <Button variant="secondary" onClick={() => setShowGenerator(false)}>Cancel</Button>
              </div>
            </div>
          </Card>
        )}

        {/* ── Drafts list ───────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : !drafts?.length ? (
          <Card>
            <EmptyState
              icon={<Sparkles size={44} />}
              title="No drafts yet"
              description="Generate your first AI draft to get started."
              action={
                <Button onClick={() => setShowGenerator(true)}>
                  <Sparkles size={14} /> Generate drafts
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft: any) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                onDelete={() => deleteDraft.mutate(draft.id)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
