import { parse, stringify } from "smol-toml";

import {
  createEmptyDraft,
  createEmptyMcpServer,
  createEmptyModelProvider,
  createEmptyProfile,
  createSampleDraft,
  SAMPLE_REFERENCE_URL,
  SAMPLE_REVIEWED_ON,
} from "@/lib/config/defaults";
import { addConfigComments } from "@/lib/config/comments";
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

function serializeProvider(provider: ModelProviderDraft): TomlObject {
  const next: TomlObject = {};

  maybeAssignString(next, "name", provider.name);
  maybeAssignString(next, "base_url", provider.baseUrl);
  maybeAssignString(next, "wire_api", provider.wireApi);
  maybeAssignStringRecord(next, "query_params", provider.queryParams);
  maybeAssignString(next, "env_key", provider.envKey);
  maybeAssignString(next, "env_key_instructions", provider.envKeyInstructions);
  maybeAssignNumber(next, "request_max_retries", provider.requestMaxRetries);
  maybeAssignNumber(next, "stream_max_retries", provider.streamMaxRetries);
  maybeAssignNumber(next, "stream_idle_timeout_ms", provider.streamIdleTimeoutMs);
  maybeAssignBoolean(next, "supports_websockets", provider.supportsWebsockets);
  maybeAssignString(next, "experimental_bearer_token", provider.experimentalBearerToken);
  maybeAssignStringRecord(next, "http_headers", provider.httpHeaders);
  maybeAssignStringRecord(next, "env_http_headers", provider.envHttpHeaders);

  return next;
}

function serializeMcpServer(server: McpServerDraft): TomlObject {
  const next: TomlObject = {};

  if (server.enabled) {
    next.enabled = true;
  }

  if (server.required) {
    next.required = true;
  }

  if (server.transport === "stdio") {
    maybeAssignString(next, "command", server.command);
    maybeAssignStringList(next, "args", server.args);
    maybeAssignStringRecord(next, "env", server.env);
    maybeAssignString(next, "cwd", server.cwd);
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
  maybeAssignString(raw, "approval_policy", draft.general.approvalPolicy);
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
  maybeAssignString(raw, "oss_provider", draft.general.ossProvider);
  maybeAssignString(
    raw,
    "cli_auth_credentials_store",
    draft.general.cliAuthCredentialsStore,
  );
  maybeAssignString(raw, "chatgpt_base_url", draft.general.chatgptBaseUrl);
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
  maybeAssignString(raw, "file_opener", draft.general.fileOpener);
  maybeAssignBoolean(raw, "hide_agent_reasoning", draft.general.hideAgentReasoning);
  maybeAssignBoolean(raw, "show_raw_agent_reasoning", draft.general.showRawAgentReasoning);
  maybeAssignBoolean(raw, "disable_paste_burst", draft.general.disablePasteBurst);
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
  maybeAssignBoolean(features, "disable_fast_model", draft.features.disableFastModel);
  maybeAssignBoolean(
    features,
    "use_experimental_reasoning_summary",
    draft.features.useExperimentalReasoningSummary,
  );
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
  maybeAssignStringList(
    shellEnvironmentPolicy,
    "include_only",
    draft.shellEnvironmentPolicy.includeOnly,
  );
  if (Object.keys(shellEnvironmentPolicy).length > 0) {
    raw.shell_environment_policy = shellEnvironmentPolicy;
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

  return {
    ...next,
    id,
    name: parseString(record.name),
    baseUrl: parseString(record.base_url),
    wireApi: parseString(record.wire_api),
    queryParams: recordToKeyValueItems(record.query_params),
    envKey: parseString(record.env_key),
    envKeyInstructions: parseString(record.env_key_instructions),
    requestMaxRetries: parseNumberLikeString(record.request_max_retries),
    streamMaxRetries: parseNumberLikeString(record.stream_max_retries),
    streamIdleTimeoutMs: parseNumberLikeString(record.stream_idle_timeout_ms),
    supportsWebsockets: parseBoolean(record.supports_websockets),
    experimentalBearerToken: parseString(record.experimental_bearer_token),
    httpHeaders: recordToKeyValueItems(record.http_headers),
    envHttpHeaders: recordToKeyValueItems(record.env_http_headers),
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
    cwd: parseString(record.cwd),
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
  draft.general.approvalPolicy = parseString(value.approval_policy) as ConfigDraft["general"]["approvalPolicy"];
  draft.general.sandboxMode = parseString(value.sandbox_mode) as ConfigDraft["general"]["sandboxMode"];
  draft.general.serviceTier = parseString(value.service_tier) as ConfigDraft["general"]["serviceTier"];
  draft.general.webSearch = parseString(value.web_search) as ConfigDraft["general"]["webSearch"];
  draft.general.activeProfile = parseString(value.profile);
  draft.general.modelReasoningEffort = parseString(
    value.model_reasoning_effort,
  ) as ConfigDraft["general"]["modelReasoningEffort"];
  draft.general.planModeReasoningEffort = parseString(
    value.plan_mode_reasoning_effort,
  ) as ConfigDraft["general"]["planModeReasoningEffort"];
  draft.general.modelReasoningSummary = parseString(value.model_reasoning_summary);
  draft.general.ossProvider = parseString(value.oss_provider);
  draft.general.cliAuthCredentialsStore = parseString(
    value.cli_auth_credentials_store,
  ) as ConfigDraft["general"]["cliAuthCredentialsStore"];
  draft.general.chatgptBaseUrl = parseString(value.chatgpt_base_url);
  draft.general.forcedChatgptWorkspaceId = parseString(value.forced_chatgpt_workspace_id);
  draft.general.forcedLoginMethod = parseString(
    value.forced_login_method,
  ) as ConfigDraft["general"]["forcedLoginMethod"];
  draft.general.mcpOauthCredentialsStore = parseString(
    value.mcp_oauth_credentials_store,
  ) as ConfigDraft["general"]["mcpOauthCredentialsStore"];
  draft.general.fileOpener = parseString(value.file_opener) as ConfigDraft["general"]["fileOpener"];
  draft.general.hideAgentReasoning = parseBoolean(value.hide_agent_reasoning);
  draft.general.showRawAgentReasoning = parseBoolean(value.show_raw_agent_reasoning);
  draft.general.disablePasteBurst = parseBoolean(value.disable_paste_burst);
  draft.general.suppressUnstableFeaturesWarning = parseBoolean(
    value.suppress_unstable_features_warning,
  );
  draft.tools.webSearch = draft.general.webSearch;

  if (isPlainObject(value.history)) {
    draft.history.persistence = parseString(
      value.history.persistence,
    ) as ConfigDraft["history"]["persistence"];
    draft.history.maxBytes = parseNumberLikeString(value.history.max_bytes);
  }

  if (isPlainObject(value.features)) {
    draft.features.disableFastModel = parseBoolean(value.features.disable_fast_model);
    draft.features.useExperimentalReasoningSummary = parseBoolean(
      value.features.use_experimental_reasoning_summary,
    );
  }

  if (isPlainObject(value.sandbox_workspace_write)) {
    draft.sandboxWorkspaceWrite.writableRoots = parseStringArray(
      value.sandbox_workspace_write.writable_roots,
    );
    draft.sandboxWorkspaceWrite.networkAccess = parseBoolean(
      value.sandbox_workspace_write.network_access,
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
    draft.shellEnvironmentPolicy.includeOnly = parseStringArray(
      value.shell_environment_policy.include_only,
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
    "approval_policy",
    "sandbox_mode",
    "service_tier",
    "web_search",
    "profile",
    "model_reasoning_effort",
    "plan_mode_reasoning_effort",
    "model_reasoning_summary",
    "oss_provider",
    "cli_auth_credentials_store",
    "chatgpt_base_url",
    "forced_chatgpt_workspace_id",
    "forced_login_method",
    "mcp_oauth_credentials_store",
    "file_opener",
    "hide_agent_reasoning",
    "show_raw_agent_reasoning",
    "disable_paste_burst",
    "suppress_unstable_features_warning",
  ]);

  if (isPlainObject(clone.history)) {
    stripKnownKeys(clone.history, ["persistence", "max_bytes"]);
    if (Object.keys(clone.history).length === 0) {
      delete clone.history;
    }
  }

  if (isPlainObject(clone.features)) {
    stripKnownKeys(clone.features, [
      "disable_fast_model",
      "use_experimental_reasoning_summary",
    ]);
    if (Object.keys(clone.features).length === 0) {
      delete clone.features;
    }
  }

  if (isPlainObject(clone.sandbox_workspace_write)) {
    stripKnownKeys(clone.sandbox_workspace_write, ["writable_roots", "network_access"]);
    if (Object.keys(clone.sandbox_workspace_write).length === 0) {
      delete clone.sandbox_workspace_write;
    }
  }

  if (isPlainObject(clone.shell_environment_policy)) {
    stripKnownKeys(clone.shell_environment_policy, [
      "inherit",
      "ignore_default_excludes",
      "exclude",
      "include_only",
    ]);
    if (Object.keys(clone.shell_environment_policy).length === 0) {
      delete clone.shell_environment_policy;
    }
  }

  stripKnownNestedEntries(clone.model_providers, [
    "name",
    "base_url",
    "wire_api",
    "query_params",
    "env_key",
    "env_key_instructions",
    "request_max_retries",
    "stream_max_retries",
    "stream_idle_timeout_ms",
    "supports_websockets",
    "experimental_bearer_token",
    "http_headers",
    "env_http_headers",
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
    "cwd",
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
  return generateConfigToml(createSampleDraft(), "", options).toml;
}

function addReferenceHeader(toml: string): string {
  const header = [
    `# Reference: ${SAMPLE_REFERENCE_URL}`,
    `# Declared against official sample on ${SAMPLE_REVIEWED_ON}`,
    "",
  ].join("\n");

  return `${header}${toml}`;
}
