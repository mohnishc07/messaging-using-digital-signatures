import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import BackgroundPaths from "@/components/kokonutui/background-paths";
import { Spoiler } from "@/components/kokonutui/spoiler-text";
import SlideToConfirm from "@/components/kokonutui/slide-to-confirm";
import type { UserKeys } from "@/lib/api.js";

export function IdentityEntry({
  creating,
  name,
  onName,
  busy,
  notice,
  onLookup,
  onCreate,
  onBack,
}: {
  creating: boolean;
  name: string;
  onName: (name: string) => void;
  busy: boolean;
  notice: string;
  onLookup: () => void;
  onCreate: () => Promise<void>;
  onBack: () => void;
}) {
  return (
    <BackgroundPaths className="identity-hero" count={30} speed={0.35}>
      <main className="entry-screen identity-entry">
        <div className="entry-story">
          <Badge variant="outline">ED25519 / SIGNED MESSAGING</Badge>
          <h1>
            {creating ? (
              <>
                Start with
                <br />a fresh key pair.
              </>
            ) : (
              <>
                Your messages.
                <br />
                Your signature.
              </>
            )}
          </h1>
          <p>
            {creating
              ? "Generate an Ed25519 identity and inspect the keys before sending your first message."
              : "Open your identity, inspect your keys, and exchange signed mail. See the mathematics behind every signature."}
          </p>
          <div className="story-grid">
            <span>
              01 <b>Choose an identity</b>
            </span>
            <span>
              02 <b>Inspect your keys</b>
            </span>
            <span>
              03 <b>Exchange signed mail</b>
            </span>
          </div>
        </div>
        <Card className="identity-entry-card">
          <CardHeader>
            <span className="step-label">
              {creating ? "CREATE USER / 02" : "GET STARTED / 01"}
            </span>
            <h2>
              {creating ? "This identity is available" : "Open your workspace"}
            </h2>
            <p>
              {creating
                ? "No user was found with that name. Confirm to create it and open your Key Vault."
                : "Enter an existing username, or choose a new one to create an identity."}
            </p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!creating) onLookup();
              }}
            >
              <label htmlFor="username">
                {creating ? "New username" : "Username"}
              </label>
              <Input
                id="username"
                value={name}
                onChange={(event) => onName(event.target.value)}
                required
                maxLength={64}
                autoComplete="off"
                placeholder="e.g. Alice"
                disabled={busy || creating}
              />
              {creating ? (
                <div className="mt-5">
                  <SlideToConfirm
                    label="Slide to create identity"
                    confirmingLabel="Generating keys"
                    doneLabel="Identity created"
                    onConfirm={onCreate}
                    disabled={busy || !name.trim()}
                    resetAfter={null}
                  />
                  <p className="confirmation-help">
                    Drag the arrow, or focus it and press Enter.
                  </p>
                </div>
              ) : (
                <Button
                  className="mt-5 w-full"
                  type="submit"
                  disabled={busy || !name.trim()}
                >
                  {busy ? "Loading identity…" : "Continue →"}
                </Button>
              )}
            </form>
            {notice && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Could not continue</AlertTitle>
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}
            {creating ? (
              <Button
                className="mt-4"
                variant="ghost"
                disabled={busy}
                onClick={onBack}
              >
                ← Use another username
              </Button>
            ) : (
              <Alert className="mt-6">
                <AlertTitle>Classroom demo access</AlertTitle>
                <AlertDescription>
                  A username selects an identity; it does not authenticate
                  ownership. Demo keys can be retrieved by username.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </main>
    </BackgroundPaths>
  );
}

export function KeyVault({
  pair,
  onContinue,
}: {
  pair: UserKeys;
  onContinue: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [notice, setNotice] = useState("");
  const copy = async (privateKey: boolean) => {
    if (privateKey && !revealed) return;
    try {
      await navigator.clipboard.writeText(
        privateKey ? pair.privateKey : pair.publicKey,
      );
      setNotice(
        privateKey
          ? "Private key copied. Keep it secret."
          : "Public key copied.",
      );
    } catch {
      setNotice(
        "Clipboard unavailable. Select the revealed key and copy it manually.",
      );
    }
  };
  return (
    <main className="vault-screen">
      <div className="vault-heading">
        <div>
          <span className="eyebrow">PAGE 1 / KEY VAULT</span>
          <h1>Your Cryptographic Identity</h1>
          <p>Inspect your identity before opening the mail workspace.</p>
        </div>
        <Badge variant="outline">Ed25519</Badge>
      </div>
      <Card className="identity-summary">
        <div className="identity-symbol" aria-hidden="true">
          ◇
        </div>
        <div>
          <span className="field-label">USERNAME</span>
          <h2>@{pair.name}</h2>
        </div>
        <Badge variant="secondary">
          {pair.trusted ? "Server-trusted key" : "Untrusted key"}
        </Badge>
      </Card>
      <div className="key-grid">
        <Card className="vault-key-card">
          <CardHeader>
            <div className="key-card-heading">
              <div>
                <span className="field-label">VERIFICATION KEY / X.509</span>
                <h2>Public key</h2>
              </div>
              <Button variant="outline" onClick={() => void copy(false)}>
                Copy public key
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre
              className="identity-key"
              aria-label="Your public key"
              tabIndex={0}
            >
              {pair.publicKey}
            </pre>
            <p>X.509 · Base64. Share this key to verify your signatures.</p>
          </CardContent>
        </Card>
        <Card className="vault-key-card private-card">
          <CardHeader>
            <div className="key-card-heading">
              <div>
                <span className="field-label">SIGNING KEY / PKCS#8</span>
                <h2>Private key</h2>
              </div>
              <Button
                variant="outline"
                disabled={!revealed}
                onClick={() => void copy(true)}
              >
                Copy private key
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="identity-key private-key-block">
              <Spoiler
                revealed={revealed}
                onRevealedChange={setRevealed}
                label="Reveal private key"
                className="break-all font-mono"
              >
                {revealed ? (
                  <span aria-label="Your private key">{pair.privateKey}</span>
                ) : (
                  "Click to reveal your private signing key"
                )}
              </Spoiler>
            </div>
            <p>PKCS#8 · Base64. Keep your private key secret.</p>
            {revealed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRevealed(false);
                  setNotice("");
                }}
              >
                Hide private key
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
      <Alert className="mt-6">
        <AlertTitle>Keep private keys secret · test identities only</AlertTitle>
        <AlertDescription>
          This classroom server retains keys, and anyone who knows the username
          can retrieve its private key. Hiding it here protects against casual
          viewing only.
        </AlertDescription>
      </Alert>
      <p className="notice" role="status">
        {notice}
      </p>
      <div className="vault-footer">
        <span>
          The displayed keys are cleared when you enter the workspace or log
          out.
        </span>
        <Button size="lg" onClick={onContinue}>
          Continue to Mail Workspace →
        </Button>
      </div>
    </main>
  );
}
