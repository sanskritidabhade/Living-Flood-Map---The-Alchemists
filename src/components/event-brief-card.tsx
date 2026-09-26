"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/lib/ai/schema";

type Props = {
  profile: Profile;
  tweetCount: number;
  onConfirm: (profile: Profile) => void;
};

/** The draft is editable: the model's read of the event is a starting point, not a verdict. */
export function EventBriefCard({ profile, tweetCount, onConfirm }: Props) {
  const [draft, setDraft] = useState(profile);
  const [hashtags, setHashtags] = useState(profile.key_hashtags.join(" "));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-secondary">
          Is this the right event?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Read from a sample of the file. Correct anything that is wrong — every later step uses
          this.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Event brief
            <span className="ml-2 rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              AI-generated
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-name">Event name</Label>
              <Input
                id="event-name"
                value={draft.event_name}
                onChange={(e) => setDraft({ ...draft, event_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-region">Region</Label>
              <Input
                id="event-region"
                value={draft.region}
                onChange={(e) => setDraft({ ...draft, region: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-hashtags">Key hashtags</Label>
            <Input
              id="event-hashtags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-related">What counts as related</Label>
            <Textarea
              id="event-related"
              rows={4}
              value={draft.what_counts_as_related}
              onChange={(e) => setDraft({ ...draft, what_counts_as_related: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button
          onClick={() =>
            onConfirm({
              ...draft,
              key_hashtags: hashtags.split(/\s+/).filter(Boolean),
            })
          }
        >
          Confirm event and sort tweets
        </Button>
        <p className="text-sm text-muted-foreground">
          {tweetCount.toLocaleString()} posts to read
        </p>
      </div>
    </div>
  );
}
