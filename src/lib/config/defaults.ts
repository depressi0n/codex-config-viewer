import type {
  ConfigDraft,
  McpServerDraft,
  ModelProviderDraft,
  ProfileDraft,
  ProjectDraft,
} from "@/lib/config/types";

export const SAMPLE_REVIEWED_ON = "2026-03-19";
export const SAMPLE_REFERENCE_URL = "https://developers.openai.com/codex/config-sample/";
export const REPOSITORY_URL = "https://github.com/depressi0n/codex-config-viewer";
export const SAMPLE_UNSUPPORTED_TOML = [
  "[tui]",
  "notifications = false",
  "animations = true",
  "show_tooltips = true",
  "",
  "[analytics]",
  "enabled = true",
  "",
  "[feedback]",
  "enabled = true",
  "",
  "[otel]",
  "log_user_prompt = false",
  'environment = "dev"',
  'exporter = "none"',
  'trace_exporter = "none"',
  'metrics_exporter = "statsig"',
  "",
  "[windows]",
  'sandbox = "unelevated"',
  "",
].join("\n");
export const VERCEL_DEPLOY_URL = `https://vercel.com/new/clone?${new URLSearchParams({
  "repository-url": REPOSITORY_URL,
  "project-name": "codex-config-viewer",
  "repository-name": "codex-config-viewer",
}).toString()}`;

export function createEmptyModelProvider(): ModelProviderDraft {
  return {
    id: "",
    name: "",
    baseUrl: "",
    wireApi: "",
    queryParams: [],
    envKey: "",
    envKeyInstructions: "",
    requestMaxRetries: "",
    streamMaxRetries: "",
    streamIdleTimeoutMs: "",
    supportsWebsockets: false,
    experimentalBearerToken: "",
    httpHeaders: [],
    envHttpHeaders: [],
  };
}

export function createEmptyMcpServer(): McpServerDraft {
  return {
    id: "",
    transport: "stdio",
    enabled: true,
    required: false,
    command: "",
    args: [],
    env: [],
    cwd: "",
    url: "",
    bearerTokenEnvVar: "",
    httpHeaders: [],
    envHttpHeaders: [],
    startupTimeoutSec: "",
    toolTimeoutSec: "",
    enabledTools: [],
    disabledTools: [],
    scopes: [],
    oauthResource: "",
  };
}

export function createEmptyProfile(): ProfileDraft {
  return {
    id: "",
    model: "",
    modelProvider: "",
    approvalPolicy: "",
    sandboxMode: "",
    serviceTier: "",
    ossProvider: "",
    modelReasoningEffort: "",
    planModeReasoningEffort: "",
    modelReasoningSummary: "",
  };
}

export function createEmptyProject(): ProjectDraft {
  return {
    path: "",
    trustLevel: "",
  };
}

export function createEmptyDraft(): ConfigDraft {
  return {
    general: {
      model: "",
      reviewModel: "",
      modelProvider: "",
      approvalPolicy: "",
      allowLoginShell: false,
      sandboxMode: "",
      serviceTier: "",
      webSearch: "",
      activeProfile: "",
      modelReasoningEffort: "",
      planModeReasoningEffort: "",
      modelReasoningSummary: "",
      ossProvider: "",
      cliAuthCredentialsStore: "",
      chatgptBaseUrl: "",
      openaiBaseUrl: "",
      forcedChatgptWorkspaceId: "",
      forcedLoginMethod: "",
      mcpOauthCredentialsStore: "",
      mcpOauthCallbackPort: "",
      mcpOauthCallbackUrl: "",
      projectDocMaxBytes: "",
      projectDocFallbackFilenames: [],
      projectRootMarkers: [],
      notify: [],
      fileOpener: "",
      hideAgentReasoning: false,
      showRawAgentReasoning: false,
      disablePasteBurst: false,
      windowsWslSetupAcknowledged: false,
      checkForUpdateOnStartup: false,
      suppressUnstableFeaturesWarning: false,
    },
    history: {
      persistence: "",
      maxBytes: "",
    },
    features: {
      disableFastModel: false,
      useExperimentalReasoningSummary: false,
    },
    sandboxWorkspaceWrite: {
      writableRoots: [],
      networkAccess: false,
      excludeTmpdirEnvVar: false,
      excludeSlashTmp: false,
    },
    shellEnvironmentPolicy: {
      inherit: "",
      ignoreDefaultExcludes: false,
      exclude: [],
      set: [],
      includeOnly: [],
      experimentalUseProfile: false,
    },
    tools: {
      webSearch: "",
      viewImage: false,
    },
    modelProviders: [],
    mcpServers: [],
    profiles: [],
    projects: [],
  };
}

export function createSampleDraft(): ConfigDraft {
  return {
    general: {
      model: "gpt-5.4",
      reviewModel: "",
      modelProvider: "openai",
      approvalPolicy: "on-request",
      allowLoginShell: true,
      sandboxMode: "read-only",
      serviceTier: "",
      webSearch: "cached",
      activeProfile: "",
      modelReasoningEffort: "",
      planModeReasoningEffort: "",
      modelReasoningSummary: "",
      ossProvider: "",
      cliAuthCredentialsStore: "file",
      chatgptBaseUrl: "https://chatgpt.com/backend-api/",
      openaiBaseUrl: "",
      forcedChatgptWorkspaceId: "",
      forcedLoginMethod: "",
      mcpOauthCredentialsStore: "auto",
      mcpOauthCallbackPort: "",
      mcpOauthCallbackUrl: "",
      projectDocMaxBytes: "32768",
      projectDocFallbackFilenames: [],
      projectRootMarkers: [],
      notify: [],
      fileOpener: "vscode",
      hideAgentReasoning: false,
      showRawAgentReasoning: false,
      disablePasteBurst: false,
      windowsWslSetupAcknowledged: false,
      checkForUpdateOnStartup: true,
      suppressUnstableFeaturesWarning: false,
    },
    history: {
      persistence: "save-all",
      maxBytes: "",
    },
    features: {
      disableFastModel: false,
      useExperimentalReasoningSummary: false,
    },
    sandboxWorkspaceWrite: {
      writableRoots: [],
      networkAccess: false,
      excludeTmpdirEnvVar: false,
      excludeSlashTmp: false,
    },
    shellEnvironmentPolicy: {
      inherit: "all",
      ignoreDefaultExcludes: false,
      exclude: [],
      set: [],
      includeOnly: [],
      experimentalUseProfile: false,
    },
    tools: {
      webSearch: "cached",
      viewImage: false,
    },
    modelProviders: [],
    mcpServers: [],
    profiles: [],
    projects: [],
  };
}

export function createRecommendedDraft(): ConfigDraft {
  const draft = createSampleDraft();

  draft.general.approvalPolicy = "on-failure";
  draft.general.sandboxMode = "workspace-write";
  draft.general.webSearch = "live";
  draft.history.persistence = "save-all";
  draft.sandboxWorkspaceWrite.networkAccess = true;
  draft.shellEnvironmentPolicy.inherit = "core";
  draft.tools.webSearch = "live";

  return draft;
}
