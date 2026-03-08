"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Field,
  KeyValueListEditor,
  SectionCard,
  StringListEditor,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  textareaClassName,
} from "@/components/form-controls";
import {
  createEmptyMcpServer,
  createEmptyModelProvider,
  createEmptyProfile,
  createEmptyProject,
  REPOSITORY_URL,
  SAMPLE_REFERENCE_URL,
  createSampleDraft,
  SAMPLE_REVIEWED_ON,
  VERCEL_DEPLOY_URL,
} from "@/lib/config/defaults";
import {
  APPROVAL_POLICY_OPTIONS,
  CREDENTIAL_STORE_OPTIONS,
  FILE_OPENER_OPTIONS,
  HISTORY_PERSISTENCE_OPTIONS,
  LOGIN_METHOD_OPTIONS,
  PLAN_REASONING_OPTIONS,
  REASONING_OPTIONS,
  SANDBOX_MODE_OPTIONS,
  SECTION_ORDER,
  SERVICE_TIER_OPTIONS,
  SHELL_INHERITANCE_OPTIONS,
  TRANSPORT_OPTIONS,
  TRUST_LEVEL_OPTIONS,
  WEB_SEARCH_OPTIONS,
} from "@/lib/config/metadata";
import type { ConfigDraft, GenerateConfigResponse, ParseConfigResponse } from "@/lib/config/types";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { getAlternateLocale } from "@/lib/i18n/config";

type ConfigEditorProps = {
  locale: Locale;
  dictionary: Dictionary;
  initialDraft: ConfigDraft;
  initialPreview: string;
  initialUnsupportedToml: string;
};

type StatusTone = "neutral" | "success" | "error";

type StatusMessage = {
  tone: StatusTone;
  message: string;
};

const STORAGE_KEY = "codex-config-viewer-state:v1";

function statusClassName(tone: StatusTone) {
  if (tone === "success") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  }

  if (tone === "error") {
    return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  }

  return "border-white/10 bg-white/5 text-slate-300";
}

function boolInputClass(checked: boolean) {
  return checked ? "bg-emerald-500/15 border-emerald-400/40" : "bg-white/[0.03] border-white/10";
}

export function ConfigEditor({
  locale,
  dictionary,
  initialDraft,
  initialPreview,
  initialUnsupportedToml,
}: ConfigEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ConfigDraft>(initialDraft);
  const [unsupportedToml, setUnsupportedToml] = useState(initialUnsupportedToml);
  const [preview, setPreview] = useState(initialPreview);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusMessage>({
    tone: "neutral",
    message: dictionary.app.feedback.idle,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const alternateLocale = getAlternateLocale(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as {
        draft: ConfigDraft;
        unsupportedToml: string;
        preview: string;
      };

      if (parsed.draft) {
        setDraft(parsed.draft);
      }

      if (typeof parsed.unsupportedToml === "string") {
        setUnsupportedToml(parsed.unsupportedToml);
      }

      if (typeof parsed.preview === "string" && parsed.preview.trim()) {
        setPreview(parsed.preview);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        draft,
        unsupportedToml,
        preview,
      }),
    );
  }, [draft, unsupportedToml, preview]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsGenerating(true);

      try {
        const response = await fetch("/api/config/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            draft,
            unsupportedToml,
          }),
          signal: controller.signal,
        });

        const data = (await response.json()) as GenerateConfigResponse & {
          error?: { message: string };
        };

        if (!response.ok || !data.toml) {
          throw new Error(data.error?.message || dictionary.app.feedback.generateFailed);
        }

        setPreview(data.toml);
        setWarnings((data.warnings || []).map((warning) => warning.message));
        setStatus({
          tone: "neutral",
          message: dictionary.app.actions.idle,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setStatus({
          tone: "error",
          message:
            error instanceof Error ? error.message : dictionary.app.feedback.generateFailed,
        });
      } finally {
        setIsGenerating(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [dictionary.app.actions.idle, dictionary.app.feedback.generateFailed, draft, unsupportedToml]);

  const sectionMeta = useMemo(
    () =>
      SECTION_ORDER.map((sectionId) => ({
        id: sectionId,
        title: dictionary.sections[sectionId].title,
      })),
    [dictionary.sections],
  );

  function fieldText<Key extends keyof Dictionary["fields"]>(key: Key) {
    const [label, hint] = dictionary.fields[key];
    return { label, hint };
  }

  function updateGeneral<Key extends keyof ConfigDraft["general"]>(
    key: Key,
    value: ConfigDraft["general"][Key],
  ) {
    setDraft((current) => ({
      ...current,
      general: {
        ...current.general,
        [key]: value,
      },
      tools:
        key === "webSearch"
          ? {
              ...current.tools,
              webSearch: value as ConfigDraft["tools"]["webSearch"],
            }
          : current.tools,
    }));
  }

  function updateHistory<Key extends keyof ConfigDraft["history"]>(
    key: Key,
    value: ConfigDraft["history"][Key],
  ) {
    setDraft((current) => ({
      ...current,
      history: {
        ...current.history,
        [key]: value,
      },
    }));
  }

  function updateFeatures<Key extends keyof ConfigDraft["features"]>(
    key: Key,
    value: ConfigDraft["features"][Key],
  ) {
    setDraft((current) => ({
      ...current,
      features: {
        ...current.features,
        [key]: value,
      },
    }));
  }

  function updateSandboxWorkspaceWrite<Key extends keyof ConfigDraft["sandboxWorkspaceWrite"]>(
    key: Key,
    value: ConfigDraft["sandboxWorkspaceWrite"][Key],
  ) {
    setDraft((current) => ({
      ...current,
      sandboxWorkspaceWrite: {
        ...current.sandboxWorkspaceWrite,
        [key]: value,
      },
    }));
  }

  function updateShellEnvironmentPolicy<Key extends keyof ConfigDraft["shellEnvironmentPolicy"]>(
    key: Key,
    value: ConfigDraft["shellEnvironmentPolicy"][Key],
  ) {
    setDraft((current) => ({
      ...current,
      shellEnvironmentPolicy: {
        ...current.shellEnvironmentPolicy,
        [key]: value,
      },
    }));
  }

  function updateTools<Key extends keyof ConfigDraft["tools"]>(
    key: Key,
    value: ConfigDraft["tools"][Key],
  ) {
    setDraft((current) => ({
      ...current,
      tools: {
        ...current.tools,
        [key]: value,
      },
      general:
        key === "webSearch"
          ? {
              ...current.general,
              webSearch: value as ConfigDraft["general"]["webSearch"],
            }
          : current.general,
    }));
  }

  function handleImportFile(file: File) {
    void (async () => {
      setIsImporting(true);

      try {
        const toml = await file.text();
        const response = await fetch("/api/config/parse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ toml }),
        });
        const data = (await response.json()) as ParseConfigResponse & {
          error?: { message: string; line?: number; column?: number };
        };

        if (!response.ok || !data.draft) {
          const message = data.error?.line
            ? `${data.error.message} (${data.error.line}:${data.error.column})`
            : data.error?.message || dictionary.app.import.invalid;
          throw new Error(message);
        }

        setDraft(data.draft);
        setUnsupportedToml(data.unsupportedToml);
        setWarnings((data.warnings || []).map((warning) => warning.message));
        setStatus({
          tone: "success",
          message: dictionary.app.import.success,
        });
      } catch (error) {
        setStatus({
          tone: "error",
          message: error instanceof Error ? error.message : dictionary.app.import.invalid,
        });
      } finally {
        setIsImporting(false);
      }
    })();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(preview);
      setStatus({
        tone: "success",
        message: dictionary.app.feedback.copied,
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : dictionary.app.feedback.generateFailed,
      });
    }
  }

  function handleDownload() {
    const blob = new Blob([preview], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "config.toml";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus({
      tone: "success",
      message: dictionary.app.feedback.downloaded,
    });
  }

  function resetToSample() {
    setDraft(createSampleDraft());
    setUnsupportedToml("");
    setWarnings([]);
    setPreview(initialPreview);
    setStatus({
      tone: "success",
      message: dictionary.app.sampleLabel,
    });
  }

  const sharedOptionBlank = (
    <option value="">{dictionary.app.common.blankOption}</option>
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:px-6">
        <header className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_80px_-40px_rgba(34,197,94,0.35)] backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                {dictionary.app.badge}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-400">
                <span>{dictionary.app.reference.label}</span>
                <a
                  className="text-emerald-300 underline decoration-emerald-400/40 underline-offset-4 transition hover:text-emerald-200"
                  href={SAMPLE_REFERENCE_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  {dictionary.app.reference.source}
                </a>
                <span>
                  {dictionary.app.reference.declaredAt}: {SAMPLE_REVIEWED_ON}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  {dictionary.app.title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  {dictionary.app.subtitle}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                className={primaryButtonClassName}
                href={VERCEL_DEPLOY_URL}
                target="_blank"
                rel="noreferrer"
              >
                {dictionary.app.actions.deployVercel}
              </a>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                <span className="mr-2 text-slate-400">{dictionary.app.language.label}</span>
                <Link
                  className="font-medium text-emerald-300 hover:text-emerald-200"
                  href={`/${alternateLocale}`}
                >
                  {alternateLocale === "en"
                    ? dictionary.app.language.en
                    : dictionary.app.language.zhCN}
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_420px]">
          <aside className="h-fit rounded-3xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur xl:sticky xl:top-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Sections
            </div>
            <nav className="space-y-2">
              {sectionMeta.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-2xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <main className="space-y-6">
            <SectionCard
              id="general"
              title={dictionary.sections.general.title}
              description={dictionary.sections.general.description}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field {...fieldText("model")}>
                  <input
                    className={inputClassName}
                    value={draft.general.model}
                    onChange={(event) => updateGeneral("model", event.target.value)}
                  />
                </Field>
                <Field {...fieldText("reviewModel")}>
                  <input
                    className={inputClassName}
                    value={draft.general.reviewModel}
                    onChange={(event) => updateGeneral("reviewModel", event.target.value)}
                  />
                </Field>
                <Field {...fieldText("modelProvider")}>
                  <input
                    className={inputClassName}
                    value={draft.general.modelProvider}
                    onChange={(event) => updateGeneral("modelProvider", event.target.value)}
                  />
                </Field>
                <Field {...fieldText("approvalPolicy")}>
                  <select
                    className={inputClassName}
                    value={draft.general.approvalPolicy}
                    onChange={(event) =>
                      updateGeneral(
                        "approvalPolicy",
                        event.target.value as ConfigDraft["general"]["approvalPolicy"],
                      )
                    }
                  >
                    {sharedOptionBlank}
                    {APPROVAL_POLICY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {dictionary.options.approvalPolicy[option]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field {...fieldText("sandboxMode")}>
                  <select
                    className={inputClassName}
                    value={draft.general.sandboxMode}
                    onChange={(event) =>
                      updateGeneral(
                        "sandboxMode",
                        event.target.value as ConfigDraft["general"]["sandboxMode"],
                      )
                    }
                  >
                    {sharedOptionBlank}
                    {SANDBOX_MODE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {dictionary.options.sandboxMode[option]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field {...fieldText("serviceTier")}>
                  <select
                    className={inputClassName}
                    value={draft.general.serviceTier}
                    onChange={(event) =>
                      updateGeneral(
                        "serviceTier",
                        event.target.value as ConfigDraft["general"]["serviceTier"],
                      )
                    }
                  >
                    {sharedOptionBlank}
                    {SERVICE_TIER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {dictionary.options.serviceTier[option]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field {...fieldText("activeProfile")}>
                  <input
                    className={inputClassName}
                    value={draft.general.activeProfile}
                    onChange={(event) => updateGeneral("activeProfile", event.target.value)}
                  />
                </Field>
                <Field {...fieldText("modelReasoningEffort")}>
                  <select
                    className={inputClassName}
                    value={draft.general.modelReasoningEffort}
                    onChange={(event) =>
                      updateGeneral(
                        "modelReasoningEffort",
                        event.target.value as ConfigDraft["general"]["modelReasoningEffort"],
                      )
                    }
                  >
                    {sharedOptionBlank}
                    {REASONING_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {dictionary.options.reasoning[option]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field {...fieldText("planModeReasoningEffort")}>
                  <select
                    className={inputClassName}
                    value={draft.general.planModeReasoningEffort}
                    onChange={(event) =>
                      updateGeneral(
                        "planModeReasoningEffort",
                        event.target.value as ConfigDraft["general"]["planModeReasoningEffort"],
                      )
                    }
                  >
                    {sharedOptionBlank}
                    {PLAN_REASONING_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {dictionary.options.reasoning[option]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field {...fieldText("modelReasoningSummary")}>
                  <input
                    className={inputClassName}
                    value={draft.general.modelReasoningSummary}
                    onChange={(event) =>
                      updateGeneral("modelReasoningSummary", event.target.value)
                    }
                  />
                </Field>
                <Field {...fieldText("ossProvider")}>
                  <input
                    className={inputClassName}
                    value={draft.general.ossProvider}
                    onChange={(event) => updateGeneral("ossProvider", event.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field {...fieldText("cliAuthCredentialsStore")}>
                  <select
                    className={inputClassName}
                    value={draft.general.cliAuthCredentialsStore}
                    onChange={(event) =>
                      updateGeneral(
                        "cliAuthCredentialsStore",
                        event.target.value as ConfigDraft["general"]["cliAuthCredentialsStore"],
                      )
                    }
                  >
                    {sharedOptionBlank}
                    {CREDENTIAL_STORE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {dictionary.options.credentialStore[option]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field {...fieldText("mcpOauthCredentialsStore")}>
                  <select
                    className={inputClassName}
                    value={draft.general.mcpOauthCredentialsStore}
                    onChange={(event) =>
                      updateGeneral(
                        "mcpOauthCredentialsStore",
                        event.target.value as ConfigDraft["general"]["mcpOauthCredentialsStore"],
                      )
                    }
                  >
                    {sharedOptionBlank}
                    {CREDENTIAL_STORE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {dictionary.options.credentialStore[option]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field {...fieldText("forcedLoginMethod")}>
                  <select
                    className={inputClassName}
                    value={draft.general.forcedLoginMethod}
                    onChange={(event) =>
                      updateGeneral(
                        "forcedLoginMethod",
                        event.target.value as ConfigDraft["general"]["forcedLoginMethod"],
                      )
                    }
                  >
                    {sharedOptionBlank}
                    {LOGIN_METHOD_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {dictionary.options.loginMethod[option]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field {...fieldText("chatgptBaseUrl")}>
                  <input
                    className={inputClassName}
                    value={draft.general.chatgptBaseUrl}
                    onChange={(event) => updateGeneral("chatgptBaseUrl", event.target.value)}
                  />
                </Field>
                <Field {...fieldText("forcedChatgptWorkspaceId")}>
                  <input
                    className={inputClassName}
                    value={draft.general.forcedChatgptWorkspaceId}
                    onChange={(event) =>
                      updateGeneral("forcedChatgptWorkspaceId", event.target.value)
                    }
                  />
                </Field>
                <Field {...fieldText("fileOpener")}>
                  <select
                    className={inputClassName}
                    value={draft.general.fileOpener}
                    onChange={(event) =>
                      updateGeneral(
                        "fileOpener",
                        event.target.value as ConfigDraft["general"]["fileOpener"],
                      )
                    }
                  >
                    {sharedOptionBlank}
                    {FILE_OPENER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {dictionary.options.fileOpener[option]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {([
                  ["hideAgentReasoning", draft.general.hideAgentReasoning],
                  ["showRawAgentReasoning", draft.general.showRawAgentReasoning],
                  ["disablePasteBurst", draft.general.disablePasteBurst],
                  [
                    "suppressUnstableFeaturesWarning",
                    draft.general.suppressUnstableFeaturesWarning,
                  ],
                ] as const).map(([key, checked]) => {
                  const { label, hint } = fieldText(key);

                  return (
                    <label
                      key={key}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${boolInputClass(checked)}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-emerald-400"
                        checked={checked}
                        onChange={(event) => updateGeneral(key, event.target.checked)}
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-200">{label}</div>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{hint}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard
              id="history"
              title={dictionary.sections.history.title}
              description={dictionary.sections.history.description}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field {...fieldText("historyPersistence")}>
                  <select
                    className={inputClassName}
                    value={draft.history.persistence}
                    onChange={(event) =>
                      updateHistory(
                        "persistence",
                        event.target.value as ConfigDraft["history"]["persistence"],
                      )
                    }
                  >
                    {sharedOptionBlank}
                    {HISTORY_PERSISTENCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {dictionary.options.historyPersistence[option]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field {...fieldText("historyMaxBytes")}>
                  <input
                    className={inputClassName}
                    inputMode="numeric"
                    value={draft.history.maxBytes}
                    onChange={(event) => updateHistory("maxBytes", event.target.value)}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              id="features"
              title={dictionary.sections.features.title}
              description={dictionary.sections.features.description}
            >
              <div className="grid gap-3 md:grid-cols-2">
                {([
                  ["disableFastModel", draft.features.disableFastModel],
                  [
                    "useExperimentalReasoningSummary",
                    draft.features.useExperimentalReasoningSummary,
                  ],
                ] as const).map(([key, checked]) => {
                  const { label, hint } = fieldText(key);

                  return (
                    <label
                      key={key}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${boolInputClass(checked)}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-emerald-400"
                        checked={checked}
                        onChange={(event) => updateFeatures(key, event.target.checked)}
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-200">{label}</div>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{hint}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard
              id="sandbox"
              title={dictionary.sections.sandbox.title}
              description={dictionary.sections.sandbox.description}
            >
              {draft.general.sandboxMode !== "workspace-write" ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  {dictionary.helpers.sandboxHidden}
                </div>
              ) : null}
              <StringListEditor
                {...fieldText("writableRoots")}
                values={draft.sandboxWorkspaceWrite.writableRoots}
                onChange={(values) => updateSandboxWorkspaceWrite("writableRoots", values)}
                addLabel={dictionary.app.actions.addItem}
                removeLabel={dictionary.app.actions.remove}
                emptyLabel={dictionary.app.emptyStates.list}
                placeholder="/absolute/path"
              />
              <label
                className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${boolInputClass(draft.sandboxWorkspaceWrite.networkAccess)}`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-emerald-400"
                  checked={draft.sandboxWorkspaceWrite.networkAccess}
                  onChange={(event) =>
                    updateSandboxWorkspaceWrite("networkAccess", event.target.checked)
                  }
                />
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    {fieldText("networkAccess").label}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {fieldText("networkAccess").hint}
                  </p>
                </div>
              </label>
            </SectionCard>

            <SectionCard
              id="shell"
              title={dictionary.sections.shell.title}
              description={dictionary.sections.shell.description}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field {...fieldText("shellInherit")}>
                  <select
                    className={inputClassName}
                    value={draft.shellEnvironmentPolicy.inherit}
                    onChange={(event) =>
                      updateShellEnvironmentPolicy(
                        "inherit",
                        event.target.value as ConfigDraft["shellEnvironmentPolicy"]["inherit"],
                      )
                    }
                  >
                    {sharedOptionBlank}
                    {SHELL_INHERITANCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {dictionary.options.inherit[option]}
                      </option>
                    ))}
                  </select>
                </Field>
                <label
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${boolInputClass(draft.shellEnvironmentPolicy.ignoreDefaultExcludes)}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-emerald-400"
                    checked={draft.shellEnvironmentPolicy.ignoreDefaultExcludes}
                    onChange={(event) =>
                      updateShellEnvironmentPolicy(
                        "ignoreDefaultExcludes",
                        event.target.checked,
                      )
                    }
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-200">
                      {fieldText("ignoreDefaultExcludes").label}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {fieldText("ignoreDefaultExcludes").hint}
                    </p>
                  </div>
                </label>
              </div>
              <StringListEditor
                {...fieldText("shellExclude")}
                values={draft.shellEnvironmentPolicy.exclude}
                onChange={(values) => updateShellEnvironmentPolicy("exclude", values)}
                addLabel={dictionary.app.actions.addItem}
                removeLabel={dictionary.app.actions.remove}
                emptyLabel={dictionary.app.emptyStates.list}
                placeholder="MY_ENV_VAR"
              />
              <StringListEditor
                {...fieldText("shellIncludeOnly")}
                values={draft.shellEnvironmentPolicy.includeOnly}
                onChange={(values) => updateShellEnvironmentPolicy("includeOnly", values)}
                addLabel={dictionary.app.actions.addItem}
                removeLabel={dictionary.app.actions.remove}
                emptyLabel={dictionary.app.emptyStates.list}
                placeholder="OPENAI_API_KEY"
              />
            </SectionCard>

            <SectionCard
              id="tools"
              title={dictionary.sections.tools.title}
              description={dictionary.sections.tools.description}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field {...fieldText("webSearch")}>
                  <select
                    className={inputClassName}
                    value={draft.tools.webSearch}
                    onChange={(event) =>
                      updateTools(
                        "webSearch",
                        event.target.value as ConfigDraft["tools"]["webSearch"],
                      )
                    }
                  >
                    {sharedOptionBlank}
                    {WEB_SEARCH_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {dictionary.options.webSearch[option]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              id="modelProviders"
              title={dictionary.sections.modelProviders.title}
              description={dictionary.sections.modelProviders.description}
            >
              <div className="space-y-4">
                {draft.modelProviders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-500">
                    {dictionary.app.emptyStates.modelProviders}
                  </div>
                ) : null}
                {draft.modelProviders.map((provider, index) => (
                  <div
                    key={`provider-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-white">
                        {provider.id || `${dictionary.fields.providerId[0]} ${index + 1}`}
                      </h3>
                      <button
                        type="button"
                        className={secondaryButtonClassName}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            modelProviders: current.modelProviders.filter(
                              (_, currentIndex) => currentIndex !== index,
                            ),
                          }))
                        }
                      >
                        {dictionary.app.actions.remove}
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <Field {...fieldText("providerId")}>
                        <input
                          className={inputClassName}
                          value={provider.id}
                          onChange={(event) =>
                            setDraft((current) => {
                              const modelProviders = [...current.modelProviders];
                              modelProviders[index] = {
                                ...provider,
                                id: event.target.value,
                              };
                              return {
                                ...current,
                                modelProviders,
                              };
                            })
                          }
                        />
                      </Field>
                      <Field {...fieldText("providerName")}>
                        <input
                          className={inputClassName}
                          value={provider.name}
                          onChange={(event) =>
                            setDraft((current) => {
                              const modelProviders = [...current.modelProviders];
                              modelProviders[index] = {
                                ...provider,
                                name: event.target.value,
                              };
                              return {
                                ...current,
                                modelProviders,
                              };
                            })
                          }
                        />
                      </Field>
                      <Field {...fieldText("baseUrl")}>
                        <input
                          className={inputClassName}
                          value={provider.baseUrl}
                          onChange={(event) =>
                            setDraft((current) => {
                              const modelProviders = [...current.modelProviders];
                              modelProviders[index] = {
                                ...provider,
                                baseUrl: event.target.value,
                              };
                              return {
                                ...current,
                                modelProviders,
                              };
                            })
                          }
                        />
                      </Field>
                      <Field {...fieldText("wireApi")}>
                        <input
                          className={inputClassName}
                          value={provider.wireApi}
                          onChange={(event) =>
                            setDraft((current) => {
                              const modelProviders = [...current.modelProviders];
                              modelProviders[index] = {
                                ...provider,
                                wireApi: event.target.value,
                              };
                              return {
                                ...current,
                                modelProviders,
                              };
                            })
                          }
                        />
                      </Field>
                      <Field {...fieldText("envKey")}>
                        <input
                          className={inputClassName}
                          value={provider.envKey}
                          onChange={(event) =>
                            setDraft((current) => {
                              const modelProviders = [...current.modelProviders];
                              modelProviders[index] = {
                                ...provider,
                                envKey: event.target.value,
                              };
                              return {
                                ...current,
                                modelProviders,
                              };
                            })
                          }
                        />
                      </Field>
                      <Field {...fieldText("envKeyInstructions")}>
                        <input
                          className={inputClassName}
                          value={provider.envKeyInstructions}
                          onChange={(event) =>
                            setDraft((current) => {
                              const modelProviders = [...current.modelProviders];
                              modelProviders[index] = {
                                ...provider,
                                envKeyInstructions: event.target.value,
                              };
                              return {
                                ...current,
                                modelProviders,
                              };
                            })
                          }
                        />
                      </Field>
                      <Field {...fieldText("requestMaxRetries")}>
                        <input
                          className={inputClassName}
                          inputMode="numeric"
                          value={provider.requestMaxRetries}
                          onChange={(event) =>
                            setDraft((current) => {
                              const modelProviders = [...current.modelProviders];
                              modelProviders[index] = {
                                ...provider,
                                requestMaxRetries: event.target.value,
                              };
                              return {
                                ...current,
                                modelProviders,
                              };
                            })
                          }
                        />
                      </Field>
                      <Field {...fieldText("streamMaxRetries")}>
                        <input
                          className={inputClassName}
                          inputMode="numeric"
                          value={provider.streamMaxRetries}
                          onChange={(event) =>
                            setDraft((current) => {
                              const modelProviders = [...current.modelProviders];
                              modelProviders[index] = {
                                ...provider,
                                streamMaxRetries: event.target.value,
                              };
                              return {
                                ...current,
                                modelProviders,
                              };
                            })
                          }
                        />
                      </Field>
                      <Field {...fieldText("streamIdleTimeoutMs")}>
                        <input
                          className={inputClassName}
                          inputMode="numeric"
                          value={provider.streamIdleTimeoutMs}
                          onChange={(event) =>
                            setDraft((current) => {
                              const modelProviders = [...current.modelProviders];
                              modelProviders[index] = {
                                ...provider,
                                streamIdleTimeoutMs: event.target.value,
                              };
                              return {
                                ...current,
                                modelProviders,
                              };
                            })
                          }
                        />
                      </Field>
                    </div>
                    <div className="mt-4 space-y-4">
                      <KeyValueListEditor
                        {...fieldText("queryParams")}
                        values={provider.queryParams}
                        onChange={(values) =>
                          setDraft((current) => {
                            const modelProviders = [...current.modelProviders];
                            modelProviders[index] = {
                              ...provider,
                              queryParams: values,
                            };
                            return {
                              ...current,
                              modelProviders,
                            };
                          })
                        }
                        addLabel={dictionary.app.actions.addItem}
                        removeLabel={dictionary.app.actions.remove}
                        emptyLabel={dictionary.app.emptyStates.pairs}
                        keyLabel={dictionary.app.common.key}
                        valueLabel={dictionary.app.common.value}
                      />
                      <KeyValueListEditor
                        {...fieldText("httpHeaders")}
                        values={provider.httpHeaders}
                        onChange={(values) =>
                          setDraft((current) => {
                            const modelProviders = [...current.modelProviders];
                            modelProviders[index] = {
                              ...provider,
                              httpHeaders: values,
                            };
                            return {
                              ...current,
                              modelProviders,
                            };
                          })
                        }
                        addLabel={dictionary.app.actions.addItem}
                        removeLabel={dictionary.app.actions.remove}
                        emptyLabel={dictionary.app.emptyStates.pairs}
                        keyLabel={dictionary.app.common.key}
                        valueLabel={dictionary.app.common.value}
                      />
                      <KeyValueListEditor
                        {...fieldText("envHttpHeaders")}
                        values={provider.envHttpHeaders}
                        onChange={(values) =>
                          setDraft((current) => {
                            const modelProviders = [...current.modelProviders];
                            modelProviders[index] = {
                              ...provider,
                              envHttpHeaders: values,
                            };
                            return {
                              ...current,
                              modelProviders,
                            };
                          })
                        }
                        addLabel={dictionary.app.actions.addItem}
                        removeLabel={dictionary.app.actions.remove}
                        emptyLabel={dictionary.app.emptyStates.pairs}
                        keyLabel={dictionary.app.common.key}
                        valueLabel={dictionary.app.common.value}
                      />
                      <label
                        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${boolInputClass(provider.supportsWebsockets)}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-emerald-400"
                          checked={provider.supportsWebsockets}
                          onChange={(event) =>
                            setDraft((current) => {
                              const modelProviders = [...current.modelProviders];
                              modelProviders[index] = {
                                ...provider,
                                supportsWebsockets: event.target.checked,
                              };
                              return {
                                ...current,
                                modelProviders,
                              };
                            })
                          }
                        />
                        <div>
                          <div className="text-sm font-medium text-slate-200">
                            {fieldText("supportsWebsockets").label}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            {fieldText("supportsWebsockets").hint}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className={secondaryButtonClassName}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      modelProviders: [...current.modelProviders, createEmptyModelProvider()],
                    }))
                  }
                >
                  {dictionary.app.actions.addItem}
                </button>
              </div>
            </SectionCard>

            <SectionCard
              id="mcpServers"
              title={dictionary.sections.mcpServers.title}
              description={dictionary.sections.mcpServers.description}
            >
              <div className="space-y-4">
                {draft.mcpServers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-500">
                    {dictionary.app.emptyStates.mcpServers}
                  </div>
                ) : null}
                {draft.mcpServers.map((server, index) => (
                  <div
                    key={`mcp-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-white">
                        {server.id || `${dictionary.fields.mcpId[0]} ${index + 1}`}
                      </h3>
                      <button
                        type="button"
                        className={secondaryButtonClassName}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            mcpServers: current.mcpServers.filter(
                              (_, currentIndex) => currentIndex !== index,
                            ),
                          }))
                        }
                      >
                        {dictionary.app.actions.remove}
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <Field {...fieldText("mcpId")}>
                        <input
                          className={inputClassName}
                          value={server.id}
                          onChange={(event) =>
                            setDraft((current) => {
                              const mcpServers = [...current.mcpServers];
                              mcpServers[index] = {
                                ...server,
                                id: event.target.value,
                              };
                              return { ...current, mcpServers };
                            })
                          }
                        />
                      </Field>
                      <Field label={dictionary.app.common.transport}>
                        <select
                          className={inputClassName}
                          value={server.transport}
                          onChange={(event) =>
                            setDraft((current) => {
                              const mcpServers = [...current.mcpServers];
                              mcpServers[index] = {
                                ...server,
                                transport: event.target.value as typeof server.transport,
                              };
                              return { ...current, mcpServers };
                            })
                          }
                        >
                          {TRANSPORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {dictionary.options.transport[option.value]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field {...fieldText(server.transport === "stdio" ? "command" : "url")}>
                        <input
                          className={inputClassName}
                          value={server.transport === "stdio" ? server.command : server.url}
                          onChange={(event) =>
                            setDraft((current) => {
                              const mcpServers = [...current.mcpServers];
                              mcpServers[index] =
                                server.transport === "stdio"
                                  ? { ...server, command: event.target.value }
                                  : { ...server, url: event.target.value };
                              return { ...current, mcpServers };
                            })
                          }
                        />
                      </Field>
                      {server.transport === "http" ? (
                        <Field {...fieldText("bearerTokenEnvVar")}>
                          <input
                            className={inputClassName}
                            value={server.bearerTokenEnvVar}
                            onChange={(event) =>
                              setDraft((current) => {
                                const mcpServers = [...current.mcpServers];
                                mcpServers[index] = {
                                  ...server,
                                  bearerTokenEnvVar: event.target.value,
                                };
                                return { ...current, mcpServers };
                              })
                            }
                          />
                        </Field>
                      ) : (
                        <Field {...fieldText("cwd")}>
                          <input
                            className={inputClassName}
                            value={server.cwd}
                            onChange={(event) =>
                              setDraft((current) => {
                                const mcpServers = [...current.mcpServers];
                                mcpServers[index] = {
                                  ...server,
                                  cwd: event.target.value,
                                };
                                return { ...current, mcpServers };
                              })
                            }
                          />
                        </Field>
                      )}
                      <Field {...fieldText("startupTimeoutSec")}>
                        <input
                          className={inputClassName}
                          inputMode="decimal"
                          value={server.startupTimeoutSec}
                          onChange={(event) =>
                            setDraft((current) => {
                              const mcpServers = [...current.mcpServers];
                              mcpServers[index] = {
                                ...server,
                                startupTimeoutSec: event.target.value,
                              };
                              return { ...current, mcpServers };
                            })
                          }
                        />
                      </Field>
                      <Field {...fieldText("toolTimeoutSec")}>
                        <input
                          className={inputClassName}
                          inputMode="decimal"
                          value={server.toolTimeoutSec}
                          onChange={(event) =>
                            setDraft((current) => {
                              const mcpServers = [...current.mcpServers];
                              mcpServers[index] = {
                                ...server,
                                toolTimeoutSec: event.target.value,
                              };
                              return { ...current, mcpServers };
                            })
                          }
                        />
                      </Field>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {([
                        ["enabled", server.enabled],
                        ["required", server.required],
                      ] as const).map(([key, checked]) => (
                        <label
                          key={key}
                          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${boolInputClass(checked)}`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-emerald-400"
                            checked={checked}
                            onChange={(event) =>
                              setDraft((current) => {
                                const mcpServers = [...current.mcpServers];
                                mcpServers[index] = {
                                  ...server,
                                  [key]: event.target.checked,
                                };
                                return { ...current, mcpServers };
                              })
                            }
                          />
                          <div>
                            <div className="text-sm font-medium text-slate-200">
                              {key === "enabled"
                                ? dictionary.app.common.enabled
                                : dictionary.app.common.required}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {server.transport === "stdio" ? (
                      <>
                        <StringListEditor
                          {...fieldText("args")}
                          values={server.args}
                          onChange={(values) =>
                            setDraft((current) => {
                              const mcpServers = [...current.mcpServers];
                              mcpServers[index] = {
                                ...server,
                                args: values,
                              };
                              return { ...current, mcpServers };
                            })
                          }
                          addLabel={dictionary.app.actions.addItem}
                          removeLabel={dictionary.app.actions.remove}
                          emptyLabel={dictionary.app.emptyStates.list}
                          placeholder="--port"
                        />
                        <KeyValueListEditor
                          {...fieldText("env")}
                          values={server.env}
                          onChange={(values) =>
                            setDraft((current) => {
                              const mcpServers = [...current.mcpServers];
                              mcpServers[index] = {
                                ...server,
                                env: values,
                              };
                              return { ...current, mcpServers };
                            })
                          }
                          addLabel={dictionary.app.actions.addItem}
                          removeLabel={dictionary.app.actions.remove}
                          emptyLabel={dictionary.app.emptyStates.pairs}
                          keyLabel={dictionary.app.common.key}
                          valueLabel={dictionary.app.common.value}
                        />
                      </>
                    ) : (
                      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                        {dictionary.helpers.mcpHttpMode}
                      </div>
                    )}
                    <div className="mt-4 space-y-4">
                      <KeyValueListEditor
                        {...fieldText("httpHeaders")}
                        values={server.httpHeaders}
                        onChange={(values) =>
                          setDraft((current) => {
                            const mcpServers = [...current.mcpServers];
                            mcpServers[index] = {
                              ...server,
                              httpHeaders: values,
                            };
                            return { ...current, mcpServers };
                          })
                        }
                        addLabel={dictionary.app.actions.addItem}
                        removeLabel={dictionary.app.actions.remove}
                        emptyLabel={dictionary.app.emptyStates.pairs}
                        keyLabel={dictionary.app.common.key}
                        valueLabel={dictionary.app.common.value}
                      />
                      <KeyValueListEditor
                        {...fieldText("envHttpHeaders")}
                        values={server.envHttpHeaders}
                        onChange={(values) =>
                          setDraft((current) => {
                            const mcpServers = [...current.mcpServers];
                            mcpServers[index] = {
                              ...server,
                              envHttpHeaders: values,
                            };
                            return { ...current, mcpServers };
                          })
                        }
                        addLabel={dictionary.app.actions.addItem}
                        removeLabel={dictionary.app.actions.remove}
                        emptyLabel={dictionary.app.emptyStates.pairs}
                        keyLabel={dictionary.app.common.key}
                        valueLabel={dictionary.app.common.value}
                      />
                      <StringListEditor
                        {...fieldText("enabledTools")}
                        values={server.enabledTools}
                        onChange={(values) =>
                          setDraft((current) => {
                            const mcpServers = [...current.mcpServers];
                            mcpServers[index] = {
                              ...server,
                              enabledTools: values,
                            };
                            return { ...current, mcpServers };
                          })
                        }
                        addLabel={dictionary.app.actions.addItem}
                        removeLabel={dictionary.app.actions.remove}
                        emptyLabel={dictionary.app.emptyStates.list}
                        placeholder="list_issues"
                      />
                      <StringListEditor
                        {...fieldText("disabledTools")}
                        values={server.disabledTools}
                        onChange={(values) =>
                          setDraft((current) => {
                            const mcpServers = [...current.mcpServers];
                            mcpServers[index] = {
                              ...server,
                              disabledTools: values,
                            };
                            return { ...current, mcpServers };
                          })
                        }
                        addLabel={dictionary.app.actions.addItem}
                        removeLabel={dictionary.app.actions.remove}
                        emptyLabel={dictionary.app.emptyStates.list}
                        placeholder="slow-tool"
                      />
                      <StringListEditor
                        {...fieldText("scopes")}
                        values={server.scopes}
                        onChange={(values) =>
                          setDraft((current) => {
                            const mcpServers = [...current.mcpServers];
                            mcpServers[index] = {
                              ...server,
                              scopes: values,
                            };
                            return { ...current, mcpServers };
                          })
                        }
                        addLabel={dictionary.app.actions.addItem}
                        removeLabel={dictionary.app.actions.remove}
                        emptyLabel={dictionary.app.emptyStates.list}
                        placeholder="read:docs"
                      />
                      <Field {...fieldText("oauthResource")}>
                        <input
                          className={inputClassName}
                          value={server.oauthResource}
                          onChange={(event) =>
                            setDraft((current) => {
                              const mcpServers = [...current.mcpServers];
                              mcpServers[index] = {
                                ...server,
                                oauthResource: event.target.value,
                              };
                              return { ...current, mcpServers };
                            })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className={secondaryButtonClassName}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      mcpServers: [...current.mcpServers, createEmptyMcpServer()],
                    }))
                  }
                >
                  {dictionary.app.actions.addItem}
                </button>
              </div>
            </SectionCard>

            <SectionCard
              id="profiles"
              title={dictionary.sections.profiles.title}
              description={dictionary.sections.profiles.description}
            >
              <div className="space-y-4">
                {draft.profiles.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-500">
                    {dictionary.app.emptyStates.profiles}
                  </div>
                ) : null}
                {draft.profiles.map((profile, index) => (
                  <div
                    key={`profile-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-white">
                        {profile.id || `${dictionary.fields.profileId[0]} ${index + 1}`}
                      </h3>
                      <button
                        type="button"
                        className={secondaryButtonClassName}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            profiles: current.profiles.filter(
                              (_, currentIndex) => currentIndex !== index,
                            ),
                          }))
                        }
                      >
                        {dictionary.app.actions.remove}
                      </button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <Field {...fieldText("profileId")}>
                        <input
                          className={inputClassName}
                          value={profile.id}
                          onChange={(event) =>
                            setDraft((current) => {
                              const profiles = [...current.profiles];
                              profiles[index] = {
                                ...profile,
                                id: event.target.value,
                              };
                              return { ...current, profiles };
                            })
                          }
                        />
                      </Field>
                      <Field {...fieldText("model")}>
                        <input
                          className={inputClassName}
                          value={profile.model}
                          onChange={(event) =>
                            setDraft((current) => {
                              const profiles = [...current.profiles];
                              profiles[index] = {
                                ...profile,
                                model: event.target.value,
                              };
                              return { ...current, profiles };
                            })
                          }
                        />
                      </Field>
                      <Field {...fieldText("modelProvider")}>
                        <input
                          className={inputClassName}
                          value={profile.modelProvider}
                          onChange={(event) =>
                            setDraft((current) => {
                              const profiles = [...current.profiles];
                              profiles[index] = {
                                ...profile,
                                modelProvider: event.target.value,
                              };
                              return { ...current, profiles };
                            })
                          }
                        />
                      </Field>
                      <Field {...fieldText("approvalPolicy")}>
                        <select
                          className={inputClassName}
                          value={profile.approvalPolicy}
                          onChange={(event) =>
                            setDraft((current) => {
                              const profiles = [...current.profiles];
                              profiles[index] = {
                                ...profile,
                                approvalPolicy: event.target.value as typeof profile.approvalPolicy,
                              };
                              return { ...current, profiles };
                            })
                          }
                        >
                          {sharedOptionBlank}
                          {APPROVAL_POLICY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {dictionary.options.approvalPolicy[option]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field {...fieldText("sandboxMode")}>
                        <select
                          className={inputClassName}
                          value={profile.sandboxMode}
                          onChange={(event) =>
                            setDraft((current) => {
                              const profiles = [...current.profiles];
                              profiles[index] = {
                                ...profile,
                                sandboxMode: event.target.value as typeof profile.sandboxMode,
                              };
                              return { ...current, profiles };
                            })
                          }
                        >
                          {sharedOptionBlank}
                          {SANDBOX_MODE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {dictionary.options.sandboxMode[option]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field {...fieldText("serviceTier")}>
                        <select
                          className={inputClassName}
                          value={profile.serviceTier}
                          onChange={(event) =>
                            setDraft((current) => {
                              const profiles = [...current.profiles];
                              profiles[index] = {
                                ...profile,
                                serviceTier: event.target.value as typeof profile.serviceTier,
                              };
                              return { ...current, profiles };
                            })
                          }
                        >
                          {sharedOptionBlank}
                          {SERVICE_TIER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {dictionary.options.serviceTier[option]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field {...fieldText("ossProvider")}>
                        <input
                          className={inputClassName}
                          value={profile.ossProvider}
                          onChange={(event) =>
                            setDraft((current) => {
                              const profiles = [...current.profiles];
                              profiles[index] = {
                                ...profile,
                                ossProvider: event.target.value,
                              };
                              return { ...current, profiles };
                            })
                          }
                        />
                      </Field>
                      <Field {...fieldText("modelReasoningEffort")}>
                        <select
                          className={inputClassName}
                          value={profile.modelReasoningEffort}
                          onChange={(event) =>
                            setDraft((current) => {
                              const profiles = [...current.profiles];
                              profiles[index] = {
                                ...profile,
                                modelReasoningEffort:
                                  event.target.value as typeof profile.modelReasoningEffort,
                              };
                              return { ...current, profiles };
                            })
                          }
                        >
                          {sharedOptionBlank}
                          {REASONING_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {dictionary.options.reasoning[option]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field {...fieldText("planModeReasoningEffort")}>
                        <select
                          className={inputClassName}
                          value={profile.planModeReasoningEffort}
                          onChange={(event) =>
                            setDraft((current) => {
                              const profiles = [...current.profiles];
                              profiles[index] = {
                                ...profile,
                                planModeReasoningEffort:
                                  event.target.value as typeof profile.planModeReasoningEffort,
                              };
                              return { ...current, profiles };
                            })
                          }
                        >
                          {sharedOptionBlank}
                          {PLAN_REASONING_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {dictionary.options.reasoning[option]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field {...fieldText("modelReasoningSummary")}>
                        <input
                          className={inputClassName}
                          value={profile.modelReasoningSummary}
                          onChange={(event) =>
                            setDraft((current) => {
                              const profiles = [...current.profiles];
                              profiles[index] = {
                                ...profile,
                                modelReasoningSummary: event.target.value,
                              };
                              return { ...current, profiles };
                            })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className={secondaryButtonClassName}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      profiles: [...current.profiles, createEmptyProfile()],
                    }))
                  }
                >
                  {dictionary.app.actions.addItem}
                </button>
              </div>
            </SectionCard>

            <SectionCard
              id="projects"
              title={dictionary.sections.projects.title}
              description={dictionary.sections.projects.description}
            >
              <div className="space-y-4">
                {draft.projects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-500">
                    {dictionary.app.emptyStates.projects}
                  </div>
                ) : null}
                {draft.projects.map((project, index) => (
                  <div
                    key={`project-${index}`}
                    className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[minmax(0,1fr)_240px_auto]"
                  >
                    <Field {...fieldText("projectPath")}>
                      <input
                        className={inputClassName}
                        value={project.path}
                        onChange={(event) =>
                          setDraft((current) => {
                            const projects = [...current.projects];
                            projects[index] = {
                              ...project,
                              path: event.target.value,
                            };
                            return { ...current, projects };
                          })
                        }
                      />
                    </Field>
                    <Field {...fieldText("trustLevel")}>
                      <select
                        className={inputClassName}
                        value={project.trustLevel}
                        onChange={(event) =>
                          setDraft((current) => {
                            const projects = [...current.projects];
                            projects[index] = {
                              ...project,
                              trustLevel: event.target.value as typeof project.trustLevel,
                            };
                            return { ...current, projects };
                          })
                        }
                      >
                        {sharedOptionBlank}
                        {TRUST_LEVEL_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {dictionary.options.trustLevel[option]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="flex items-end">
                      <button
                        type="button"
                        className={secondaryButtonClassName}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            projects: current.projects.filter(
                              (_, currentIndex) => currentIndex !== index,
                            ),
                          }))
                        }
                      >
                        {dictionary.app.actions.remove}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className={secondaryButtonClassName}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      projects: [...current.projects, createEmptyProject()],
                    }))
                  }
                >
                  {dictionary.app.actions.addItem}
                </button>
              </div>
            </SectionCard>

            <SectionCard
              id="advanced"
              title={dictionary.sections.advanced.title}
              description={dictionary.sections.advanced.description}
            >
              <Field
                label={dictionary.app.advanced.title}
                hint={dictionary.app.advanced.description}
              >
                <textarea
                  className={`${textareaClassName} min-h-72`}
                  value={unsupportedToml}
                  placeholder={dictionary.app.advanced.placeholder}
                  onChange={(event) => setUnsupportedToml(event.target.value)}
                />
              </Field>
            </SectionCard>
          </main>

          <aside className="h-fit space-y-4 xl:sticky xl:top-4">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur">
              <div className="mb-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
                <div className="text-sm font-semibold text-sky-100">
                  {dictionary.app.deploy.label}
                </div>
                <p className="mt-1 text-sm leading-6 text-sky-50/85">
                  {dictionary.app.deploy.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <a
                    className={primaryButtonClassName}
                    href={VERCEL_DEPLOY_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {dictionary.app.actions.deployVercel}
                  </a>
                  <a
                    className={secondaryButtonClassName}
                    href={REPOSITORY_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={primaryButtonClassName}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  {dictionary.app.actions.importFile}
                </button>
                <button
                  type="button"
                  className={secondaryButtonClassName}
                  onClick={resetToSample}
                >
                  {dictionary.app.actions.resetSample}
                </button>
                <button type="button" className={secondaryButtonClassName} onClick={handleCopy}>
                  {dictionary.app.actions.copyToml}
                </button>
                <button type="button" className={secondaryButtonClassName} onClick={handleDownload}>
                  {dictionary.app.actions.downloadToml}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".toml,text/plain"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleImportFile(file);
                  }

                  event.currentTarget.value = "";
                }}
              />
            </div>

            <div className={`rounded-3xl border p-4 text-sm ${statusClassName(status.tone)}`}>
              {status.message}
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {dictionary.app.preview.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    {dictionary.app.preview.description}
                  </p>
                </div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                  {isGenerating
                    ? dictionary.app.actions.generating
                    : dictionary.app.actions.idle}
                </div>
              </div>
              {warnings.length > 0 ? (
                <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                    {dictionary.app.preview.warnings}
                  </div>
                  <ul className="space-y-2 text-sm text-amber-100">
                    {warnings.map((warning, index) => (
                      <li key={`${warning}-${index}`}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-4">
                <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">
                  {preview || dictionary.app.preview.empty}
                </pre>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                <div>
                  {dictionary.app.reference.label}:{" "}
                  <a
                    className="text-emerald-300 underline decoration-emerald-400/40 underline-offset-4 transition hover:text-emerald-200"
                    href={SAMPLE_REFERENCE_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {dictionary.app.reference.source}
                  </a>
                </div>
                <div>
                  {dictionary.app.reference.declaredAt}: {SAMPLE_REVIEWED_ON}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
