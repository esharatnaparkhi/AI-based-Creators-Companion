import { ReactNode, ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cn(...args: (string | undefined | false | null)[]) {
  return clsx(...args);
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export type CardVariant = "light" | "dark" | "accent" | "muted";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
}

const cardVariants: Record<CardVariant, string> = {
  light:  "bg-white shadow-card",
  dark:   "bg-canvas text-white",
  accent: "bg-brand-500 text-white",
  muted:  "bg-surface-50",
};

const cardPaddings = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };

export function Card({ children, className, variant = "light", padding = "md" }: CardProps) {
  return (
    <div className={cn("rounded-3xl", cardVariants[variant], cardPaddings[padding], className)}>
      {children}
    </div>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  variant?: CardVariant;
  className?: string;
  action?: ReactNode;
}

export function MetricCard({ label, value, sub, icon, variant = "light", className, action }: MetricCardProps) {
  const isLight = variant === "light" || variant === "muted";
  const labelCls = isLight ? "text-ink-secondary" : "text-white/60";
  const valueCls = isLight ? "text-ink" : "text-white";
  const subCls   = isLight ? "text-ink-tertiary" : "text-white/50";
  const iconCls  = isLight ? "bg-surface-100 text-ink-secondary" : "bg-white/10 text-white";

  return (
    <Card variant={variant} className={cn("flex flex-col justify-between min-h-[120px]", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-sm font-medium", labelCls)}>{label}</p>
        {icon && (
          <div className={cn("p-2 rounded-xl flex-shrink-0", iconCls)}>{icon}</div>
        )}
      </div>
      <div className="mt-3">
        <p className={cn("text-4xl font-bold tracking-tight leading-none", valueCls)}>
          {value}
        </p>
        {sub    && <p className={cn("text-sm mt-1.5", subCls)}>{sub}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </Card>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center gap-2 font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 whitespace-nowrap";
  const variants = {
    primary:   "bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-400 shadow-sm",
    secondary: "bg-white border border-surface-200 text-ink hover:bg-surface-50 focus:ring-brand-400 shadow-sm",
    danger:    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost:     "text-ink-secondary hover:bg-surface-100 hover:text-ink focus:ring-surface-300",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm font-semibold",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], (disabled || loading) && "opacity-50 cursor-not-allowed", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeColor = "green" | "yellow" | "red" | "blue" | "gray" | "purple" | "orange";

const badgeColors: Record<BadgeColor, string> = {
  green:  "bg-green-50  text-green-700  ring-1 ring-green-200",
  yellow: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  red:    "bg-red-50    text-red-700    ring-1 ring-red-200",
  blue:   "bg-blue-50   text-blue-700   ring-1 ring-blue-200",
  gray:   "bg-surface-100 text-ink-secondary ring-1 ring-surface-200",
  purple: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  orange: "bg-brand-50  text-brand-700  ring-1 ring-brand-200",
};

export function Badge({ children, color = "gray" }: { children: ReactNode; color?: BadgeColor }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium", badgeColors[color])}>
      {children}
    </span>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin h-5 w-5 text-brand-500", className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
) {
  const { label, error, className, ...rest } = props;
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-ink">{label}</label>}
      <input
        className={cn(
          "block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors",
          "placeholder:text-ink-tertiary",
          "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
          error ? "border-red-300" : "border-surface-200 hover:border-surface-300",
          className
        )}
        {...rest}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }
) {
  const { label, className, children, ...rest } = props;
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-ink">{label}</label>}
      <select
        className={cn(
          "block w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm",
          "hover:border-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
          className
        )}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
          checked ? "bg-brand-500" : "bg-surface-200"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
      {label && <span className="text-sm font-medium text-ink">{label}</span>}
    </label>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-16 px-4">
      <div className="flex justify-center text-surface-300 mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="text-sm text-ink-secondary mt-1 mb-6 max-w-xs mx-auto">{description}</p>
      {action}
    </div>
  );
}
