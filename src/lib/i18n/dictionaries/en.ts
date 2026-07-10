import type { DictionaryShape } from "@/lib/i18n/types";

export const enDictionary: DictionaryShape = {
  app: {
    title: "Codex Config Viewer",
    subtitle:
      "A bilingual visual editor for the official Codex config docs, with TOML import, preview, and export.",
    badge: "Reviewed against official docs on 2026-07-10",
    sampleLabel: "Official sample snapshot",
    recommended: {
      label: "Recommended starter preset",
      description:
        "An app-maintained preset built on the 2026-07-10 official sample for day-to-day coding: workspace-write sandbox, on-request approvals, core shell inheritance, and live web search.",
      note: "This preset is opinionated and is not part of the official sample.",
    },
    actions: {
      importFile: "Import config.toml",
      applyRecommended: "Apply recommended preset",
      resetSample: "Reset to sample",
      copyToml: "Copy TOML",
      downloadToml: "Download config.toml",
      deployVercel: "Deploy with Vercel",
      addItem: "Add",
      remove: "Remove",
      generating: "Generating preview…",
      idle: "Preview is up to date",
    },
    language: {
      label: "Language",
      en: "English",
      zhCN: "简体中文",
      switchTo: "Switch language",
    },
    reference: {
      label: "Reference",
      sampleSource: "Official sample config",
      configReferenceSource: "Config reference",
      subagentsSource: "Subagents",
      declaredAt: "Declared date",
    },
    deploy: {
      label: "One-click deploy",
      description:
        "Launch the Vercel import flow from this public GitHub repository. No extra environment variables are required for the current app.",
    },
    preview: {
      title: "Generated TOML",
      description: "Preview updates from the parse/generate API and matches download output.",
      empty: "Generated TOML preview will appear here.",
      warnings: "Warnings",
      includeCommentsLabel: "Include explanatory comments",
      includeCommentsHint:
        "Adds human-readable descriptions above supported config items in preview, copy, and download output.",
    },
    validation: {
      title: "Validation",
      description:
        "Checks the current draft for missing references, duplicate identifiers, and invalid values.",
      errors: "Errors",
      warnings: "Validation warnings",
      path: "Path",
      empty: "No validation issues detected.",
      fieldRequired: "{{field}} is required.",
      fieldRequiredWhen: "{{field}} is required when {{condition}}.",
      duplicateValue: "{{field}} must be unique. Duplicate value: {{value}}.",
      missingReference: "{{field}} references a missing {{target}}: {{value}}.",
      nonNegativeNumber: "{{field}} must be 0 or greater.",
      positiveNumber: "{{field}} must be greater than 0.",
      duplicateKey: "{{field}} contains duplicate key: {{value}}.",
      missingDefaultModel:
        "Set {{field}} or {{alternateField}} so Codex has a default configuration.",
      profileTarget: "profile",
      rowHasContent: "the row already contains other values",
      fieldIsSet: "{{field}} is set",
      transportIs: "Transport is {{value}}",
    },
    advanced: {
      title: "Advanced unsupported TOML",
      description:
        "Paste only the unsupported fragment here. Visual form fields always override conflicts in generated output.",
      placeholder: "# Unsupported TOML fragments stay here\n",
    },
    import: {
      success: "Imported config.toml and mapped supported fields.",
      invalid: "Import failed. Fix the TOML error and try again.",
      unsupported:
        "Unsupported fields were preserved in the advanced TOML editor so nothing is lost.",
    },
    feedback: {
      copied: "Copied generated TOML to the clipboard.",
      downloaded: "Downloaded config.toml.",
      recommendedApplied: "Applied the app's recommended starter preset.",
      generateFailed: "Preview generation failed.",
      idle: "Ready",
    },
    emptyStates: {
      modelProviders: "No model providers yet.",
      mcpServers: "No MCP servers yet.",
      profiles: "No profiles yet.",
      projects: "No project trust rules yet.",
      list: "No values yet.",
      pairs: "No key/value pairs yet.",
    },
    common: {
      blankOption: "Not set",
      enabled: "Enabled",
      required: "Required",
      transport: "Transport",
      key: "Key",
      value: "Value",
      path: "Path",
      id: "ID",
    },
  },
  sections: {
    general: {
      title: "General",
      description: "Core model, approval, auth, and UI behavior.",
    },
    history: {
      title: "History",
      description: "Compaction and persistence controls.",
    },
    features: {
      title: "Features",
      description:
        "Current [features] overrides from the config reference. Leave blank to use Codex defaults.",
    },
    sandbox: {
      title: "Sandbox",
      description: "Workspace-write settings used when sandbox mode allows them.",
    },
    shell: {
      title: "Shell Environment",
      description: "Environment inheritance and include/exclude lists.",
    },
    tools: {
      title: "Tools",
      description: "Tool-related behavior from the sample schema.",
    },
    agents: {
      title: "Agents",
      description: "Subagent concurrency and runtime limits under [agents].",
    },
    modelProviders: {
      title: "Model Providers",
      description: "Provider presets under [model_providers].",
    },
    mcpServers: {
      title: "MCP Servers",
      description: "Configured MCP transports under [mcp_servers].",
    },
    profiles: {
      title: "Profiles",
      description: "Saved profile presets under [profiles].",
    },
    projects: {
      title: "Projects",
      description: "Per-project trust configuration under [projects].",
    },
    advanced: {
      title: "Advanced",
      description: "Preserved unsupported TOML fragment.",
    },
  },
  fields: {
    model: ["Model", "Default session model."],
    reviewModel: ["Review model", "Optional override used by /review."],
    modelProvider: ["Model provider", "Provider ID selected from [model_providers]."],
    approvalPolicy: ["Approval policy", "When Codex requests approval for tool actions."],
    approvalsReviewer: ["Approvals reviewer", "Who reviews eligible approval prompts."],
    defaultPermissions: ["Default permissions", "Named permissions profile to apply by default."],
    personality: ["Personality", "Communication style for supported models."],
    allowLoginShell: [
      "Allow login shell",
      "Allow login-shell semantics for commands when needed.",
    ],
    sandboxMode: ["Sandbox mode", "Filesystem and network access policy."],
    serviceTier: ["Service tier", "Preferred service tier when supported."],
    webSearch: ["Web search", "Use disabled, cached, indexed, or live web search results."],
    activeProfile: ["Profile", "Name of the applied profile."],
    modelReasoningEffort: ["Reasoning effort", "Reasoning effort for normal mode."],
    planModeReasoningEffort: [
      "Plan mode reasoning",
      "Optional reasoning override used in plan mode.",
    ],
    modelReasoningSummary: [
      "Reasoning summary mode",
      "Optional summary mode for reasoning output.",
    ],
    modelVerbosity: ["Model verbosity", "Text verbosity override for GPT-5 family models."],
    modelContextWindow: ["Context window", "Manual context window tokens for the model."],
    modelAutoCompactTokenLimit: [
      "Auto compact token limit",
      "Token threshold that triggers automatic history compaction.",
    ],
    modelAutoCompactTokenLimitScope: [
      "Auto compact limit scope",
      "Count the full context or only content after the carried compaction prefix.",
    ],
    modelSupportsReasoningSummaries: [
      "Supports reasoning summaries",
      "Force reasoning summary metadata for the current model.",
    ],
    modelCatalogJson: ["Model catalog JSON", "Startup-only model catalog JSON path."],
    modelInstructionsFile: [
      "Model instructions file",
      "Path to a file replacing built-in model instructions.",
    ],
    developerInstructions: [
      "Developer instructions",
      "Additional developer instructions injected before AGENTS.md.",
    ],
    compactPrompt: [
      "Compact prompt",
      "Inline override for the history compaction prompt.",
    ],
    toolOutputTokenLimit: ["Tool output token limit", "Token budget stored per tool output."],
    ossProvider: ["OSS provider", "Default provider for --oss sessions."],
    cliAuthCredentialsStore: [
      "CLI auth credential store",
      "Where CLI login credentials should be stored.",
    ],
    chatgptBaseUrl: ["ChatGPT base URL", "Base URL for the ChatGPT auth flow."],
    openaiBaseUrl: ["OpenAI base URL", "Optional override for API traffic."],
    forcedChatgptWorkspaceId: [
      "Forced ChatGPT workspace",
      "Optional workspace restriction for ChatGPT login.",
    ],
    forcedLoginMethod: [
      "Forced login method",
      "Force Codex to use ChatGPT or API login.",
    ],
    mcpOauthCredentialsStore: [
      "MCP OAuth credential store",
      "Preferred store for MCP OAuth credentials.",
    ],
    mcpOauthCallbackPort: [
      "MCP OAuth callback port",
      "Local port used for MCP OAuth callback redirects.",
    ],
    mcpOauthCallbackUrl: [
      "MCP OAuth callback URL",
      "Optional full callback URL override for MCP OAuth.",
    ],
    projectDocMaxBytes: [
      "Project doc max bytes",
      "Maximum size of project documentation loaded into context.",
    ],
    projectDocFallbackFilenames: [
      "Project doc fallback filenames",
      "Fallback filenames to check when no primary project doc is found.",
    ],
    projectRootMarkers: [
      "Project root markers",
      "Extra filenames or directories used to detect project roots.",
    ],
    notify: ["Notify command", "Command array run after Codex finishes."],
    experimentalCompactPromptFile: [
      "Compact prompt file",
      "Path to a compact prompt override file.",
    ],
    backgroundTerminalMaxTimeout: [
      "Terminal max timeout (ms)",
      "Maximum empty background terminal polling window.",
    ],
    logDir: ["Log dir", "Directory where Codex writes logs."],
    sqliteHome: ["SQLite home", "Directory for SQLite-backed runtime state."],
    fileOpener: ["File opener", "URI scheme used for clickable citations."],
    hideAgentReasoning: ["Hide agent reasoning", "Suppress reasoning events from output."],
    showRawAgentReasoning: [
      "Show raw reasoning",
      "Display raw reasoning content when available.",
    ],
    disablePasteBurst: [
      "Disable paste burst",
      "Turn off burst-paste detection in the TUI.",
    ],
    windowsWslSetupAcknowledged: [
      "WSL setup acknowledged",
      "Track that the Windows WSL setup notice has been acknowledged.",
    ],
    checkForUpdateOnStartup: [
      "Check for updates on startup",
      "Allow Codex to check for app updates when it starts.",
    ],
    suppressUnstableFeaturesWarning: [
      "Suppress unstable feature warning",
      "Hide the warning shown for unstable feature flags.",
    ],
    historyPersistence: ["Persistence", "save-all or none."],
    historyMaxBytes: ["Max history bytes", "Trim oldest history entries after this size."],
    shellTool: ["Shell tool", "Enable the default shell tool for running commands."],
    apps: ["Apps/connectors", "Enable ChatGPT Apps and connector support."],
    hooks: ["Hooks", "Enable lifecycle hooks from hooks.json or inline [hooks]."],
    unifiedExec: ["Unified exec", "Use the PTY-backed unified exec tool."],
    shellSnapshot: [
      "Shell snapshot",
      "Cache shell environment snapshots to speed up repeated commands.",
    ],
    multiAgent: [
      "Multi-agent",
      "Enable multi-agent collaboration tools such as spawn and resume.",
    ],
    goals: ["Goals", "Enable persisted goals and automatic continuation."],
    remotePlugin: ["Remote plugin", "Enable the remote plugin catalog."],
    personalityFeature: [
      "Personality controls",
      "Enable personality selection controls in supported Codex surfaces.",
    ],
    fastMode: [
      "Fast mode",
      "Enable fast-tier model selection when advertised by the model catalog.",
    ],
    enableRequestCompression: [
      "Request compression",
      "Compress streaming request bodies with zstd when supported.",
    ],
    skillMcpDependencyInstall: [
      "Skill MCP dependency install",
      "Allow prompting to install missing MCP dependencies required by skills.",
    ],
    preventIdleSleep: [
      "Prevent idle sleep",
      "Keep the machine awake while a turn is actively running.",
    ],
    memories: ["Memories", "Enable Codex memories."],
    writableRoots: ["Writable roots", "Extra writable roots beyond the current workspace."],
    networkAccess: ["Network access", "Allow outbound network access in workspace-write mode."],
    excludeTmpdirEnvVar: [
      "Exclude TMPDIR env var",
      "Do not pass TMPDIR through in workspace-write mode.",
    ],
    excludeSlashTmp: [
      "Exclude /tmp",
      "Avoid mapping /tmp into the writable sandbox roots.",
    ],
    shellInherit: ["Inherit", "Which environment baseline to inherit."],
    ignoreDefaultExcludes: [
      "Ignore default excludes",
      "Disable the built-in shell environment exclusion list.",
    ],
    shellExclude: ["Exclude", "Environment variables to exclude."],
    shellSet: ["Set", "Environment variables that should be set explicitly."],
    shellIncludeOnly: ["Include only", "Explicit allow-list of environment variables."],
    experimentalUseProfile: [
      "Experimental use profile",
      "Let Codex source your shell profile before command execution.",
    ],
    viewImage: ["View image", "Enable image-view tooling when supported."],
    agentsMaxThreads: [
      "Max threads",
      "Maximum concurrent subagent threads. Leave blank to use Codex defaults.",
    ],
    agentsMaxDepth: [
      "Max depth",
      "Maximum subagent nesting depth. Root sessions start at depth 0.",
    ],
    agentsJobMaxRuntimeSeconds: [
      "Job max runtime (sec)",
      "Maximum runtime per subagent job in seconds.",
    ],
    agentsInterruptMessage: [
      "Interrupt message",
      "Record a model-visible message when an agent turn is interrupted.",
    ],
    providerId: ["Provider id", "Table key inside [model_providers]."],
    providerName: ["Provider name", "Friendly label shown in UI or docs."],
    baseUrl: ["Base URL", "Base URL for the provider or MCP endpoint."],
    wireApi: ["Wire API", "Wire protocol, such as responses."],
    queryParams: ["Query params", "Static query parameters sent with requests."],
    envKey: ["Env key", "Environment variable containing the provider token."],
    envKeyInstructions: [
      "Env key instructions",
      "Help text shown when the environment variable is missing.",
    ],
    requiresOpenaiAuth: ["Requires OpenAI auth", "Use OpenAI auth for this provider."],
    requestMaxRetries: ["Request max retries", "Retry count for non-streaming requests."],
    streamMaxRetries: ["Stream max retries", "Retry count for streaming requests."],
    streamIdleTimeoutMs: ["Stream idle timeout (ms)", "Timeout for idle streams."],
    supportsWebsockets: ["Supports websockets", "Whether the provider supports websockets."],
    experimentalBearerToken: [
      "Experimental bearer token",
      "Direct bearer token used for local development only.",
    ],
    httpHeaders: ["HTTP headers", "Static headers attached to requests."],
    envHttpHeaders: [
      "Env HTTP headers",
      "Headers populated from environment variables.",
    ],
    authCommand: ["Auth command", "Command that prints a bearer token."],
    authArgs: ["Auth args", "Arguments passed to the auth command."],
    authCwd: ["Auth cwd", "Working directory for the auth command."],
    authTimeoutMs: ["Auth timeout (ms)", "Maximum auth command runtime."],
    authRefreshIntervalMs: [
      "Auth refresh interval (ms)",
      "How often to refresh the command-backed token.",
    ],
    awsProfile: ["AWS profile", "AWS profile for provider SigV4 auth."],
    awsRegion: ["AWS region", "AWS region for provider SigV4 auth."],
    mcpId: ["Server id", "Table key inside [mcp_servers]."],
    command: ["Command", "Server executable for STDIO transport."],
    args: ["Args", "Command arguments."],
    env: ["Environment", "Environment variables passed to the server process."],
    envVars: ["Inherited env vars", "Parent environment variables to forward."],
    cwd: ["Working directory", "Working directory override for the process."],
    experimentalEnvironment: [
      "Experimental environment",
      "Experimental MCP placement, such as remote.",
    ],
    url: ["URL", "Remote MCP endpoint URL."],
    bearerTokenEnvVar: [
      "Bearer token env var",
      "Environment variable used for Authorization: Bearer.",
    ],
    mcpEnabled: ["Enabled", "Whether this MCP server should be enabled."],
    mcpRequired: ["Required", "Whether Codex should treat this MCP server as required."],
    startupTimeoutSec: ["Startup timeout (sec)", "Startup timeout in seconds."],
    toolTimeoutSec: ["Tool timeout (sec)", "Default MCP tool timeout in seconds."],
    enabledTools: ["Enabled tools", "Allow-list of tools."],
    disabledTools: ["Disabled tools", "Deny-list applied after the allow-list."],
    scopes: ["Scopes", "OAuth scopes requested for the server."],
    oauthResource: ["OAuth resource", "Optional OAuth resource identifier."],
    mcpAuth: ["HTTP auth", "Authentication fallback for an MCP HTTP server."],
    defaultToolsApprovalMode: [
      "Default tool approval mode",
      "Default approval behavior for this MCP server's tools.",
    ],
    profileId: ["Profile id", "Table key inside [profiles]."],
    projectPath: ["Project path", "Absolute project path used as the TOML table key."],
    trustLevel: ["Trust level", "Whether the project is trusted or untrusted."],
  },
  helpers: {
    sandboxHidden:
      "This section only applies when sandbox mode is set to workspace-write, but you can still preconfigure it.",
    mcpHttpMode:
      "HTTP mode models the sample's remote MCP transport using url and token-related fields.",
  },
  options: {
    approvalPolicy: {
      untrusted: "Untrusted",
      "on-failure": "On failure (deprecated)",
      "on-request": "On request",
      never: "Never",
      granular: "Granular",
    },
    approvalsReviewer: {
      user: "User",
      auto_review: "Auto review",
    },
    personality: {
      none: "None",
      friendly: "Friendly",
      pragmatic: "Pragmatic",
    },
    verbosity: {
      low: "Low",
      medium: "Medium",
      high: "High",
    },
    sandboxMode: {
      "read-only": "Read only",
      "workspace-write": "Workspace write",
      "danger-full-access": "Danger full access",
    },
    webSearch: {
      disabled: "Disabled",
      cached: "Cached",
      indexed: "Indexed",
      live: "Live",
    },
    modelAutoCompactTokenLimitScope: {
      total: "Total context",
      body_after_prefix: "Body after prefix",
    },
    mcpAuth: {
      oauth: "OAuth",
      chatgpt: "ChatGPT session",
    },
    toolApprovalMode: {
      auto: "Auto",
      prompt: "Prompt",
      writes: "Writes",
      approve: "Approve",
    },
    reasoning: {
      none: "None",
      minimal: "Minimal",
      low: "Low",
      medium: "Medium",
      high: "High",
      xhigh: "XHigh",
    },
    historyPersistence: {
      "save-all": "Save all",
      none: "None",
    },
    inherit: {
      all: "All",
      core: "Core",
      none: "None",
    },
    credentialStore: {
      file: "File",
      keyring: "Keyring",
      auto: "Auto",
    },
    loginMethod: {
      chatgpt: "ChatGPT",
      api: "API",
    },
    fileOpener: {
      vscode: "VS Code",
      "vscode-insiders": "VS Code Insiders",
      windsurf: "Windsurf",
      cursor: "Cursor",
      none: "None",
    },
    serviceTier: {
      fast: "Fast",
      flex: "Flex",
    },
    transport: {
      stdio: "STDIO",
      http: "HTTP",
    },
    trustLevel: {
      trusted: "Trusted",
      untrusted: "Untrusted",
    },
    featureToggle: {
      enabled: "Enabled",
      disabled: "Disabled",
    },
  },
};
