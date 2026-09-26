"use client";

import {
  AlertTriangle,
  Info,
  Siren,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  HelpCircle,
  CircleCheck,
  CircleDot,
  CircleDashed,
} from "lucide-react";
import type { Classified, Verification } from "@/lib/ai/schema";

/** DESIGN.md: colour never carries meaning alone — always an icon and a word. */

const URGENCY = {
  critical: { label: "Critical", Icon: Siren, className: "bg-danger text-danger-foreground" },
  urgent: { label: "Urgent", Icon: AlertTriangle, className: "bg-warning text-warning-foreground" },
  information: { label: "Information", Icon: Info, className: "bg-info text-info-foreground" },
} as const;

export function UrgencyBadge({ urgency }: { urgency: Classified["urg"] }) {
  const { label, Icon, className } = URGENCY[urgency];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

const VERIFICATION = {
  verified: { label: "Verified", Icon: ShieldCheck, className: "text-success-text" },
  unverified: { label: "Unverified", Icon: ShieldAlert, className: "text-warning-text" },
  contradicts: { label: "Contradicts official source", Icon: ShieldX, className: "text-danger-text" },
  cannot_check: { label: "Cannot check", Icon: HelpCircle, className: "text-muted-foreground" },
} as const;

export function VerificationBadge({ verification }: { verification: Verification }) {
  const { label, Icon, className } = VERIFICATION[verification.verification_status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${className}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

const CONFIDENCE = {
  h: { label: "High confidence", Icon: CircleCheck },
  m: { label: "Medium confidence", Icon: CircleDot },
  l: { label: "Low confidence", Icon: CircleDashed },
} as const;

export function ConfidenceBadge({ confidence }: { confidence: Classified["conf"] }) {
  const { label, Icon } = CONFIDENCE[confidence];
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
