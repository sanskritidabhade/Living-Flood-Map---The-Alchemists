"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Mocked for the demo. A real deployment would authenticate against the Nation's own directory. */
const ACCESS_KEY = "mapaki2026";
export const OCAP_SESSION_FLAG = "lfm-ocap-ok";

export function OcapGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim() === ACCESS_KEY) {
      // Session-scoped on purpose: closing the tab ends access.
      sessionStorage.setItem(OCAP_SESSION_FLAG, "true");
      onUnlock();
      return;
    }
    setWrong(true);
    window.setTimeout(() => setWrong(false), 600);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold tracking-tight text-muted-foreground">CE Strategies</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-secondary">
        Living Flood Map
      </h1>

      <div className="mt-6 rounded-md border border-border bg-surface p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden />
          <p className="text-sm leading-relaxed">
            This tool respects First Nations data sovereignty — Ownership, Control, Access,
            Possession. Access is restricted to authorized community personnel and emergency
            responders.
          </p>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-2">
          <Label htmlFor="access-key">Community access key</Label>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                id="access-key"
                type="password"
                autoComplete="off"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-invalid={wrong}
                aria-describedby={wrong ? "access-error" : undefined}
                className={
                  wrong ? "border-danger motion-safe:animate-[lfm-shake_0.4s_ease-in-out]" : ""
                }
              />
            </div>
            <Button type="submit">Enter</Button>
          </div>
          {wrong ? (
            <p id="access-error" role="alert" className="text-sm font-medium text-danger-text">
              That key was not recognised. Check with your emergency coordinator.
            </p>
          ) : null}
        </form>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Access ends when you close this tab. Nothing is stored on a server.
      </p>
    </div>
  );
}
