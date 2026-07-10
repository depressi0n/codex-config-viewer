export const SECTION_ORDER = [
  "general",
  "history",
  "features",
  "sandbox",
  "shell",
  "tools",
  "agents",
  "modelProviders",
  "mcpServers",
  "profiles",
  "projects",
  "advanced",
] as const;

export const REASONING_OPTIONS = ["minimal", "low", "medium", "high", "xhigh"] as const;

export const PLAN_REASONING_OPTIONS = ["none", ...REASONING_OPTIONS] as const;

export const VERBOSITY_OPTIONS = ["low", "medium", "high"] as const;

export const PERSONALITY_OPTIONS = ["none", "friendly", "pragmatic"] as const;

export const APPROVALS_REVIEWER_OPTIONS = ["user", "auto_review"] as const;

export const APPROVAL_POLICY_OPTIONS = [
  "untrusted",
  "on-failure",
  "on-request",
  "never",
  "granular",
] as const;

export const SANDBOX_MODE_OPTIONS = [
  "read-only",
  "workspace-write",
  "danger-full-access",
] as const;

export const HISTORY_PERSISTENCE_OPTIONS = ["save-all", "none"] as const;

export const SHELL_INHERITANCE_OPTIONS = ["all", "core", "none"] as const;

export const WEB_SEARCH_OPTIONS = ["disabled", "cached", "indexed", "live"] as const;

export const MODEL_AUTO_COMPACT_TOKEN_LIMIT_SCOPE_OPTIONS = [
  "total",
  "body_after_prefix",
] as const;

export const CREDENTIAL_STORE_OPTIONS = ["file", "keyring", "auto"] as const;

export const LOGIN_METHOD_OPTIONS = ["chatgpt", "api"] as const;

export const FILE_OPENER_OPTIONS = [
  "vscode",
  "vscode-insiders",
  "windsurf",
  "cursor",
  "none",
] as const;

export const SERVICE_TIER_OPTIONS = ["fast", "flex"] as const;

export const TRANSPORT_OPTIONS = [
  { value: "stdio", label: "STDIO" },
  { value: "http", label: "HTTP" },
] as const;

export const MCP_AUTH_OPTIONS = ["oauth", "chatgpt"] as const;

export const TOOL_APPROVAL_MODE_OPTIONS = [
  "auto",
  "prompt",
  "writes",
  "approve",
] as const;

export const TRUST_LEVEL_OPTIONS = ["trusted", "untrusted"] as const;
