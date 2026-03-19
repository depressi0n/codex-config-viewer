import type { Dictionary } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/config";

import type { SupportedLocale } from "@/lib/config/types";

const ROOT_SECTION_MAP: Record<string, string> = {
  history: "history",
  features: "features",
  sandbox_workspace_write: "sandbox",
  shell_environment_policy: "shell",
  tools: "tools",
  model_providers: "modelProviders",
  mcp_servers: "mcpServers",
  profiles: "profiles",
  projects: "projects",
};

function formatComment(label: string, hint: string) {
  return hint.trim() ? `# ${label}: ${hint}` : `# ${label}`;
}

function parseTomlPath(path: string) {
  const segments: string[] = [];
  let current = "";
  let inQuotes = false;
  let escaping = false;

  for (const char of path) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      current += char;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "." && !inQuotes) {
      segments.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments.map((segment) =>
    segment.replace(/\\\\/g, "\\").replace(/\\"/g, '"'),
  );
}

function resolveTopLevelFieldKey(key: string) {
  const topLevelFields: Record<string, string> = {
    model: "model",
    review_model: "reviewModel",
    model_provider: "modelProvider",
    approval_policy: "approvalPolicy",
    allow_login_shell: "allowLoginShell",
    sandbox_mode: "sandboxMode",
    service_tier: "serviceTier",
    web_search: "webSearch",
    profile: "activeProfile",
    model_reasoning_effort: "modelReasoningEffort",
    plan_mode_reasoning_effort: "planModeReasoningEffort",
    model_reasoning_summary: "modelReasoningSummary",
    oss_provider: "ossProvider",
    cli_auth_credentials_store: "cliAuthCredentialsStore",
    chatgpt_base_url: "chatgptBaseUrl",
    openai_base_url: "openaiBaseUrl",
    forced_chatgpt_workspace_id: "forcedChatgptWorkspaceId",
    forced_login_method: "forcedLoginMethod",
    mcp_oauth_credentials_store: "mcpOauthCredentialsStore",
    mcp_oauth_callback_port: "mcpOauthCallbackPort",
    mcp_oauth_callback_url: "mcpOauthCallbackUrl",
    project_doc_max_bytes: "projectDocMaxBytes",
    project_doc_fallback_filenames: "projectDocFallbackFilenames",
    project_root_markers: "projectRootMarkers",
    notify: "notify",
    file_opener: "fileOpener",
    hide_agent_reasoning: "hideAgentReasoning",
    show_raw_agent_reasoning: "showRawAgentReasoning",
    disable_paste_burst: "disablePasteBurst",
    windows_wsl_setup_acknowledged: "windowsWslSetupAcknowledged",
    check_for_update_on_startup: "checkForUpdateOnStartup",
    suppress_unstable_features_warning: "suppressUnstableFeaturesWarning",
  };

  return topLevelFields[key];
}

function resolveNestedFieldKey(root: string, key: string) {
  const nestedFields: Record<string, Record<string, string>> = {
    history: {
      persistence: "historyPersistence",
      max_bytes: "historyMaxBytes",
    },
    features: {
      disable_fast_model: "disableFastModel",
      use_experimental_reasoning_summary: "useExperimentalReasoningSummary",
    },
    sandbox_workspace_write: {
      writable_roots: "writableRoots",
      network_access: "networkAccess",
      exclude_tmpdir_env_var: "excludeTmpdirEnvVar",
      exclude_slash_tmp: "excludeSlashTmp",
    },
    shell_environment_policy: {
      inherit: "shellInherit",
      ignore_default_excludes: "ignoreDefaultExcludes",
      exclude: "shellExclude",
      set: "shellSet",
      include_only: "shellIncludeOnly",
      experimental_use_profile: "experimentalUseProfile",
    },
    tools: {
      view_image: "viewImage",
    },
    model_providers: {
      name: "providerName",
      base_url: "baseUrl",
      wire_api: "wireApi",
      query_params: "queryParams",
      env_key: "envKey",
      env_key_instructions: "envKeyInstructions",
      request_max_retries: "requestMaxRetries",
      stream_max_retries: "streamMaxRetries",
      stream_idle_timeout_ms: "streamIdleTimeoutMs",
      supports_websockets: "supportsWebsockets",
      experimental_bearer_token: "experimentalBearerToken",
      http_headers: "httpHeaders",
      env_http_headers: "envHttpHeaders",
    },
    mcp_servers: {
      enabled: "mcpEnabled",
      required: "mcpRequired",
      command: "command",
      args: "args",
      env: "env",
      cwd: "cwd",
      url: "url",
      bearer_token_env_var: "bearerTokenEnvVar",
      http_headers: "httpHeaders",
      env_http_headers: "envHttpHeaders",
      startup_timeout_sec: "startupTimeoutSec",
      tool_timeout_sec: "toolTimeoutSec",
      enabled_tools: "enabledTools",
      disabled_tools: "disabledTools",
      scopes: "scopes",
      oauth_resource: "oauthResource",
    },
    profiles: {
      model: "model",
      model_provider: "modelProvider",
      approval_policy: "approvalPolicy",
      sandbox_mode: "sandboxMode",
      service_tier: "serviceTier",
      oss_provider: "ossProvider",
      model_reasoning_effort: "modelReasoningEffort",
      plan_mode_reasoning_effort: "planModeReasoningEffort",
      model_reasoning_summary: "modelReasoningSummary",
    },
    projects: {
      trust_level: "trustLevel",
    },
  };

  return nestedFields[root]?.[key];
}

function resolveTableIdentityField(root: string) {
  const tableIdentityFields: Record<string, string> = {
    model_providers: "providerId",
    mcp_servers: "mcpId",
    profiles: "profileId",
    projects: "projectPath",
  };

  return tableIdentityFields[root];
}

function formatSectionComment(dictionary: Dictionary, sectionId: string) {
  const section = dictionary.sections[sectionId];
  return formatComment(section.title, section.description);
}

function formatFieldComment(dictionary: Dictionary, fieldKey: string) {
  const field = dictionary.fields[fieldKey];

  if (!field) {
    return null;
  }

  return formatComment(field[0], field[1]);
}

function formatTableIdentityComment(dictionary: Dictionary, root: string, value: string) {
  const identityField = resolveTableIdentityField(root);

  if (!identityField) {
    return null;
  }

  const field = dictionary.fields[identityField];
  if (!field) {
    return null;
  }

  return formatComment(`${field[0]} (${value})`, field[1]);
}

export function addConfigComments(toml: string, locale: SupportedLocale = "en") {
  const body = toml.trimEnd();

  if (!body) {
    return toml;
  }

  const dictionary = getDictionary(locale);
  const lines = body.split("\n");
  const nextLines: string[] = [];
  const seenSections = new Set<string>();
  let hasGeneralComment = false;
  let currentPath: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      nextLines.push(line);
      continue;
    }

    const tableMatch = trimmed.match(/^\[(.+)\]$/);
    if (tableMatch) {
      currentPath = parseTomlPath(tableMatch[1]);

      const root = currentPath[0];
      const sectionId = root ? ROOT_SECTION_MAP[root] : undefined;

      if (sectionId && !seenSections.has(sectionId)) {
        nextLines.push(formatSectionComment(dictionary, sectionId));
        seenSections.add(sectionId);
      }

      if (root && currentPath.length > 1) {
        const identityComment = formatTableIdentityComment(dictionary, root, currentPath[1]);
        if (identityComment) {
          nextLines.push(identityComment);
        }
      }

      nextLines.push(line);
      continue;
    }

    const keyMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*=/);
    if (!keyMatch) {
      nextLines.push(line);
      continue;
    }

    if (!currentPath.length && !hasGeneralComment) {
      nextLines.push(formatSectionComment(dictionary, "general"));
      hasGeneralComment = true;
    }

    const fieldKey = currentPath.length
      ? resolveNestedFieldKey(currentPath[0], keyMatch[1])
      : resolveTopLevelFieldKey(keyMatch[1]);

    if (fieldKey) {
      const fieldComment = formatFieldComment(dictionary, fieldKey);
      if (fieldComment) {
        nextLines.push(fieldComment);
      }
    }

    nextLines.push(line);
  }

  return `${nextLines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}
