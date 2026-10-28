import { useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import type { Api } from "@/lib/api.js";
import { createLab, runExperiment } from "@/lib/attack-experiments";
import type {
  Exploit,
  ExperimentResult,
  LabIdentities,
} from "@/lib/attack-experiments";
import { errorMessage, useTask } from "@/lib/use-task";

const experiments: { id: Exploit; title: string; description: string }[] = [
  {
    id: "message",
    title: "Message tampering",
    description:
      "Change the message after signing, keeping its original signature.",
  },
  {
    id: "signature",
    title: "Signature tampering",
    description: "Flip one signature bit without changing the message.",
  },
  {
    id: "impersonation",
    title: "Wrong-key impersonation",
    description:
      "Sign Alice's exact payload using Mallory's key, then claim to be Alice.",
  },
  {
    id: "untrusted",
    title: "Untrusted-sender rejection",
    description:
      "Submit a valid signature whose sender is absent from the trust store.",
  },
  {
    id: "replay",
    title: "Replay duplicate acceptance",
    description:
      "Deliver the exact same signed package twice and count matching inbox copies.",
  },
  {
    id: "plaintext",
    title: "Plaintext wire visibility",
    description:
      "Inspect readable application JSON. Digital signatures do not encrypt the message.",
  },
];

import HoldButton from "@/components/kokonutui/hold-button";
export function AttackLab({ api }: { api: Api }) {
  const lab = useRef<LabIdentities | null>(null);
  const [results, setResults] = useState<
    Partial<Record<Exploit, ExperimentResult>>
  >({});
  const [active, setActive] = useState<Exploit | null>(null);
  const [error, setError] = useState("");
  const [content, setContent] = useState("Transfer 10 credits to Bob.");
  const task = useTask();
  const execute = async (id: Exploit) => {
    if (task.busy) return;
    setActive(id);
    setError("");
    setResults((previous) => ({ ...previous, [id]: undefined }));
    await task.run(
      async (current) => {
        const identities = lab.current ?? (await createLab(api, current));
        if (!current()) return;
        lab.current = identities;
        const result = await runExperiment(
          api,
          identities,
          id,
          content,
          current,
        );
        if (current())
          setResults((previous) => ({ ...previous, [id]: result }));
      },
      (error) => setError(errorMessage(error)),
    );
  };
  return (
    <section className="padded-view attack-lab">
      <div className="section-intro">
        <Badge variant="outline">CONTROLLED EXPERIMENTS</Badge>
        <h2>Attack the package. Inspect the evidence.</h2>
        <p>
          The first run creates three disposable backend identities. Accepted
          deliveries stay in the lab receiver's inbox. They remain until the
          server restarts. Hold an action to run it; results come from actual
          API responses.
        </p>
      </div>
      <label htmlFor="attack-content">Experiment message</label>
      <Textarea
        id="attack-content"
        value={content}
        disabled={task.busy}
        onChange={(e) => {
          setContent(e.target.value);
          setResults({});
        }}
        rows={2}
      />
      {error && (
        <p role="alert" className="notice error">
          {error} No security conclusion was recorded; retry when the backend is
          available.
        </p>
      )}
      <div className="attack-grid">
        {experiments.map((experiment, i) => {
          const result = results[experiment.id];
          return (
            <Card key={experiment.id} className="attack-card">
              <CardHeader>
                <div className="attack-card-title">
                  <span className="pipeline-number">0{i + 1}</span>
                  <h3>{experiment.title}</h3>
                </div>
                <p>{experiment.description}</p>
              </CardHeader>
              <CardContent>
                <HoldButton
                  variant="grey"
                  aria-label={"Run Exploit: " + experiment.title}
                  holdDuration={900}
                  completeLabel="Run requested"
                  disabled={task.busy || !content.trim()}
                  onHoldComplete={() => void execute(experiment.id)}
                >
                  Run Exploit
                </HoldButton>
                {task.busy && active === experiment.id && (
                  <p role="status">Running against the backend…</p>
                )}
                {result && (
                  <div className="attack-result" role="status">
                    <Badge
                      variant={
                        result.outcome === "defended" ? "secondary" : "outline"
                      }
                    >
                      {result.outcome === "defended"
                        ? "Rejected / defended"
                        : result.outcome === "gap"
                          ? "Security limitation"
                          : "Unexpected result"}
                    </Badge>
                    <p>{result.summary}</p>
                    <ol className="experiment-steps">
                      {result.steps.map((step) => (
                        <li key={step.label}>
                          <b>{step.label}</b>
                          <span>{step.value}</span>
                        </li>
                      ))}
                    </ol>
                    <p>
                      <b>Countermeasure:</b> {result.countermeasure}
                    </p>
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Inspect request & response evidence
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <pre className="math-value">
                          {JSON.stringify(result.evidence, null, 2)}
                        </pre>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
