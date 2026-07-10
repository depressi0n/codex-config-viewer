import { parse, stringify } from "smol-toml";

import {
  createEmptyDraft,
  createEmptyMcpServer,
  createEmptyModelProvider,
  createEmptyProfile,
  createSampleDraft,
  CONFIG_REFERENCE_URL,
  SAMPLE_REFERENCE_URL,
  SAMPLE_REVIEWED_ON,
  SUBAGENTS_REFERENCE_URL,
  SAMPLE_UNSUPPORTED_TOML,
} from "@/lib/config/defaults";
import { addConfigComments } from "@/lib/config/comments";
import {
  FEATURE_TOGGLE_DEFINITIONS,
  LEGACY_FEATURE_KEYS,
  parseFeatureToggle,
  serializeFeatureToggle,
} from "@/lib/config/features";
import { validateConfigDraft } from "@/lib/config/validation";
import {
  compactStringList,
  countFragmentNodes,
  deepMerge,
  formatTomlError,
  isPlainObject,
  keyValueItemsToRecord,
  parseBoolean,
  parseNumberLikeString,
  parseString,
  parseStringArray,
  pruneEmptyObjects,
  recordToKeyValueItems,
} from "@/lib/config/helpers";
import type {
  ConfigDraft,
  ConfigParseErrorShape,
  ConfigParseWarning,
  GenerateConfigResponse,
  GenerateConfigOptions,
  KeyValueItem,
  McpServerDraft,
  ModelProviderDraft,
  ParseConfigResponse,
  ProfileDraft,
  ProjectDraft,
  TomlObject,
} from "@/lib/config/types";

function pushWarning(warnings: ConfigParseWarning[], message: string) {
  warnings.push({ message });
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function maybeAssignString(target: TomlObject, key: string, value: string) {
  if (value.trim()) {
    target[key] = value.trim();
  }
}

function maybeAssignBoolean(target: TomlObject, key: string, value: boolean) {
  if (value) {
    target[key] = true;
  }
}

function maybeAssignFeatureToggle(
  target: TomlObject,
  key: string,
  value: ConfigDraft["features"][keyof ConfigDraft["features"]],
) {
  const serialized = serializeFeatureToggle(value);

  if (serialized !== undefined) {
    target[key] = serialized;
  }
}

function maybeAssignNumber(target: TomlObject, key: string, value: string) {
  const numeric = parseNumber(value);

  if (numeric !== undefined) {
    target[key] = numeric;
  }
}

function maybeAssignStringList(target: TomlObject, key: string, value: string[]) {
  const compacted = compactStringList(value);

  if (compacted.length > 0) {
    target[key] = compacted;
  }
}

function maybeAssignStringRecord(target: TomlObject, key: string, value: KeyValueItem[]) {
  const record = keyValueItemsToRecord(value);

  if (record) {
    target[key] = record;
  }
}

function serializeGranularApproval(draft: ConfigDraft["general"]["approvalPolicyGranular"]) {
  return {
    sandbox_approval: draft.sandboxApproval,
    rules: draft.rules,
    mcp_elicitations: draft.mcpElicitations,
    request_permissions: draft.requestPermissions,
    skill_approval: draft.skillApproval,
  };
}

function serializeProvider(provider: ModelProviderDraft): TomlObject {
  const next: TomlObject = {};

  maybeAssignString(next, "name", provider.name);
  maybeAssignString(next, "base_url", provider.baseUrl);
  maybeAssignString(next, "wire_api", provider.wireApi);
  maybeAssignStringRecord(next, "query_params", provider.queryParams);
  maybeAssignString(next, "env_key", provider.envKey);
  maybeAssignString(next, "env_key_instructions", provider.envKeyInstructions);
  maybeAssignBoolean(next, "requires_openai_auth", provider.requiresOpenaiAuth);
  maybeAssignNumber(next, "request_max_retries", provider.requestMaxRetries);
  maybeAssignNumber(next, "stream_max_retries", provider.streamMaxRetries);
  maybeAssignNumber(next, "stream_idle_timeout_ms", provider.streamIdleTimeoutMs);
  maybeAssignBoolean(next, "supports_websockets", provider.supportsWebsockets);
  maybeAssignString(next, "experimental_bearer_token", provider.experimentalBearerToken);
  maybeAssignStringRecord(next, "http_headers", provider.httpHeaders);
  maybeAssignStringRecord(next, "env_http_headers", provider.envHttpHeaders);

  const auth: TomlObject = {};
  maybeAssignString(auth, "command", provider.authCommand);
  maybeAssignStringList(auth, "args", provider.authArgs);
  maybeAssignString(auth, "cwd", provider.authCwd);
  maybeAssignNumber(auth, "timeout_ms", provider.authTimeoutMs);
  maybeAssignNumber(auth, "refresh_interval_ms", provider.authRefreshIntervalMs);
  if (Object.keys(auth).length > 0) {
    next.auth = auth;
  }

  const aws: TomlObject = {};
  maybeAssignString(aws, "profile", provider.awsProfile);
  maybeAssignString(aws, "region", provider.awsRegion);
  if (Object.keys(aws).length > 0) {
    next.aws = aws;
  }

  return next;
}

function serializeMcpServer(server: McpServerDraft): TomlObject {
  const next: TomlObject = {};

  if (!server.enabled) {
    next.enabled = false;
  }

  if (server.required) {
    next.required = true;
  }

  if (server.transport === "stdio") {
    maybeAssignString(next, "command", server.command);
    maybeAssignStringList(next, "args", server.args);
    maybeAssignStringRecord(next, "env", server.env);
    maybeAssignStringList(next, "env_vars", server.envVars);
    maybeAssignString(next, "cwd", server.cwd);
    maybeAssignString(next, "experimental_environment", server.experimentalEnvironment);
  } else {
    maybeAssignString(next, "url", server.url);
    maybeAssignString(next, "bearer_token_env_var", server.bearerTokenEnvVar);
  }

  maybeAssignStringRecord(next, "http_headers", server.httpHeaders);
  maybeAssignStringRecord(next, "env_http_headers", server.envHttpHeaders);
  maybeAssignNumber(next, "startup_timeout_sec", server.startupTimeoutSec);
  maybeAssignNumber(next, "tool_timeout_sec", server.toolTimeoutSec);
  maybeAssignStringList(next, "enabled_tools", server.enabledTools);
  maybeAssignStringList(next, "disabled_tools", server.disabledTools);
  maybeAssignStringList(next, "scopes", server.scopes);
  maybeAssignString(next, "oauth_resource", server.oauthResource);
  maybeAssignString(next, "auth", server.auth);
  maybeAssignString(
    next,
    "default_tools_approval_mode",
    server.defaultToolsApprovalMode,
  );

  return next;
}

function serializeProfile(profile: ProfileDraft): TomlObject {
  const next: TomlObject = {};

  maybeAssignString(next, "model", profile.model);
  maybeAssignString(next, "model_provider", profile.modelProvider);
  maybeAssignString(next, "approval_policy", profile.approvalPolicy);
  maybeAssignString(next, "sandbox_mode", profile.sandboxMode);
  maybeAssignString(next, "service_tier", profile.serviceTier);
  maybeAssignString(next, "oss_provider", profile.ossProvider);
  maybeAssignString(next, "model_reasoning_effort", profile.modelReasoningEffort);
  maybeAssignString(next, "plan_mode_reasoning_effort", profile.planModeReasoningEffort);
  maybeAssignString(next, "model_reasoning_summary", profile.modelReasoningSummary);
  maybeAssignString(next, "model_verbosity", profile.modelVerbosity);
  maybeAssignString(next, "personality", profile.personality);
  maybeAssignString(next, "model_catalog_json", profile.modelCatalogJson);
  maybeAssignString(next, "model_instructions_file", profile.modelInstructionsFile);
  maybeAssignString(
    next,
    "experimental_compact_prompt_file",
    profile.experimentalCompactPromptFile,
  );
  maybeAssignBoolean(next, "tools_view_image", profile.toolsViewImage);

  return next;
}

export function buildSupportedTomlObject(
  draft: ConfigDraft,
  warnings: ConfigParseWarning[] = [],
): TomlObject {
  const raw: TomlObject = {};
  const sample = createSampleDraft();

  maybeAssignString(raw, "model", draft.general.model);
  maybeAssignString(raw, "review_model", draft.general.reviewModel);
  maybeAssignString(raw, "model_provider", draft.general.modelProvider);
  if (draft.general.approvalPolicy === "granular") {
    raw.approval_policy = {
      granular: serializeGranularApproval(draft.general.approvalPolicyGranular),
    };
  } else {
    maybeAssignString(raw, "approval_policy", draft.general.approvalPolicy);
  }
  maybeAssignString(raw, "approvals_reviewer", draft.general.approvalsReviewer);
  maybeAssignBoolean(raw, "allow_login_shell", draft.general.allowLoginShell);
  maybeAssignString(raw, "sandbox_mode", draft.general.sandboxMode);
  maybeAssignString(raw, "service_tier", draft.general.serviceTier);
  maybeAssignString(raw, "web_search", draft.tools.webSearch || draft.general.webSearch);
  maybeAssignString(raw, "profile", draft.general.activeProfile);
  maybeAssignString(raw, "model_reasoning_effort", draft.general.modelReasoningEffort);
  maybeAssignString(
    raw,
    "plan_mode_reasoning_effort",
    draft.general.planModeReasoningEffort,
  );
  maybeAssignString(raw, "model_reasoning_summary", draft.general.modelReasoningSummary);
  maybeAssignString(raw, "model_verbosity", draft.general.modelVerbosity);
  maybeAssignNumber(raw, "model_context_window", draft.general.modelContextWindow);
  maybeAssignNumber(
    raw,
    "model_auto_compact_token_limit",
    draft.general.modelAutoCompactTokenLimit,
  );
  maybeAssignString(
    raw,
    "model_auto_compact_token_limit_scope",
    draft.general.modelAutoCompactTokenLimitScope,
  );
  maybeAssignBoolean(
    raw,
    "model_supports_reasoning_summaries",
    draft.general.modelSupportsReasoningSummaries,
  );
  maybeAssignString(raw, "model_catalog_json", draft.general.modelCatalogJson);
  maybeAssignString(raw, "model_instructions_file", draft.general.modelInstructionsFile);
  maybeAssignString(raw, "developer_instructions", draft.general.developerInstructions);
  maybeAssignString(raw, "compact_prompt", draft.general.compactPrompt);
  maybeAssignNumber(raw, "tool_output_token_limit", draft.general.toolOutputTokenLimit);
  maybeAssignString(raw, "default_permissions", draft.general.defaultPermissions);
  maybeAssignString(raw, "personality", draft.general.personality);
  maybeAssignString(raw, "oss_provider", draft.general.ossProvider);
  maybeAssignString(
    raw,
    "cli_auth_credentials_store",
    draft.general.cliAuthCredentialsStore,
  );
  maybeAssignString(raw, "chatgpt_base_url", draft.general.chatgptBaseUrl);
  maybeAssignString(raw, "openai_base_url", draft.general.openaiBaseUrl);
  maybeAssignString(
    raw,
    "forced_chatgpt_workspace_id",
    draft.general.forcedChatgptWorkspaceId,
  );
  maybeAssignString(raw, "forced_login_method", draft.general.forcedLoginMethod);
  maybeAssignString(
    raw,
    "mcp_oauth_credentials_store",
    draft.general.mcpOauthCredentialsStore,
  );
  maybeAssignNumber(raw, "mcp_oauth_callback_port", draft.general.mcpOauthCallbackPort);
  maybeAssignString(raw, "mcp_oauth_callback_url", draft.general.mcpOauthCallbackUrl);
  maybeAssignNumber(raw, "project_doc_max_bytes", draft.general.projectDocMaxBytes);
  maybeAssignStringList(
    raw,
    "project_doc_fallback_filenames",
    draft.general.projectDocFallbackFilenames,
  );
  maybeAssignStringList(raw, "project_root_markers", draft.general.projectRootMarkers);
  maybeAssignStringList(raw, "notify", draft.general.notify);
  maybeAssignString(
    raw,
    "experimental_compact_prompt_file",
    draft.general.experimentalCompactPromptFile,
  );
  maybeAssignNumber(
    raw,
    "background_terminal_max_timeout",
    draft.general.backgroundTerminalMaxTimeout,
  );
  maybeAssignString(raw, "log_dir", draft.general.logDir);
  maybeAssignString(raw, "sqlite_home", draft.general.sqliteHome);
  maybeAssignString(raw, "file_opener", draft.general.fileOpener);
  maybeAssignBoolean(raw, "hide_agent_reasoning", draft.general.hideAgentReasoning);
  maybeAssignBoolean(raw, "show_raw_agent_reasoning", draft.general.showRawAgentReasoning);
  maybeAssignBoolean(raw, "disable_paste_burst", draft.general.disablePasteBurst);
  maybeAssignBoolean(
    raw,
    "windows_wsl_setup_acknowledged",
    draft.general.windowsWslSetupAcknowledged,
  );
  maybeAssignBoolean(
    raw,
    "check_for_update_on_startup",
    draft.general.checkForUpdateOnStartup,
  );
  maybeAssignBoolean(
    raw,
    "suppress_unstable_features_warning",
    draft.general.suppressUnstableFeaturesWarning,
  );

  const history: TomlObject = {};
  maybeAssignString(history, "persistence", draft.history.persistence);
  maybeAssignNumber(history, "max_bytes", draft.history.maxBytes);
  if (Object.keys(history).length > 0) {
    raw.history = history;
  }

  const features: TomlObject = {};
  for (const { field, tomlKey } of FEATURE_TOGGLE_DEFINITIONS) {
    maybeAssignFeatureToggle(features, tomlKey, draft.features[field]);
  }
  if (Object.keys(features).length > 0) {
    raw.features = features;
  }

  const sandboxWorkspaceWrite: TomlObject = {};
  maybeAssignStringList(
    sandboxWorkspaceWrite,
    "writable_roots",
    draft.sandboxWorkspaceWrite.writableRoots,
  );
  maybeAssignBoolean(
    sandboxWorkspaceWrite,
    "network_access",
    draft.sandboxWorkspaceWrite.networkAccess,
  );
  maybeAssignBoolean(
    sandboxWorkspaceWrite,
    "exclude_tmpdir_env_var",
    draft.sandboxWorkspaceWrite.excludeTmpdirEnvVar,
  );
  maybeAssignBoolean(
    sandboxWorkspaceWrite,
    "exclude_slash_tmp",
    draft.sandboxWorkspaceWrite.excludeSlashTmp,
  );
  if (Object.keys(sandboxWorkspaceWrite).length > 0) {
    raw.sandbox_workspace_write = sandboxWorkspaceWrite;
  }

  const shellEnvironmentPolicy: TomlObject = {};
  maybeAssignString(shellEnvironmentPolicy, "inherit", draft.shellEnvironmentPolicy.inherit);
  maybeAssignBoolean(
    shellEnvironmentPolicy,
    "ignore_default_excludes",
    draft.shellEnvironmentPolicy.ignoreDefaultExcludes,
  );
  maybeAssignStringList(shellEnvironmentPolicy, "exclude", draft.shellEnvironmentPolicy.exclude);
  maybeAssignStringRecord(shellEnvironmentPolicy, "set", draft.shellEnvironmentPolicy.set);
  maybeAssignStringList(
    shellEnvironmentPolicy,
    "include_only",
    draft.shellEnvironmentPolicy.includeOnly,
  );
  maybeAssignBoolean(
    shellEnvironmentPolicy,
    "experimental_use_profile",
    draft.shellEnvironmentPolicy.experimentalUseProfile,
  );
  if (Object.keys(shellEnvironmentPolicy).length > 0) {
    raw.shell_environment_policy = shellEnvironmentPolicy;
  }

  const tools: TomlObject = {};
  maybeAssignBoolean(tools, "view_image", draft.tools.viewImage);
  if (Object.keys(tools).length > 0) {
    raw.tools = tools;
  }

  const agents: TomlObject = {};
  maybeAssignNumber(agents, "max_threads", draft.agents.maxThreads);
  maybeAssignNumber(agents, "max_depth", draft.agents.maxDepth);
  maybeAssignNumber(
    agents,
    "job_max_runtime_seconds",
    draft.agents.jobMaxRuntimeSeconds,
  );
  maybeAssignFeatureToggle(
    agents,
    "interrupt_message",
    draft.agents.interruptMessage,
  );
  if (Object.keys(agents).length > 0) {
    raw.agents = agents;
  }

  const modelProviders: TomlObject = {};
  for (const provider of draft.modelProviders) {
    const id = provider.id.trim();
    if (!id) {
      pushWarning(warnings, "Ignored a model provider row with an empty id.");
      continue;
    }

    modelProviders[id] = serializeProvider(provider);
  }
  if (Object.keys(modelProviders).length > 0) {
    raw.model_providers = modelProviders;
  }

  const mcpServers: TomlObject = {};
  for (const server of draft.mcpServers) {
    const id = server.id.trim();
    if (!id) {
      pushWarning(warnings, "Ignored an MCP server row with an empty id.");
      continue;
    }

    mcpServers[id] = serializeMcpServer(server);
  }
  if (Object.keys(mcpServers).length > 0) {
    raw.mcp_servers = mcpServers;
  }

  const profiles: TomlObject = {};
  for (const profile of draft.profiles) {
    const id = profile.id.trim();
    if (!id) {
      pushWarning(warnings, "Ignored a profile row with an empty id.");
      continue;
    }

    profiles[id] = serializeProfile(profile);
  }
  if (Object.keys(profiles).length > 0) {
    raw.profiles = profiles;
  }

  const projects: TomlObject = {};
  for (const project of draft.projects) {
    const path = project.path.trim();
    if (!path) {
      pushWarning(warnings, "Ignored a project trust row with an empty path.");
      continue;
    }

    if (project.trustLevel) {
      projects[path] = { trust_level: project.trustLevel };
    } else {
      pushWarning(warnings, `Ignored project "${path}" because trust level is empty.`);
    }
  }
  if (Object.keys(projects).length > 0) {
    raw.projects = projects;
  }

  if (!raw.web_search && sample.tools.webSearch && draft.general.webSearch) {
    raw.web_search = draft.general.webSearch;
  }

  return raw;
}

function parseModelProvider(id: string, value: unknown): ModelProviderDraft {
  const next = createEmptyModelProvider();
  const record = isPlainObject(value) ? value : {};
  const auth = isPlainObject(record.auth) ? record.auth : {};
  const aws = isPlainObject(record.aws) ? record.aws : {};

  return {
    ...next,
    id,
    name: parseString(record.name),
    baseUrl: parseString(record.base_url),
    wireApi: parseString(record.wire_api),
    queryParams: recordToKeyValueItems(record.query_params),
    envKey: parseString(record.env_key),
    envKeyInstructions: parseString(record.env_key_instructions),
    requiresOpenaiAuth: parseBoolean(record.requires_openai_auth),
    requestMaxRetries: parseNumberLikeString(record.request_max_retries),
    streamMaxRetries: parseNumberLikeString(record.stream_max_retries),
    streamIdleTimeoutMs: parseNumberLikeString(record.stream_idle_timeout_ms),
    supportsWebsockets: parseBoolean(record.supports_websockets),
    experimentalBearerToken: parseString(record.experimental_bearer_token),
    httpHeaders: recordToKeyValueItems(record.http_headers),
    envHttpHeaders: recordToKeyValueItems(record.env_http_headers),
    authCommand: parseString(auth.command),
    authArgs: parseStringArray(auth.args),
    authCwd: parseString(auth.cwd),
    authTimeoutMs: parseNumberLikeString(auth.timeout_ms),
    authRefreshIntervalMs: parseNumberLikeString(auth.refresh_interval_ms),
    awsProfile: parseString(aws.profile),
    awsRegion: parseString(aws.region),
  };
}

function parseMcpServer(id: string, value: unknown): McpServerDraft {
  const next = createEmptyMcpServer();
  const record = isPlainObject(value) ? value : {};
  const transport = parseString(record.command) ? "stdio" : "http";
  const startupTimeout =
    parseNumberLikeString(record.startup_timeout_sec) ||
    (typeof record.startup_timeout_ms === "number"
      ? String(record.startup_timeout_ms / 1000)
      : "");

  return {
    ...next,
    id,
    transport,
    enabled: !("enabled" in record) || parseBoolean(record.enabled),
    required: parseBoolean(record.required),
    command: parseString(record.command),
    args: parseStringArray(record.args),
    env: recordToKeyValueItems(record.env),
    envVars: parseStringArray(record.env_vars),
    cwd: parseString(record.cwd),
    experimentalEnvironment: parseString(record.experimental_environment),
    url: parseString(record.url),
    bearerTokenEnvVar: parseString(record.bearer_token_env_var),
    httpHeaders: recordToKeyValueItems(record.http_headers),
    envHttpHeaders: recordToKeyValueItems(record.env_http_headers),
    startupTimeoutSec: startupTimeout,
    toolTimeoutSec: parseNumberLikeString(record.tool_timeout_sec),
    enabledTools: parseStringArray(record.enabled_tools),
    disabledTools: parseStringArray(record.disabled_tools),
    scopes: parseStringArray(record.scopes),
    oauthResource: parseString(record.oauth_resource),
    auth: parseString(record.auth) as McpServerDraft["auth"],
    defaultToolsApprovalMode: parseString(
      record.default_tools_approval_mode,
    ) as McpServerDraft["defaultToolsApprovalMode"],
  };
}

function parseProfile(id: string, value: unknown): ProfileDraft {
  const next = createEmptyProfile();
  const record = isPlainObject(value) ? value : {};

  return {
    ...next,
    id,
    model: parseString(record.model),
    modelProvider: parseString(record.model_provider),
    approvalPolicy: parseString(record.approval_policy) as ProfileDraft["approvalPolicy"],
    sandboxMode: parseString(record.sandbox_mode) as ProfileDraft["sandboxMode"],
    serviceTier: parseString(record.service_tier) as ProfileDraft["serviceTier"],
    ossProvider: parseString(record.oss_provider),
    modelReasoningEffort: parseString(
      record.model_reasoning_effort,
    ) as ProfileDraft["modelReasoningEffort"],
    planModeReasoningEffort: parseString(
      record.plan_mode_reasoning_effort,
    ) as ProfileDraft["planModeReasoningEffort"],
    modelReasoningSummary: parseString(record.model_reasoning_summary),
    modelVerbosity: parseString(record.model_verbosity) as ProfileDraft["modelVerbosity"],
    personality: parseString(record.personality) as ProfileDraft["personality"],
    modelCatalogJson: parseString(record.model_catalog_json),
    modelInstructionsFile: parseString(record.model_instructions_file),
    experimentalCompactPromptFile: parseString(record.experimental_compact_prompt_file),
    toolsViewImage: parseBoolean(record.tools_view_image),
  };
}

function parseProject(path: string, value: unknown): ProjectDraft {
  const record = isPlainObject(value) ? value : {};

  return {
    path,
    trustLevel: parseString(record.trust_level) as ProjectDraft["trustLevel"],
  };
}

export function parseSupportedTomlObject(value: TomlObject): ConfigDraft {
  const draft = createEmptyDraft();

  draft.general.model = parseString(value.model);
  draft.general.reviewModel = parseString(value.review_model);
  draft.general.modelProvider = parseString(value.model_provider);
  if (isPlainObject(value.approval_policy) && isPlainObject(value.approval_policy.granular)) {
    draft.general.approvalPolicy = "granular";
    draft.general.approvalPolicyGranular = {
      sandboxApproval: parseBoolean(value.approval_policy.granular.sandbox_approval),
      rules: parseBoolean(value.approval_policy.granular.rules),
      mcpElicitations: parseBoolean(value.approval_policy.granular.mcp_elicitations),
      requestPermissions: parseBoolean(value.approval_policy.granular.request_permissions),
      skillApproval: parseBoolean(value.approval_policy.granular.skill_approval),
    };
  } else {
    draft.general.approvalPolicy = parseString(
      value.approval_policy,
    ) as ConfigDraft["general"]["approvalPolicy"];
  }
  draft.general.approvalsReviewer = parseString(
    value.approvals_reviewer,
  ) as ConfigDraft["general"]["approvalsReviewer"];
  draft.general.allowLoginShell = parseBoolean(value.allow_login_shell);
  draft.general.sandboxMode = parseString(
    value.sandbox_mode,
  ) as ConfigDraft["general"]["sandboxMode"];
  draft.general.serviceTier = parseString(
    value.service_tier,
  ) as ConfigDraft["general"]["serviceTier"];
  draft.general.webSearch = parseString(value.web_search) as ConfigDraft["general"]["webSearch"];
  draft.general.activeProfile = parseString(value.profile);
  draft.general.modelReasoningEffort = parseString(
    value.model_reasoning_effort,
  ) as ConfigDraft["general"]["modelReasoningEffort"];
  draft.general.planModeReasoningEffort = parseString(
    value.plan_mode_reasoning_effort,
  ) as ConfigDraft["general"]["planModeReasoningEffort"];
  draft.general.modelReasoningSummary = parseString(value.model_reasoning_summary);
  draft.general.modelVerbosity = parseString(
    value.model_verbosity,
  ) as ConfigDraft["general"]["modelVerbosity"];
  draft.general.modelContextWindow = parseNumberLikeString(value.model_context_window);
  draft.general.modelAutoCompactTokenLimit = parseNumberLikeString(
    value.model_auto_compact_token_limit,
  );
  draft.general.modelAutoCompactTokenLimitScope = parseString(
    value.model_auto_compact_token_limit_scope,
  ) as ConfigDraft["general"]["modelAutoCompactTokenLimitScope"];
  draft.general.modelSupportsReasoningSummaries = parseBoolean(
    value.model_supports_reasoning_summaries,
  );
  draft.general.modelCatalogJson = parseString(value.model_catalog_json);
  draft.general.modelInstructionsFile = parseString(value.model_instructions_file);
  draft.general.developerInstructions = parseString(value.developer_instructions);
  draft.general.compactPrompt = parseString(value.compact_prompt);
  draft.general.toolOutputTokenLimit = parseNumberLikeString(value.tool_output_token_limit);
  draft.general.defaultPermissions = parseString(value.default_permissions);
  draft.general.personality = parseString(
    value.personality,
  ) as ConfigDraft["general"]["personality"];
  draft.general.ossProvider = parseString(value.oss_provider);
  draft.general.cliAuthCredentialsStore = parseString(
    value.cli_auth_credentials_store,
  ) as ConfigDraft["general"]["cliAuthCredentialsStore"];
  draft.general.chatgptBaseUrl = parseString(value.chatgpt_base_url);
  draft.general.openaiBaseUrl = parseString(value.openai_base_url);
  draft.general.forcedChatgptWorkspaceId = parseString(value.forced_chatgpt_workspace_id);
  draft.general.forcedLoginMethod = parseString(
    value.forced_login_method,
  ) as ConfigDraft["general"]["forcedLoginMethod"];
  draft.general.mcpOauthCredentialsStore = parseString(
    value.mcp_oauth_credentials_store,
  ) as ConfigDraft["general"]["mcpOauthCredentialsStore"];
  draft.general.mcpOauthCallbackPort = parseNumberLikeString(value.mcp_oauth_callback_port);
  draft.general.mcpOauthCallbackUrl = parseString(value.mcp_oauth_callback_url);
  draft.general.projectDocMaxBytes = parseNumberLikeString(value.project_doc_max_bytes);
  draft.general.projectDocFallbackFilenames = parseStringArray(
    value.project_doc_fallback_filenames,
  );
  draft.general.projectRootMarkers = parseStringArray(value.project_root_markers);
  draft.general.notify = parseStringArray(value.notify);
  draft.general.experimentalCompactPromptFile = parseString(
    value.experimental_compact_prompt_file,
  );
  draft.general.backgroundTerminalMaxTimeout = parseNumberLikeString(
    value.background_terminal_max_timeout,
  );
  draft.general.logDir = parseString(value.log_dir);
  draft.general.sqliteHome = parseString(value.sqlite_home);
  draft.general.fileOpener = parseString(
    value.file_opener,
  ) as ConfigDraft["general"]["fileOpener"];
  draft.general.hideAgentReasoning = parseBoolean(value.hide_agent_reasoning);
  draft.general.showRawAgentReasoning = parseBoolean(value.show_raw_agent_reasoning);
  draft.general.disablePasteBurst = parseBoolean(value.disable_paste_burst);
  draft.general.windowsWslSetupAcknowledged = parseBoolean(
    value.windows_wsl_setup_acknowledged,
  );
  draft.general.checkForUpdateOnStartup = parseBoolean(value.check_for_update_on_startup);
  draft.general.suppressUnstableFeaturesWarning = parseBoolean(
    value.suppress_unstable_features_warning,
  );

  if (isPlainObject(value.history)) {
    draft.history.persistence = parseString(
      value.history.persistence,
    ) as ConfigDraft["history"]["persistence"];
    draft.history.maxBytes = parseNumberLikeString(value.history.max_bytes);
  }

  if (isPlainObject(value.features)) {
    for (const { field, tomlKey } of FEATURE_TOGGLE_DEFINITIONS) {
      draft.features[field] = parseFeatureToggle(value.features[tomlKey]);
    }

    if (!draft.features.fastMode && parseBoolean(value.features.disable_fast_model)) {
      draft.features.fastMode = "disabled";
    }

    if (!draft.features.hooks && typeof value.features.codex_hooks === "boolean") {
      draft.features.hooks = parseFeatureToggle(value.features.codex_hooks);
    }

    if (!draft.general.webSearch) {
      if (parseBoolean(value.features.web_search_request)) {
        draft.general.webSearch = "live";
      } else if (parseBoolean(value.features.web_search_cached)) {
        draft.general.webSearch = "cached";
      } else if (value.features.web_search === false) {
        draft.general.webSearch = "disabled";
      }
    }
  }

  if (!draft.features.unifiedExec && typeof value.experimental_use_unified_exec_tool === "boolean") {
    draft.features.unifiedExec = parseFeatureToggle(value.experimental_use_unified_exec_tool);
  }

  draft.tools.webSearch = draft.general.webSearch;

  if (isPlainObject(value.sandbox_workspace_write)) {
    draft.sandboxWorkspaceWrite.writableRoots = parseStringArray(
      value.sandbox_workspace_write.writable_roots,
    );
    draft.sandboxWorkspaceWrite.networkAccess = parseBoolean(
      value.sandbox_workspace_write.network_access,
    );
    draft.sandboxWorkspaceWrite.excludeTmpdirEnvVar = parseBoolean(
      value.sandbox_workspace_write.exclude_tmpdir_env_var,
    );
    draft.sandboxWorkspaceWrite.excludeSlashTmp = parseBoolean(
      value.sandbox_workspace_write.exclude_slash_tmp,
    );
  }

  if (isPlainObject(value.shell_environment_policy)) {
    draft.shellEnvironmentPolicy.inherit = parseString(
      value.shell_environment_policy.inherit,
    ) as ConfigDraft["shellEnvironmentPolicy"]["inherit"];
    draft.shellEnvironmentPolicy.ignoreDefaultExcludes = parseBoolean(
      value.shell_environment_policy.ignore_default_excludes,
    );
    draft.shellEnvironmentPolicy.exclude = parseStringArray(
      value.shell_environment_policy.exclude,
    );
    draft.shellEnvironmentPolicy.set = recordToKeyValueItems(value.shell_environment_policy.set);
    draft.shellEnvironmentPolicy.includeOnly = parseStringArray(
      value.shell_environment_policy.include_only,
    );
    draft.shellEnvironmentPolicy.experimentalUseProfile = parseBoolean(
      value.shell_environment_policy.experimental_use_profile,
    );
  }

  if (isPlainObject(value.tools)) {
    draft.tools.viewImage = parseBoolean(value.tools.view_image);
  }

  if (isPlainObject(value.agents)) {
    draft.agents.maxThreads = parseNumberLikeString(value.agents.max_threads);
    draft.agents.maxDepth = parseNumberLikeString(value.agents.max_depth);
    draft.agents.jobMaxRuntimeSeconds = parseNumberLikeString(
      value.agents.job_max_runtime_seconds,
    );
    draft.agents.interruptMessage = parseFeatureToggle(
      value.agents.interrupt_message,
    );
  }

  if (isPlainObject(value.model_providers)) {
    draft.modelProviders = Object.entries(value.model_providers).map(([id, provider]) =>
      parseModelProvider(id, provider),
    );
  }

  if (isPlainObject(value.mcp_servers)) {
    draft.mcpServers = Object.entries(value.mcp_servers).map(([id, server]) =>
      parseMcpServer(id, server),
    );
  }

  if (isPlainObject(value.profiles)) {
    draft.profiles = Object.entries(value.profiles).map(([id, profile]) =>
      parseProfile(id, profile),
    );
  }

  if (isPlainObject(value.projects)) {
    draft.projects = Object.entries(value.projects).map(([path, project]) =>
      parseProject(path, project),
    );
  }

  return draft;
}

function stripKnownKeys(record: TomlObject, keys: string[]) {
  for (const key of keys) {
    delete record[key];
  }
}

function stripKnownNestedEntries(section: unknown, keys: string[]) {
  if (!isPlainObject(section)) {
    return;
  }

  for (const [entryKey, entryValue] of Object.entries(section)) {
    if (!isPlainObject(entryValue)) {
      continue;
    }

    stripKnownKeys(entryValue, keys);

    const pruned = pruneEmptyObjects(entryValue);
    if (!pruned || !isPlainObject(pruned) || Object.keys(pruned).length === 0) {
      delete section[entryKey];
      continue;
    }

    section[entryKey] = pruned;
  }
}

export function extractUnsupportedFragment(value: TomlObject): TomlObject {
  const clone = structuredClone(value);

  stripKnownKeys(clone, [
    "model",
    "review_model",
    "model_provider",
    "sandbox_mode",
    "service_tier",
    "web_search",
    "profile",
    "approvals_reviewer",
    "model_reasoning_effort",
    "plan_mode_reasoning_effort",
    "model_reasoning_summary",
    "model_verbosity",
    "model_context_window",
    "model_auto_compact_token_limit",
    "model_auto_compact_token_limit_scope",
    "model_supports_reasoning_summaries",
    "model_catalog_json",
    "model_instructions_file",
    "developer_instructions",
    "compact_prompt",
    "tool_output_token_limit",
    "default_permissions",
    "personality",
    "oss_provider",
    "cli_auth_credentials_store",
    "allow_login_shell",
    "chatgpt_base_url",
    "openai_base_url",
    "forced_chatgpt_workspace_id",
    "forced_login_method",
    "mcp_oauth_credentials_store",
    "mcp_oauth_callback_port",
    "mcp_oauth_callback_url",
    "project_doc_max_bytes",
    "project_doc_fallback_filenames",
    "project_root_markers",
    "notify",
    "experimental_compact_prompt_file",
    "experimental_use_unified_exec_tool",
    "background_terminal_max_timeout",
    "log_dir",
    "sqlite_home",
    "file_opener",
    "hide_agent_reasoning",
    "show_raw_agent_reasoning",
    "disable_paste_burst",
    "windows_wsl_setup_acknowledged",
    "check_for_update_on_startup",
    "suppress_unstable_features_warning",
  ]);
  if (typeof clone.approval_policy === "string") {
    delete clone.approval_policy;
  }
  if (
    isPlainObject(clone.approval_policy) &&
    isPlainObject(clone.approval_policy.granular)
  ) {
    stripKnownKeys(clone.approval_policy.granular, [
      "sandbox_approval",
      "rules",
      "mcp_elicitations",
      "request_permissions",
      "skill_approval",
    ]);
    if (Object.keys(clone.approval_policy.granular).length === 0) {
      delete clone.approval_policy.granular;
    }
    if (Object.keys(clone.approval_policy).length === 0) {
      delete clone.approval_policy;
    }
  }

  if (isPlainObject(clone.history)) {
    stripKnownKeys(clone.history, ["persistence", "max_bytes"]);
    if (Object.keys(clone.history).length === 0) {
      delete clone.history;
    }
  }

  if (isPlainObject(clone.features)) {
    stripKnownKeys(clone.features, [
      ...FEATURE_TOGGLE_DEFINITIONS.map(({ tomlKey }) => tomlKey),
      ...LEGACY_FEATURE_KEYS,
    ]);
    if (Object.keys(clone.features).length === 0) {
      delete clone.features;
    }
  }

  if (isPlainObject(clone.sandbox_workspace_write)) {
    stripKnownKeys(clone.sandbox_workspace_write, [
      "writable_roots",
      "network_access",
      "exclude_tmpdir_env_var",
      "exclude_slash_tmp",
    ]);
    if (Object.keys(clone.sandbox_workspace_write).length === 0) {
      delete clone.sandbox_workspace_write;
    }
  }

  if (isPlainObject(clone.shell_environment_policy)) {
    stripKnownKeys(clone.shell_environment_policy, [
      "inherit",
      "ignore_default_excludes",
      "exclude",
      "set",
      "include_only",
      "experimental_use_profile",
    ]);
    if (Object.keys(clone.shell_environment_policy).length === 0) {
      delete clone.shell_environment_policy;
    }
  }

  if (isPlainObject(clone.tools)) {
    stripKnownKeys(clone.tools, ["view_image"]);
    if (Object.keys(clone.tools).length === 0) {
      delete clone.tools;
    }
  }

  if (isPlainObject(clone.agents)) {
    stripKnownKeys(clone.agents, [
      "max_threads",
      "max_depth",
      "job_max_runtime_seconds",
      "interrupt_message",
    ]);
    if (Object.keys(clone.agents).length === 0) {
      delete clone.agents;
    }
  }

  stripKnownNestedEntries(clone.model_providers, [
    "name",
    "base_url",
    "wire_api",
    "query_params",
    "env_key",
    "env_key_instructions",
    "requires_openai_auth",
    "request_max_retries",
    "stream_max_retries",
    "stream_idle_timeout_ms",
    "supports_websockets",
    "experimental_bearer_token",
    "http_headers",
    "env_http_headers",
    "auth",
    "aws",
  ]);
  if (isPlainObject(clone.model_providers) && Object.keys(clone.model_providers).length === 0) {
    delete clone.model_providers;
  }

  stripKnownNestedEntries(clone.mcp_servers, [
    "enabled",
    "required",
    "command",
    "args",
    "env",
    "env_vars",
    "cwd",
    "experimental_environment",
    "url",
    "bearer_token_env_var",
    "http_headers",
    "env_http_headers",
    "startup_timeout_sec",
    "startup_timeout_ms",
    "tool_timeout_sec",
    "enabled_tools",
    "disabled_tools",
    "scopes",
    "oauth_resource",
    "auth",
    "default_tools_approval_mode",
  ]);
  if (isPlainObject(clone.mcp_servers) && Object.keys(clone.mcp_servers).length === 0) {
    delete clone.mcp_servers;
  }

  stripKnownNestedEntries(clone.profiles, [
    "model",
    "model_provider",
    "approval_policy",
    "sandbox_mode",
    "service_tier",
    "oss_provider",
    "model_reasoning_effort",
    "plan_mode_reasoning_effort",
    "model_reasoning_summary",
    "model_verbosity",
    "personality",
    "model_catalog_json",
    "model_instructions_file",
    "experimental_compact_prompt_file",
    "tools_view_image",
  ]);
  if (isPlainObject(clone.profiles) && Object.keys(clone.profiles).length === 0) {
    delete clone.profiles;
  }

  stripKnownNestedEntries(clone.projects, ["trust_level"]);
  if (isPlainObject(clone.projects) && Object.keys(clone.projects).length === 0) {
    delete clone.projects;
  }

  const pruned = pruneEmptyObjects(clone);
  return (isPlainObject(pruned) ? pruned : {}) as TomlObject;
}

export function parseConfigToml(toml: string): ParseConfigResponse {
  return parseConfigTomlWithLocale(toml);
}

export function parseConfigTomlWithLocale(
  toml: string,
  locale: GenerateConfigOptions["locale"] = "en",
): ParseConfigResponse {
  const warnings: ConfigParseWarning[] = [];
  const parsed = parse(toml) as TomlObject;
  const draft = parseSupportedTomlObject(parsed);
  const validationIssues = validateConfigDraft(draft, locale ?? "en");
  const unsupportedFragment = extractUnsupportedFragment(parsed);
  const unsupportedToml = Object.keys(unsupportedFragment).length
    ? `${stringify(unsupportedFragment).trim()}\n`
    : "";

  if (Object.keys(unsupportedFragment).length > 0) {
    pushWarning(
      warnings,
      `Preserved ${countFragmentNodes(unsupportedFragment)} unsupported fragment node(s) in advanced TOML.`,
    );
  }

  return {
    draft,
    unsupportedToml,
    warnings,
    validationIssues,
  };
}

export function generateConfigToml(
  draft: ConfigDraft,
  unsupportedToml = "",
  options: GenerateConfigOptions = {},
): GenerateConfigResponse {
  const warnings: ConfigParseWarning[] = [];
  const validationIssues = validateConfigDraft(draft, options.locale ?? "en");
  const supported = buildSupportedTomlObject(draft, warnings);
  let base: TomlObject = {};

  if (unsupportedToml.trim()) {
    base = parse(unsupportedToml) as TomlObject;
  }

  const merged = pruneEmptyObjects(deepMerge(base, supported));
  const normalized = isPlainObject(merged) ? merged : {};
  const generatedToml =
    Object.keys(normalized).length > 0 ? `${stringify(normalized).trim()}\n` : "";
  const finalToml = options.includeComments
    ? addConfigComments(generatedToml, options.locale ?? "en")
    : generatedToml;

  return {
    toml: addReferenceHeader(finalToml),
    warnings,
    validationIssues,
  };
}

export function safelyParseConfigToml(
  toml: string,
  locale: GenerateConfigOptions["locale"] = "en",
): ParseConfigResponse | { error: ConfigParseErrorShape } {
  try {
    return parseConfigTomlWithLocale(toml, locale);
  } catch (error) {
    return {
      error: formatTomlError(error),
    };
  }
}

export function safelyGenerateConfigToml(
  draft: ConfigDraft,
  unsupportedToml = "",
  options: GenerateConfigOptions = {},
): GenerateConfigResponse | { error: ConfigParseErrorShape } {
  try {
    return generateConfigToml(draft, unsupportedToml, options);
  } catch (error) {
    return {
      error: formatTomlError(error),
    };
  }
}

export function createSampleToml(options: GenerateConfigOptions = {}): string {
  return generateConfigToml(createSampleDraft(), SAMPLE_UNSUPPORTED_TOML, options).toml;
}

function addReferenceHeader(toml: string): string {
  const header = [
    `# Reference: ${SAMPLE_REFERENCE_URL}`,
    `# Reference: ${CONFIG_REFERENCE_URL}`,
    `# Reference: ${SUBAGENTS_REFERENCE_URL}`,
    `# Declared against official docs on ${SAMPLE_REVIEWED_ON}`,
    "",
  ].join("\n");

  return `${header}${toml}`;
}
