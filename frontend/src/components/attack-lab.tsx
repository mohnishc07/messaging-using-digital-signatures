import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Api } from "@/lib/api.js";
import "./tests-panel.css";

type Packet = {
  messageId: string;
  senderId: string;
  receiverId: string;
  message: string;
  signature: string;
};
type Identity = {
  name: string;
  publicKey: string;
  privateKey: string;
  fingerprint: string;
};
type Stored = { deliveryId: string; recipientId: string; packet: Packet };
type State = {
  inbox: Stored[];
  trustedKeys: Record<string, string>;
  events: unknown[];
};
type Decision = {
  signatureValid: boolean | null;
  trusted: boolean;
  keyMatchesPinned: boolean;
  recipientMatches: boolean;
  duplicate: boolean;
  accepted: boolean;
  reason: string;
  verificationKeyFingerprint: string;
  pinnedKeyFingerprint: string;
  payload: string;
  payloadBase64: string;
  comparisonDigest: string;
};
const tests = {
  message: [
    "Message tampering",
    "Prepare and sign. Edit the message afterward, without signing again. Verify or deliver the edited package.",
  ],
  signature: [
    "Signature tampering",
    "Sign first. Edit the Base64 signature or flip one bit. Compare verification with the original.",
  ],
  impersonation: [
    "Wrong-key impersonation",
    "Keep claimed sender Alice. Select Mallory's signing key, sign, then verify using Bob's key directory.",
  ],
  substitution: [
    "Public-key substitution",
    "Sign as Alice using Mallory's key. Verify, then substitute Mallory's public key under Alice in Bob's directory and verify again. Compare pinned fingerprints.",
  ],
  replay: [
    "Replay",
    "Prepare, sign and deliver once. Capture the signed package, then deliver that exact capture again. Compare protection off and on; a new message gets a fresh signed ID.",
  ],
  plaintext: [
    "Readable plaintext",
    "Sign, deliver, and inspect the received message and package. Signatures do not conceal content. Application JSON visibility is not HTTPS network interception.",
  ],
  untrusted: [
    "Untrusted sender",
    "Sign a valid Alice message. Remove Bob's trusted key for Alice, verify, restore it and verify again.",
  ],
} as const;
export function AttackLab({ api }: { api: Api }) {
  const [session, setSession] = useState("");
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [state, setState] = useState<State>({
    inbox: [],
    trustedKeys: {},
    events: [],
  });
  const [test, setTest] = useState<keyof typeof tests>("message");
  const [sender, setSender] = useState("alice"),
    [recipient, setRecipient] = useState("bob");
  const [content, setContent] = useState("Transfer 10 credits to Bob.");
  const [signer, setSigner] = useState("alice"),
    [privateKey, setPrivateKey] = useState("");
  const [packet, setPacket] = useState<Packet | null>(null),
    [original, setOriginal] = useState<Packet | null>(null),
    [captured, setCaptured] = useState<Packet | null>(null);
  const [result, setResult] = useState<Decision | null>(null),
    [resultSource, setResultSource] = useState("");
  const [protectedReplay, setProtectedReplay] = useState(false);
  const [trustedKey, setTrustedKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Stored | null>(null),
    [storedText, setStoredText] = useState("");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    alive = useRef(true),
    sessionRef = useRef("");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (sessionRef.current)
        void api
          .lab(`/${sessionRef.current}`, undefined, "DELETE")
          .catch(() => {});
    };
  }, [api]);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setResult(null);
    try {
      await action();
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const refresh = async (id = session) => {
    const next = (await api.lab(`/${id}`, undefined, "GET")) as State;
    if (alive.current) {
      setState(next);
      setTrustedKey(null);
    }
  };
  const reset = () =>
    void run(async () => {
      if (session) await api.lab(`/${session}`, undefined, "DELETE");
      const created = (await api.lab()) as {
        sessionId: string;
        identities: Identity[];
      };
      sessionRef.current = created.sessionId;
      if (!alive.current) {
        await api.lab(`/${created.sessionId}`, undefined, "DELETE");
        return;
      }
      setSession(created.sessionId);
      setIdentities(created.identities);
      setSigner("alice");
      setPrivateKey(created.identities[0].privateKey);
      setPacket(null);
      setOriginal(null);
      setCaptured(null);
      setSelected(null);
      setStoredText("");
      await refresh(created.sessionId);
      setNotice("Fresh isolated lab created. Prepare a message to begin.");
    });
  const currentTrustedKey =
    trustedKey ??
    state.trustedKeys[`${recipient}:${packet?.senderId || sender}`] ??
    "";
  const mutate = (key: keyof Packet, value: string) => {
    if (packet) setPacket({ ...packet, [key]: value });
    setResult(null);
  };
  const chooseSigner = (name: string) => {
    setSigner(name);
    setPrivateKey(identities.find((i) => i.name === name)?.privateKey || "");
    setResult(null);
  };
  const check = async (value: Packet, deliver: boolean, source: string) => {
    const response = (await api.lab(
      `/${session}/${deliver ? "deliver" : "verify"}`,
      {
        packet: value,
        recipientId: recipient,
        replayProtection: protectedReplay,
      },
    )) as Decision;
    if (!alive.current) return;
    setResult(response);
    setResultSource(source);
    await refresh();
  };
  const trust = async (key: string) => {
    await api.lab(`/${session}/trust`, {
      recipientId: recipient,
      senderId: packet?.senderId || sender,
      publicKey: key,
    });
    await refresh();
    setNotice(
      "Trust mapping changed. Run verification again; stored packages were not re-signed.",
    );
  };
  const exportLog = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { experiment: test, original, packet, captured, result, ...state },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "signedchat-experiment.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const select = (
    label: string,
    value: string,
    onChange: (value: string) => void,
  ) => (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {["alice", "bob", "mallory"].map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>
    </label>
  );
  return (
    <section className="manual-lab">
      <header>
        <div>
          <span className="eyebrow">EDIT · OBSERVE · EXPLAIN</span>
          <h2>Security experiments</h2>
          <p>
            Real Java Ed25519 operations. Disposable lab identities and inboxes;
            normal mail is untouched.
          </p>
        </div>
        <Button disabled={busy} onClick={reset}>
          {session ? "Reset lab" : "Create isolated lab"}
        </Button>
      </header>
      <nav aria-label="Experiment selection">
        {Object.entries(tests).map(([id, [title]]) => (
          <button
            key={id}
            aria-pressed={test === id}
            onClick={() => {
              setTest(id as keyof typeof tests);
              setResult(null);
            }}
          >
            {title}
          </button>
        ))}
      </nav>
      <p className="lab-instruction">{tests[test][1]}</p>
      {error && (
        <p role="alert" className="notice error">
          {error} No new verification conclusion was recorded.
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!session ? (
        <p>
          Create a lab to unlock the manual steps. No experiment runs
          automatically.
        </p>
      ) : (
        <fieldset disabled={busy}>
          <div className="lab-columns">
            <article>
              <h3>1 · Prepare a new message</h3>
              {select("Claimed sender", sender, setSender)}
              {select(
                "Delivery recipient / key-directory owner",
                recipient,
                (value) => {
                  setRecipient(value);
                  setResult(null);
                  setSelected(null);
                },
              )}
              <label>
                Draft message
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </label>
              <Button
                onClick={() =>
                  void run(async () => {
                    const value = (await api.lab(`/${session}/prepare`, {
                      senderId: sender,
                      receiverId: recipient,
                      message: content,
                    })) as Packet;
                    if (!alive.current) return;
                    setPacket(value);
                    setOriginal(null);
                    await refresh();
                    setNotice(
                      "New message ID created. Nothing signed or delivered.",
                    );
                  })
                }
              >
                Prepare new message ID
              </Button>
              <h3>2 · Choose a key and sign</h3>
              {select(
                "Signing key owner (independent of claimed sender)",
                signer,
                chooseSigner,
              )}
              <details>
                <summary>Edit lab private key</summary>
                <label>
                  PKCS8 Base64 private key
                  <textarea
                    value={privateKey}
                    onChange={(e) => {
                      setPrivateKey(e.target.value);
                      setResult(null);
                    }}
                  />
                </label>
                <p>
                  Malformed keys cause a signing error. A different valid key
                  can sign, but may not match the recipient's trusted key.
                </p>
              </details>
              <Button
                disabled={!packet}
                onClick={() =>
                  void run(async () => {
                    const value = (await api.lab(`/${session}/sign`, {
                      packet,
                      privateKey,
                    })) as Packet;
                    if (!alive.current) return;
                    setPacket(value);
                    setOriginal({ ...value });
                    await refresh();
                    setNotice(
                      "Current package signed. Delivery is a separate action.",
                    );
                  })
                }
              >
                Sign current package
              </Button>
              <h3>Recipient's trusted-key directory</h3>
              <p>
                Mapping: {recipient} → {packet?.senderId || sender}
              </p>
              <label>
                Verification public key (SPKI Base64)
                <textarea
                  value={currentTrustedKey}
                  onChange={(e) => {
                    setTrustedKey(e.target.value);
                    setResult(null);
                  }}
                />
              </label>
              <div className="lab-actions">
                <Button
                  onClick={() => void run(() => trust(currentTrustedKey))}
                >
                  Apply edited public key
                </Button>
                <Button
                  onClick={() =>
                    void run(() =>
                      trust(
                        identities.find((i) => i.name === "mallory")!.publicKey,
                      ),
                    )
                  }
                >
                  Substitute Mallory key
                </Button>
                <Button onClick={() => void run(() => trust(""))}>
                  Remove trust
                </Button>
                <Button
                  onClick={() =>
                    void run(() =>
                      trust(
                        identities.find(
                          (i) => i.name === (packet?.senderId || sender),
                        )!.publicKey,
                      ),
                    )
                  }
                >
                  Restore original key
                </Button>
              </div>
              <details>
                <summary>Lab public keys & pinned fingerprints</summary>
                {identities.map((i) => (
                  <div key={i.name}>
                    <strong>{i.name}</strong>
                    <pre>{i.publicKey}</pre>
                    <pre>{i.fingerprint}</pre>
                  </div>
                ))}
              </details>
            </article>
            <article>
              <h3>3 · Inspect / edit after signing</h3>
              <p>
                Editing preserves the existing signature. It clears the previous
                result; it never signs automatically.
              </p>
              {packet ? (
                <>
                  {(Object.keys(packet) as (keyof Packet)[]).map((key) => (
                    <label key={key}>
                      {key}
                      <textarea
                        rows={key === "signature" ? 3 : 2}
                        value={packet[key]}
                        onChange={(e) => mutate(key, e.target.value)}
                      />
                    </label>
                  ))}
                  <div className="lab-actions">
                    <Button
                      disabled={!packet.signature}
                      onClick={() => {
                        try {
                          const bytes = Uint8Array.from(
                            atob(packet.signature),
                            (c) => c.charCodeAt(0),
                          );
                          if (!bytes.length) throw new Error("Sign first");
                          bytes[0] ^= 1;
                          mutate(
                            "signature",
                            btoa(String.fromCharCode(...bytes)),
                          );
                        } catch {
                          setError(
                            "Signature must be valid Base64 to flip a bit.",
                          );
                        }
                      }}
                    >
                      Flip one signature bit
                    </Button>
                    <Button
                      disabled={!original}
                      onClick={() => {
                        setPacket(original && { ...original });
                        setResult(null);
                      }}
                    >
                      Restore signed original
                    </Button>
                  </div>
                  <details>
                    <summary>Original signed package</summary>
                    <pre>{JSON.stringify(original, null, 2)}</pre>
                  </details>
                  <h3>4 · Verify or deliver</h3>
                  <label className="lab-checkbox">
                    <input
                      type="checkbox"
                      checked={protectedReplay}
                      onChange={(e) => {
                        setProtectedReplay(e.target.checked);
                        setResult(null);
                      }}
                    />
                    Reject previously accepted message IDs (lab replay
                    protection)
                  </label>
                  <div className="lab-actions">
                    <Button
                      onClick={() =>
                        void run(() =>
                          check(
                            packet,
                            false,
                            "Current editable package — verification only",
                          ),
                        )
                      }
                    >
                      Verify current package
                    </Button>
                    <Button
                      onClick={() =>
                        void run(() =>
                          check(
                            packet,
                            true,
                            "Current editable package — delivery",
                          ),
                        )
                      }
                    >
                      Deliver current package
                    </Button>
                    <Button
                      disabled={!packet.signature}
                      onClick={() => {
                        setCaptured({ ...packet });
                        setNotice(
                          "Captured exact package. Replay will not generate an ID or signature.",
                        );
                      }}
                    >
                      Capture signed package
                    </Button>
                  </div>
                </>
              ) : (
                <p>Prepare a message first.</p>
              )}
              {captured && (
                <div className="lab-capture">
                  <h3>Captured package · immutable replay</h3>
                  <pre>{JSON.stringify(captured, null, 2)}</pre>
                  <Button
                    onClick={() =>
                      void run(() =>
                        check(
                          captured,
                          true,
                          "Captured package — exact replay delivery",
                        ),
                      )
                    }
                  >
                    Deliver again without re-signing
                  </Button>
                </div>
              )}
            </article>
          </div>
          <article>
            <h3>5 · Observe backend evidence</h3>
            {result ? (
              <>
                <p>{resultSource}</p>
                <dl className="lab-decisions">
                  {[
                    [
                      "Signature valid",
                      result.signatureValid === null
                        ? "Not checked — no trusted key"
                        : result.signatureValid,
                    ],
                    ["Trusted key present", result.trusted],
                    ["Key matches original pin", result.keyMatchesPinned],
                    ["Recipient matches", result.recipientMatches],
                    ["Previously accepted ID", result.duplicate],
                    [
                      resultSource.includes("verification only")
                        ? "Would accept without replay policy"
                        : "Delivery accepted",
                      result.accepted,
                    ],
                    ["Reason", result.reason],
                  ].map(([name, value]) => (
                    <div key={String(name)}>
                      <dt>{name}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
                <p>
                  Verification-key fingerprint:{" "}
                  <code>{result.verificationKeyFingerprint || "No key"}</code>
                </p>
                <p>
                  Original pinned fingerprint:{" "}
                  <code>{result.pinnedKeyFingerprint}</code>
                </p>
                {!result.keyMatchesPinned && (
                  <p className="notice">
                    The current key differs from the original pin. A valid
                    signature under a substituted key does not establish the
                    claimed sender.
                  </p>
                )}
                <details open>
                  <summary>Exact signing payload and comparison digest</summary>
                  <pre>{result.payload}</pre>
                  <p>UTF-8 payload bytes, Base64:</p>
                  <pre>{result.payloadBase64}</pre>
                  <p>
                    SHA-256 payload comparison digest (Ed25519 signs the
                    payload, not this displayed digest):
                  </p>
                  <pre>{result.comparisonDigest}</pre>
                </details>
              </>
            ) : (
              <p>
                No current result. Run Verify or Deliver after your changes.
              </p>
            )}
          </article>
          <article>
            <h3>
              6 · Recipient inbox ·{" "}
              {state.inbox.filter((i) => i.recipientId === recipient).length}{" "}
              records
            </h3>
            <Button onClick={() => void run(() => refresh())}>
              Refresh actual lab inbox
            </Button>
            {state.inbox
              .filter((i) => i.recipientId === recipient)
              .map((row) => (
                <button
                  className="lab-inbox-row"
                  key={row.deliveryId}
                  onClick={() => {
                    setSelected(row);
                    setStoredText(row.packet.message);
                    setResult(null);
                  }}
                >
                  <strong>
                    {row.packet.senderId} → {row.recipientId}
                  </strong>
                  <span>{row.packet.message}</span>
                  <small>
                    Message ID {row.packet.messageId} · delivery{" "}
                    {row.deliveryId}
                  </small>
                </button>
              ))}
            {selected && (
              <>
                <h4>Selected stored record</h4>
                <pre>{JSON.stringify(selected.packet, null, 2)}</pre>
                <label>
                  Edit stored text without re-signing
                  <textarea
                    value={storedText}
                    onChange={(e) => setStoredText(e.target.value)}
                  />
                </label>
                <div className="lab-actions">
                  <Button
                    onClick={() =>
                      void run(async () => {
                        const edited = {
                          ...selected.packet,
                          message: storedText,
                        };
                        await api.lab(
                          `/${session}/inbox/${selected.deliveryId}`,
                          edited,
                        );
                        setSelected({ ...selected, packet: edited });
                        await refresh();
                        setNotice(
                          "Stored record edited; its original signature is unchanged. Verify it again.",
                        );
                      })
                    }
                  >
                    Save stored tampering
                  </Button>
                  <Button
                    onClick={() =>
                      void run(() =>
                        check(
                          selected.packet,
                          false,
                          "Stored recipient record — verification only",
                        ),
                      )
                    }
                  >
                    Verify stored record
                  </Button>
                  <Button
                    onClick={() => {
                      setCaptured({ ...selected.packet });
                      setNotice("Stored package captured for exact replay.");
                    }}
                  >
                    Capture received package
                  </Button>
                </div>
              </>
            )}
          </article>
          <article>
            <h3>Activity & evidence</h3>
            <Button onClick={exportLog}>Export experiment log</Button>
            <details>
              <summary>{state.events.length} backend events</summary>
              <pre>{JSON.stringify(state.events, null, 2)}</pre>
            </details>
          </article>
        </fieldset>
      )}
    </section>
  );
}
