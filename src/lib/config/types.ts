export type SupportedLocale = "en" | "zh-CN";

export type ReasoningEffortValue =
  | ""
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export type PlanReasoningEffortValue = "" | "none" | Exclude<ReasoningEffortValue, "">;

export type ApprovalPolicyValue =
  | ""
  | "untrusted"
  | "on-failure"
  | "on-request"
  | "never";

export type SandboxModeValue =
  | ""
  | "read-only"
  | "workspace-write"
  | "danger-full-access";

export type HistoryPersistenceValue = "" | "save-all" | "none";

export type ShellInheritanceValue = "" | "all" | "core" | "none";

export type WebSearchValue = "" | "disabled" | "cached" | "live";

export type CredentialStoreValue = "" | "file" | "keyring" | "auto";

export type LoginMethodValue = "" | "chatgpt" | "api";

export type FileOpenerValue =
  | ""
  | "vscode"
  | "vscode-insiders"
  | "windsurf"
  | "cursor"
  | "none";

export type ServiceTierValue = "" | "fast" | "flex";

export type TransportValue = "stdio" | "http";

export type TrustLevelValue = "" | "trusted" | "untrusted";

export interface KeyValueItem {
  key: string;
  value: string;
}

export interface GeneralSettings {
  model: string;
  reviewModel: string;
  modelProvider: string;
  approvalPolicy: ApprovalPolicyValue;
  allowLoginShell: boolean;
  sandboxMode: SandboxModeValue;
  serviceTier: ServiceTierValue;
  webSearch: WebSearchValue;
  activeProfile: string;
  modelReasoningEffort: ReasoningEffortValue;
  planModeReasoningEffort: PlanReasoningEffortValue;
  modelReasoningSummary: string;
  ossProvider: string;
  cliAuthCredentialsStore: CredentialStoreValue;
  chatgptBaseUrl: string;
  openaiBaseUrl: string;
  forcedChatgptWorkspaceId: string;
  forcedLoginMethod: LoginMethodValue;
  mcpOauthCredentialsStore: CredentialStoreValue;
  mcpOauthCallbackPort: string;
  mcpOauthCallbackUrl: string;
  projectDocMaxBytes: string;
  projectDocFallbackFilenames: string[];
  projectRootMarkers: string[];
  notify: string[];
  fileOpener: FileOpenerValue;
  hideAgentReasoning: boolean;
  showRawAgentReasoning: boolean;
  disablePasteBurst: boolean;
  windowsWslSetupAcknowledged: boolean;
  checkForUpdateOnStartup: boolean;
  suppressUnstableFeaturesWarning: boolean;
}

export interface HistorySettings {
  persistence: HistoryPersistenceValue;
  maxBytes: string;
}

export interface FeaturesSettings {
  disableFastModel: boolean;
  useExperimentalReasoningSummary: boolean;
}

export interface SandboxWorkspaceWriteSettings {
  writableRoots: string[];
  networkAccess: boolean;
  excludeTmpdirEnvVar: boolean;
  excludeSlashTmp: boolean;
}

export interface ShellEnvironmentSettings {
  inherit: ShellInheritanceValue;
  ignoreDefaultExcludes: boolean;
  exclude: string[];
  set: KeyValueItem[];
  includeOnly: string[];
  experimentalUseProfile: boolean;
}

export interface ToolsSettings {
  webSearch: WebSearchValue;
  viewImage: boolean;
}

export interface ModelProviderDraft {
  id: string;
  name: string;
  baseUrl: string;
  wireApi: string;
  queryParams: KeyValueItem[];
  envKey: string;
  envKeyInstructions: string;
  requestMaxRetries: string;
  streamMaxRetries: string;
  streamIdleTimeoutMs: string;
  supportsWebsockets: boolean;
  experimentalBearerToken: string;
  httpHeaders: KeyValueItem[];
  envHttpHeaders: KeyValueItem[];
}

export interface McpServerDraft {
  id: string;
  transport: TransportValue;
  enabled: boolean;
  required: boolean;
  command: string;
  args: string[];
  env: KeyValueItem[];
  cwd: string;
  url: string;
  bearerTokenEnvVar: string;
  httpHeaders: KeyValueItem[];
  envHttpHeaders: KeyValueItem[];
  startupTimeoutSec: string;
  toolTimeoutSec: string;
  enabledTools: string[];
  disabledTools: string[];
  scopes: string[];
  oauthResource: string;
}

export interface ProfileDraft {
  id: string;
  model: string;
  modelProvider: string;
  approvalPolicy: ApprovalPolicyValue;
  sandboxMode: SandboxModeValue;
  serviceTier: ServiceTierValue;
  ossProvider: string;
  modelReasoningEffort: ReasoningEffortValue;
  planModeReasoningEffort: PlanReasoningEffortValue;
  modelReasoningSummary: string;
}

export interface ProjectDraft {
  path: string;
  trustLevel: TrustLevelValue;
}

export interface ConfigDraft {
  general: GeneralSettings;
  history: HistorySettings;
  features: FeaturesSettings;
  sandboxWorkspaceWrite: SandboxWorkspaceWriteSettings;
  shellEnvironmentPolicy: ShellEnvironmentSettings;
  tools: ToolsSettings;
  modelProviders: ModelProviderDraft[];
  mcpServers: McpServerDraft[];
  profiles: ProfileDraft[];
  projects: ProjectDraft[];
}

export type TomlObject = Record<string, unknown>;

export interface ConfigParseWarning {
  message: string;
}

export interface ConfigValidationIssue {
  severity: "error" | "warning";
  path: string;
  message: string;
}

export interface ConfigParseErrorShape {
  message: string;
  line?: number;
  column?: number;
  codeblock?: string;
}

export interface ParseConfigResponse {
  draft: ConfigDraft;
  unsupportedToml: string;
  warnings: ConfigParseWarning[];
  validationIssues: ConfigValidationIssue[];
}

export interface GenerateConfigResponse {
  toml: string;
  warnings: ConfigParseWarning[];
  validationIssues: ConfigValidationIssue[];
}

export interface GenerateConfigOptions {
  includeComments?: boolean;
  locale?: SupportedLocale;
}
