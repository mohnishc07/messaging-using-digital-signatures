import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createApi, ApiError } from "@/lib/api.js";
import type { User, UserKeys } from "@/lib/api.js";
import { errorMessage, useTask } from "@/lib/use-task";
import { MailWorkspace } from "@/components/mail-workspace";
import { IdentityEntry, KeyVault } from "@/components/identity-screens";

const api = createApi();
type Screen = "home" | "create" | "vault" | "workspace";
function App() {
  const [screen, setScreen] = useState<Screen>("home"),
    [user, setUser] = useState<User | null>(null),
    [vault, setVault] = useState<UserKeys | null>(null);
  const [name, setName] = useState(""),
    [notice, setNotice] = useState("");
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
  const create = async () => {
    let failure: unknown;
    if (!name.trim()) return;
    setNotice("");
    await task.run(
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
      (error) => {
        failure = error;
        setNotice(errorMessage(error));
      },
    );
    if (failure) throw failure;
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
        <IdentityEntry
          creating={screen === "create"}
          name={name}
          onName={setName}
          busy={task.busy}
          notice={notice}
          onLookup={lookup}
          onCreate={create}
          onBack={() => {
            setScreen("home");
            setNotice("");
          }}
        />
      )}
      {screen === "vault" && vault && (
        <KeyVault
          key={vault.name}
          pair={vault}
          onContinue={() => {
            setVault(null);
            setScreen("workspace");
          }}
        />
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
