export type SupportedLocale = "en" | "zh-CN";

export type ReasoningEffortValue =
  | ""
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export type PlanReasoningEffortValue = "" | "none" | Exclude<ReasoningEffortValue, "">;

export type VerbosityValue = "" | "low" | "medium" | "high";

export type PersonalityValue = "" | "none" | "friendly" | "pragmatic";

export type ApprovalsReviewerValue = "" | "user" | "auto_review";

export type ApprovalPolicyValue =
  | ""
  | "untrusted"
  | "on-failure"
  | "on-request"
  | "never"
  | "granular";

export type SandboxModeValue =
  | ""
  | "read-only"
  | "workspace-write"
  | "danger-full-access";

export type HistoryPersistenceValue = "" | "save-all" | "none";

export type ShellInheritanceValue = "" | "all" | "core" | "none";

export type WebSearchValue = "" | "disabled" | "cached" | "indexed" | "live";

export type ModelAutoCompactTokenLimitScopeValue =
  | ""
  | "total"
  | "body_after_prefix";

export type CredentialStoreValue = "" | "file" | "keyring" | "auto";

export type LoginMethodValue = "" | "chatgpt" | "api";

export type FeatureToggleValue = "" | "enabled" | "disabled";

export type FileOpenerValue =
  | ""
  | "vscode"
  | "vscode-insiders"
  | "windsurf"
  | "cursor"
  | "none";

export type ServiceTierValue = "" | "fast" | "flex";

export type TransportValue = "stdio" | "http";

export type McpAuthValue = "" | "oauth" | "chatgpt";

export type ToolApprovalModeValue = "" | "auto" | "prompt" | "writes" | "approve";

export type TrustLevelValue = "" | "trusted" | "untrusted";

export interface KeyValueItem {
  key: string;
  value: string;
}

export interface GranularApprovalSettings {
  sandboxApproval: boolean;
  rules: boolean;
  mcpElicitations: boolean;
  requestPermissions: boolean;
  skillApproval: boolean;
}

export interface GeneralSettings {
  model: string;
  reviewModel: string;
  modelProvider: string;
  approvalPolicy: ApprovalPolicyValue;
  approvalPolicyGranular: GranularApprovalSettings;
  approvalsReviewer: ApprovalsReviewerValue;
  allowLoginShell: boolean;
  sandboxMode: SandboxModeValue;
  serviceTier: ServiceTierValue;
  webSearch: WebSearchValue;
  activeProfile: string;
  modelReasoningEffort: ReasoningEffortValue;
  planModeReasoningEffort: PlanReasoningEffortValue;
  modelReasoningSummary: string;
  modelVerbosity: VerbosityValue;
  modelContextWindow: string;
  modelAutoCompactTokenLimit: string;
  modelAutoCompactTokenLimitScope: ModelAutoCompactTokenLimitScopeValue;
  modelSupportsReasoningSummaries: boolean;
  modelCatalogJson: string;
  modelInstructionsFile: string;
  developerInstructions: string;
  compactPrompt: string;
  toolOutputTokenLimit: string;
  defaultPermissions: string;
  personality: PersonalityValue;
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
  experimentalCompactPromptFile: string;
  backgroundTerminalMaxTimeout: string;
  logDir: string;
  sqliteHome: string;
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
  shellTool: FeatureToggleValue;
  apps: FeatureToggleValue;
  hooks: FeatureToggleValue;
  unifiedExec: FeatureToggleValue;
  shellSnapshot: FeatureToggleValue;
  multiAgent: FeatureToggleValue;
  goals: FeatureToggleValue;
  remotePlugin: FeatureToggleValue;
  personalityFeature: FeatureToggleValue;
  fastMode: FeatureToggleValue;
  enableRequestCompression: FeatureToggleValue;
  skillMcpDependencyInstall: FeatureToggleValue;
  preventIdleSleep: FeatureToggleValue;
  memories: FeatureToggleValue;
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

export interface AgentsSettings {
  maxThreads: string;
  maxDepth: string;
  jobMaxRuntimeSeconds: string;
  interruptMessage: FeatureToggleValue;
}

export interface ModelProviderDraft {
  id: string;
  name: string;
  baseUrl: string;
  wireApi: string;
  queryParams: KeyValueItem[];
  envKey: string;
  envKeyInstructions: string;
  requiresOpenaiAuth: boolean;
  requestMaxRetries: string;
  streamMaxRetries: string;
  streamIdleTimeoutMs: string;
  supportsWebsockets: boolean;
  experimentalBearerToken: string;
  httpHeaders: KeyValueItem[];
  envHttpHeaders: KeyValueItem[];
  authCommand: string;
  authArgs: string[];
  authCwd: string;
  authTimeoutMs: string;
  authRefreshIntervalMs: string;
  awsProfile: string;
  awsRegion: string;
}

export interface McpServerDraft {
  id: string;
  transport: TransportValue;
  enabled: boolean;
  required: boolean;
  command: string;
  args: string[];
  env: KeyValueItem[];
  envVars: string[];
  cwd: string;
  experimentalEnvironment: string;
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
  auth: McpAuthValue;
  defaultToolsApprovalMode: ToolApprovalModeValue;
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
  modelVerbosity: VerbosityValue;
  personality: PersonalityValue;
  modelCatalogJson: string;
  modelInstructionsFile: string;
  experimentalCompactPromptFile: string;
  toolsViewImage: boolean;
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
  agents: AgentsSettings;
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
