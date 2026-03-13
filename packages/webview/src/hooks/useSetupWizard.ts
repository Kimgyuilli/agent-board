import { useState, useCallback } from "react";
import type { SetupProjectConfig, SetupTemplate, ExtensionToWebviewMessage } from "@agent-board/shared";

interface SetupResult {
  success: boolean;
  filesCreated: string[];
  filesSkipped: string[];
  error?: string;
}

export function useSetupWizard(postMessage: (msg: unknown) => void) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<SetupProjectConfig>({
    projectName: "",
    projectDescription: "",
    template: "solo" as SetupTemplate,
    techStack: "",
    overwriteExisting: false,
  });
  const [existingFiles, setExistingFiles] = useState<string[] | null>(null);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [generating, setGenerating] = useState(false);

  const updateConfig = useCallback((partial: Partial<SetupProjectConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const nextStep = useCallback(() => {
    if (step === 0) {
      postMessage({ type: "check-existing-setup" });
    }
    setStep((s) => Math.min(s + 1, 2));
  }, [step, postMessage]);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const generate = useCallback(() => {
    setGenerating(true);
    postMessage({ type: "setup-project", config });
  }, [config, postMessage]);

  const handleMessage = useCallback((msg: ExtensionToWebviewMessage) => {
    switch (msg.type) {
      case "check-existing-setup-result":
        setExistingFiles(msg.existingFiles);
        break;
      case "setup-result":
        setResult(msg);
        setGenerating(false);
        break;
    }
  }, []);

  const reset = useCallback(() => {
    setStep(0);
    setConfig({
      projectName: "",
      projectDescription: "",
      template: "solo",
      techStack: "",
      overwriteExisting: false,
    });
    setExistingFiles(null);
    setResult(null);
    setGenerating(false);
  }, []);

  return { step, config, existingFiles, result, generating, updateConfig, nextStep, prevStep, generate, handleMessage, reset };
}
