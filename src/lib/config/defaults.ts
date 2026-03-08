import type {
  ConfigDraft,
  McpServerDraft,
  ModelProviderDraft,
  ProfileDraft,
  ProjectDraft,
} from "@/lib/config/types";

export const SAMPLE_REVIEWED_ON = "2026-03-08";
export const SAMPLE_REFERENCE_URL = "https://developers.openai.com/codex/config-sample/";
export const REPOSITORY_URL = "https://github.com/depressi0n/codex-config-viewer";
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
      forcedChatgptWorkspaceId: "",
      forcedLoginMethod: "",
      mcpOauthCredentialsStore: "",
      fileOpener: "",
      hideAgentReasoning: false,
      showRawAgentReasoning: false,
      disablePasteBurst: false,
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
    },
    shellEnvironmentPolicy: {
      inherit: "",
      ignoreDefaultExcludes: false,
      exclude: [],
      includeOnly: [],
    },
    tools: {
      webSearch: "",
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
      reviewModel: "gpt-5.4",
      modelProvider: "openai",
      approvalPolicy: "on-request",
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
      forcedChatgptWorkspaceId: "",
      forcedLoginMethod: "",
      mcpOauthCredentialsStore: "auto",
      fileOpener: "vscode",
      hideAgentReasoning: false,
      showRawAgentReasoning: false,
      disablePasteBurst: false,
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
    },
    shellEnvironmentPolicy: {
      inherit: "all",
      ignoreDefaultExcludes: false,
      exclude: [],
      includeOnly: [],
    },
    tools: {
      webSearch: "cached",
    },
    modelProviders: [],
    mcpServers: [],
    profiles: [],
    projects: [],
  };
}
