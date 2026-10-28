import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createApi, ApiError } from "@/lib/api.js";
import type { User, UserKeys } from "@/lib/api.js";
import { errorMessage, useTask } from "@/lib/use-task";
import { MailWorkspace } from "@/components/mail-workspace";
import ParticleButton from "@/components/kokonutui/particle-button";

const api = createApi();
type Screen = "home" | "create" | "vault" | "workspace";
function App() {
  const [screen, setScreen] = useState<Screen>("home"),
    [user, setUser] = useState<User | null>(null),
    [vault, setVault] = useState<UserKeys | null>(null);
  const [name, setName] = useState(""),
    [notice, setNotice] = useState(""),
    [copyNotice, setCopyNotice] = useState("");
  const task = useTask();
  const open = (pair: UserKeys) => {
    if (!pair.name || !pair.publicKey || !pair.privateKey)
      throw new Error("The backend did not return a complete demo key pair.");
    setUser({
      name: pair.name,
      publicKey: pair.publicKey,
      trusted: pair.trusted,
    });
    setVault(pair);
    setCopyNotice("");
    setNotice("");
    setScreen("vault");
  };
  const logout = () => {
    task.cancel();
    setUser(null);
    setVault(null);
    setScreen("home");
    setName("");
    setNotice("");
    setCopyNotice("");
  };
  const lookup = () => {
    if (!name.trim()) return;
    setNotice("");
    void task.run(
      async (current) => {
        try {
          const pair = await api.getUserKeys(name.trim());
          if (current()) open(pair);
        } catch (error) {
          if (!current()) return;
          if (error instanceof ApiError && error.status === 404)
            setScreen("create");
          else throw error;
        }
      },
      (error) => setNotice(errorMessage(error)),
    );
  };
  const create = () => {
    if (!name.trim()) return;
    setNotice("");
    void task.run(
      async (current) => {
        try {
          const pair = await api.createUser({
            name: name.trim(),
            trusted: true,
          });
          if (current()) open(pair);
        } catch (error) {
          if (!current()) return;
          if (error instanceof ApiError && error.status === 409) {
            setScreen("home");
            setNotice(
              "That username was just registered. Continue to open the existing demo identity.",
            );
          } else throw error;
        }
      },
      (error) => setNotice(errorMessage(error)),
    );
  };
  return (
    <>
      <header className="app-header">
        <a
          href="#"
          className="brand"
          onClick={(event) => event.preventDefault()}
        >
          <span className="brand-mark">S</span>SignedChat
          <span className="brand-tag">LAB</span>
        </a>
        <div className="header-actions">
          <span className="environment">Ed25519 / demo environment</span>
          {user && (
            <>
              <span className="session-name">{user.name}</span>
              {screen !== "vault" && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={task.busy}
                  onClick={() => {
                    setNotice("");
                    void task.run(
                      async (current) => {
                        const pair = await api.getUserKeys(user.name);
                        if (current()) open(pair);
                      },
                      (error) => setNotice(errorMessage(error)),
                    );
                  }}
                >
                  Key vault
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={logout}>
                Logout ↗
              </Button>
            </>
          )}
        </div>
      </header>
      {(screen === "home" || screen === "create") && (
        <main className="entry-screen">
          <div className="entry-story">
            <span className="eyebrow">
              {screen === "home"
                ? "SIGNATURES, MADE VISIBLE"
                : "A NEW IDENTITY"}
            </span>
            <h1>
              {screen === "home" ? (
                <>
                  Your messages.
                  <br />
                  Your signature.
                </>
              ) : (
                <>
                  Start with
                  <br />a fresh key pair.
                </>
              )}
            </h1>
            <p>
              {screen === "home"
                ? "A workspace for signed mail, cryptographic identities, and the mathematics behind every signature."
                : "The backend generates an Ed25519 public and private key for your demo identity."}
            </p>
            <div className="protocol-note">
              <span className="protocol-dot" />
              ED25519 / PUBLIC-KEY SIGNATURES
            </div>
            <div className="story-grid">
              <span>
                01 <b>Open an identity</b>
              </span>
              <span>
                02 <b>Inspect your keys</b>
              </span>
              <span>
                03 <b>Exchange signed mail</b>
              </span>
            </div>
          </div>
          <section className="entry-card">
            <span className="step-label">
              {screen === "home" ? "GET STARTED / 01" : "CREATE USER / 02"}
            </span>
            <h2>
              {screen === "home"
                ? "Open your workspace"
                : "This identity is available"}
            </h2>
            <p>
              {screen === "home"
                ? "Enter an existing username, or choose a new one to create an identity."
                : "No user was found with that name. Create it to continue to your Key Vault."}
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (screen === "home") lookup();
                else create();
              }}
            >
              <label htmlFor="username">
                {screen === "home" ? "Username" : "New username"}
              </label>
              <Input
                id="username"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={64}
                autoComplete="off"
                placeholder="e.g. Alice"
                disabled={task.busy}
              />
              <Button className="w-full" type="submit" disabled={task.busy}>
                {task.busy
                  ? "Please wait…"
                  : screen === "home"
                    ? "Continue →"
                    : "Create identity & view keys →"}
              </Button>
            </form>
            {notice && (
              <p className="notice error" role="status">
                {notice}
              </p>
            )}
            {screen === "create" ? (
              <Button
                className="mt-4"
                variant="ghost"
                disabled={task.busy}
                onClick={() => {
                  setScreen("home");
                  setNotice("");
                }}
              >
                ← Use another username
              </Button>
            ) : (
              <div className="demo-disclaimer">
                <span>DEMO ACCESS</span>
                <p>
                  A username selects a classroom identity. It does not
                  authenticate ownership; demo private keys can be retrieved by
                  username.
                </p>
              </div>
            )}
          </section>
        </main>
      )}
      {screen === "vault" && vault && (
        <main className="vault-screen">
          <div className="vault-heading">
            <div>
              <span className="eyebrow">PAGE 1 / KEY VAULT</span>
              <h1>Your Cryptographic Identity</h1>
              <p>Inspect your identity before opening the mail workspace.</p>
            </div>
            <span className="algorithm-badge">Ed25519</span>
          </div>
          <section className="surface identity-summary">
            <div className="identity-symbol">◇</div>
            <div>
              <span className="field-label">USERNAME</span>
              <h2>{vault.name}</h2>
            </div>
            <span className="trust-badge">
              {vault.trusted ? "Server-trusted key" : "Untrusted key"}
            </span>
          </section>
          <div className="key-grid">
            {(["publicKey", "privateKey"] as const).map((key) => (
              <section
                className={
                  "surface key-card " +
                  (key === "privateKey" ? "private-card" : "")
                }
                key={key}
              >
                <div className="key-card-heading">
                  <div>
                    <span className="field-label">
                      {key === "publicKey" ? "VERIFICATION KEY" : "SIGNING KEY"}
                    </span>
                    <h2>
                      {key === "publicKey" ? "Public key" : "Private key"}
                    </h2>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void task.run(
                        async (current) => {
                          await navigator.clipboard.writeText(vault[key]);
                          if (current())
                            setCopyNotice(
                              "Copied. Store private keys securely.",
                            );
                        },
                        () =>
                          setCopyNotice(
                            "Clipboard unavailable. Select and copy the key manually.",
                          ),
                      );
                    }}
                  >
                    Copy {key === "publicKey" ? "public" : "private"} key
                  </Button>
                </div>
                <label className="sr-only" htmlFor={key}>
                  {key === "publicKey" ? "Your public key" : "Your private key"}
                </label>
                <Textarea
                  id={key}
                  rows={4}
                  value={vault[key]}
                  readOnly
                  spellCheck={false}
                  autoComplete="off"
                />
                <p>
                  {key === "publicKey"
                    ? "X.509 · Base64. Used to verify signatures."
                    : "PKCS#8 · Base64. Keep private keys secret in real applications."}
                </p>
              </section>
            ))}
          </div>
          <p className="key-warning">
            Classroom demo: the server retains these keys, and anyone who knows
            this username can retrieve the private key. Use test identities
            only.
          </p>
          <p className="notice" role="status">
            {copyNotice}
          </p>
          <div className="vault-footer">
            <span>
              The displayed keys are cleared when you enter the workspace or log
              out.
            </span>
            <ParticleButton
              particles={false}
              disabled={task.busy}
              onClick={() => {
                setVault(null);
                setScreen("workspace");
              }}
            >
              Continue to Mail Workspace →
            </ParticleButton>
          </div>
        </main>
      )}
      {screen === "workspace" && user && (
        <>
          {notice && (
            <p className="notice error workspace-notice" role="status">
              {notice}
            </p>
          )}
          <MailWorkspace key={user.name} user={user} api={api} />
        </>
      )}
    </>
  );
}
export default App;
