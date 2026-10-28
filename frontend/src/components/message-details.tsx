import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { SignedMessage } from "@/lib/api.js";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import SmoothDrawer from "@/components/kokonutui/smooth-drawer";
import { payload } from "@/lib/math.js";

export function MessageDetails({
  message,
  onTrace,
}: {
  message: SignedMessage;
  onTrace: (message: SignedMessage) => void;
}) {
  const [copied, setCopied] = useState("");
  const evidence = (
    <div className="signature-evidence">
      <Badge variant="secondary">Ed25519 · accepted on delivery</Badge>
      <p>
        The inbox contains packages previously accepted by the backend. Opening
        these details does not perform a fresh signature verification.
      </p>
      <dl>
        <dt>Signature · Base64</dt>
        <dd>{message.signature}</dd>
        <dt>Exact signed UTF-8 payload</dt>
        <dd>
          {payload(message.senderId, message.receiverId, message.message)}
        </dd>
      </dl>
      <pre className="math-value">{JSON.stringify(message, null, 2)}</pre>
      <p>
        The math lab traces this payload with a disposable key; it does not
        reproduce the sender's private key.
      </p>
    </div>
  );
  return (
    <Collapsible className="message-details">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm">
          Inspect Ed25519 signature & signed package
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="detail-content">
        <dl>
          <dt>Sender</dt>
          <dd>{message.senderId}</dd>
          <dt>Recipient</dt>
          <dd>{message.receiverId}</dd>
          <dt>Ed25519 signature · Base64</dt>
          <dd>{message.signature}</dd>
        </dl>
        <div className="reader-actions">
          <SmoothDrawer
            title="Ed25519 signature evidence"
            description={`${message.senderId} → ${message.receiverId} · stored delivery package`}
            triggerLabel="Open verification drawer"
          >
            {evidence}
          </SmoothDrawer>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  JSON.stringify(message, null, 2),
                );
                setCopied("Copied JSON");
              } catch {
                setCopied("Copy unavailable");
              }
            }}
          >
            {copied || "Copy signed package"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onTrace(message)}
          >
            Trace payload in math lab →
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
export function Timestamp({ message }: { message: SignedMessage }) {
  const value = message.timestamp;
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    Number.isFinite(Date.parse(value)) ? (
    <time className="message-time" dateTime={value}>
      {new Date(value).toLocaleString()}
    </time>
  ) : (
    <span className="message-time unavailable-time">
      Not provided by server
    </span>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">▤</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
