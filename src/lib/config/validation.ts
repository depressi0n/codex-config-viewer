import {
  createEmptyMcpServer,
  createEmptyModelProvider,
  createEmptyProfile,
  createEmptyProject,
} from "@/lib/config/defaults";
import type {
  ConfigDraft,
  ConfigValidationIssue,
  KeyValueItem,
  SupportedLocale,
} from "@/lib/config/types";
import { compactKeyValueList, compactStringList } from "@/lib/config/helpers";
import { getDictionary } from "@/lib/i18n/config";

function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? "");
}

function createIssue(
  severity: ConfigValidationIssue["severity"],
  path: string,
  message: string,
): ConfigValidationIssue {
  return { severity, path, message };
}

function findDuplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) {
      continue;
    }

    if (seen.has(normalized)) {
      duplicates.add(normalized);
      continue;
    }

    seen.add(normalized);
  }

  return [...duplicates];
}

function findDuplicateKeys(items: KeyValueItem[]) {
  return findDuplicateValues(compactKeyValueList(items).map((item) => item.key));
}

function parseIntegerLike(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return Number.NaN;
  }

  return parsed;
}

function hasProviderContent(row: ConfigDraft["modelProviders"][number]) {
  const empty = createEmptyModelProvider();

  return (
    row.name !== empty.name ||
    row.baseUrl !== empty.baseUrl ||
    row.wireApi !== empty.wireApi ||
    compactKeyValueList(row.queryParams).length > 0 ||
    row.envKey !== empty.envKey ||
    row.envKeyInstructions !== empty.envKeyInstructions ||
    row.requestMaxRetries !== empty.requestMaxRetries ||
    row.streamMaxRetries !== empty.streamMaxRetries ||
    row.streamIdleTimeoutMs !== empty.streamIdleTimeoutMs ||
    row.supportsWebsockets !== empty.supportsWebsockets ||
    row.experimentalBearerToken !== empty.experimentalBearerToken ||
    compactKeyValueList(row.httpHeaders).length > 0 ||
    compactKeyValueList(row.envHttpHeaders).length > 0
  );
}

function hasMcpContent(row: ConfigDraft["mcpServers"][number]) {
  const empty = createEmptyMcpServer();

  return (
    row.transport !== empty.transport ||
    row.enabled !== empty.enabled ||
    row.required !== empty.required ||
    row.command !== empty.command ||
    compactStringList(row.args).length > 0 ||
    compactKeyValueList(row.env).length > 0 ||
    row.cwd !== empty.cwd ||
    row.url !== empty.url ||
    row.bearerTokenEnvVar !== empty.bearerTokenEnvVar ||
    compactKeyValueList(row.httpHeaders).length > 0 ||
    compactKeyValueList(row.envHttpHeaders).length > 0 ||
    row.startupTimeoutSec !== empty.startupTimeoutSec ||
    row.toolTimeoutSec !== empty.toolTimeoutSec ||
    compactStringList(row.enabledTools).length > 0 ||
    compactStringList(row.disabledTools).length > 0 ||
    compactStringList(row.scopes).length > 0 ||
    row.oauthResource !== empty.oauthResource
  );
}

function hasProfileContent(row: ConfigDraft["profiles"][number]) {
  const empty = createEmptyProfile();

  return (
    row.model !== empty.model ||
    row.modelProvider !== empty.modelProvider ||
    row.approvalPolicy !== empty.approvalPolicy ||
    row.sandboxMode !== empty.sandboxMode ||
    row.serviceTier !== empty.serviceTier ||
    row.ossProvider !== empty.ossProvider ||
    row.modelReasoningEffort !== empty.modelReasoningEffort ||
    row.planModeReasoningEffort !== empty.planModeReasoningEffort ||
    row.modelReasoningSummary !== empty.modelReasoningSummary
  );
}

function hasProjectContent(row: ConfigDraft["projects"][number]) {
  const empty = createEmptyProject();

  return row.trustLevel !== empty.trustLevel;
}

export function validateConfigDraft(
  draft: ConfigDraft,
  locale: SupportedLocale = "en",
): ConfigValidationIssue[] {
  const dictionary = getDictionary(locale);
  const issues: ConfigValidationIssue[] = [];
  const validationText = dictionary.app.validation;

  const fieldLabel = (key: keyof typeof dictionary.fields) => dictionary.fields[key][0];
  const formatPath = (path: string) => path;
  const fieldRequiredWhen = (field: string, condition: string) =>
    interpolate(validationText.fieldRequiredWhen, { field, condition });
  const duplicateValue = (field: string, value: string) =>
    interpolate(validationText.duplicateValue, { field, value });
  const duplicateKey = (field: string, value: string) =>
    interpolate(validationText.duplicateKey, { field, value });
  const missingReference = (field: string, target: string, value: string) =>
    interpolate(validationText.missingReference, { field, target, value });
  const nonNegativeNumber = (field: string) =>
    interpolate(validationText.nonNegativeNumber, { field });
  const positiveNumber = (field: string) =>
    interpolate(validationText.positiveNumber, { field });

  for (const duplicate of findDuplicateKeys(draft.shellEnvironmentPolicy.set)) {
    issues.push(
      createIssue("warning", "shellEnvironmentPolicy.set", duplicateKey(fieldLabel("shellSet"), duplicate)),
    );
  }

  if (!draft.general.model.trim() && !draft.general.activeProfile.trim()) {
    issues.push(
      createIssue(
        "warning",
        formatPath("general.model"),
        interpolate(validationText.missingDefaultModel, {
          field: fieldLabel("model"),
          alternateField: fieldLabel("activeProfile"),
        }),
      ),
    );
  }

  const profileIds = draft.profiles.map((profile) => profile.id.trim()).filter(Boolean);
  if (
    draft.general.activeProfile.trim() &&
    !profileIds.includes(draft.general.activeProfile.trim())
  ) {
    issues.push(
      createIssue(
        "error",
        formatPath("general.activeProfile"),
        missingReference(
          fieldLabel("activeProfile"),
          validationText.profileTarget,
          draft.general.activeProfile.trim(),
        ),
      ),
    );
  }

  for (const duplicate of findDuplicateValues(draft.modelProviders.map((item) => item.id))) {
    issues.push(
      createIssue(
        "error",
        formatPath("modelProviders"),
        duplicateValue(fieldLabel("providerId"), duplicate),
      ),
    );
  }

  for (const duplicate of findDuplicateValues(draft.mcpServers.map((item) => item.id))) {
    issues.push(
      createIssue("error", formatPath("mcpServers"), duplicateValue(fieldLabel("mcpId"), duplicate)),
    );
  }

  for (const duplicate of findDuplicateValues(draft.profiles.map((item) => item.id))) {
    issues.push(
      createIssue(
        "error",
        formatPath("profiles"),
        duplicateValue(fieldLabel("profileId"), duplicate),
      ),
    );
  }

  for (const duplicate of findDuplicateValues(draft.projects.map((item) => item.path))) {
    issues.push(
      createIssue(
        "error",
        formatPath("projects"),
        duplicateValue(fieldLabel("projectPath"), duplicate),
      ),
    );
  }

  draft.modelProviders.forEach((provider, index) => {
    const basePath = `modelProviders[${index}]`;

    if (!provider.id.trim() && hasProviderContent(provider)) {
      issues.push(
        createIssue(
          "error",
          `${basePath}.id`,
          fieldRequiredWhen(fieldLabel("providerId"), validationText.rowHasContent),
        ),
      );
    }

    for (const duplicate of findDuplicateKeys(provider.queryParams)) {
      issues.push(
        createIssue(
          "warning",
          `${basePath}.queryParams`,
          duplicateKey(fieldLabel("queryParams"), duplicate),
        ),
      );
    }

    for (const duplicate of findDuplicateKeys(provider.httpHeaders)) {
      issues.push(
        createIssue(
          "warning",
          `${basePath}.httpHeaders`,
          duplicateKey(fieldLabel("httpHeaders"), duplicate),
        ),
      );
    }

    for (const duplicate of findDuplicateKeys(provider.envHttpHeaders)) {
      issues.push(
        createIssue(
          "warning",
          `${basePath}.envHttpHeaders`,
          duplicateKey(fieldLabel("envHttpHeaders"), duplicate),
        ),
      );
    }

    const requestMaxRetries = parseIntegerLike(provider.requestMaxRetries);
    if (requestMaxRetries !== null && (!Number.isFinite(requestMaxRetries) || requestMaxRetries < 0)) {
      issues.push(
        createIssue(
          "error",
          `${basePath}.requestMaxRetries`,
          nonNegativeNumber(fieldLabel("requestMaxRetries")),
        ),
      );
    }

    const streamMaxRetries = parseIntegerLike(provider.streamMaxRetries);
    if (streamMaxRetries !== null && (!Number.isFinite(streamMaxRetries) || streamMaxRetries < 0)) {
      issues.push(
        createIssue(
          "error",
          `${basePath}.streamMaxRetries`,
          nonNegativeNumber(fieldLabel("streamMaxRetries")),
        ),
      );
    }

    const streamIdleTimeoutMs = parseIntegerLike(provider.streamIdleTimeoutMs);
    if (
      streamIdleTimeoutMs !== null &&
      (!Number.isFinite(streamIdleTimeoutMs) || streamIdleTimeoutMs <= 0)
    ) {
      issues.push(
        createIssue(
          "error",
          `${basePath}.streamIdleTimeoutMs`,
          positiveNumber(fieldLabel("streamIdleTimeoutMs")),
        ),
      );
    }
  });

  draft.mcpServers.forEach((server, index) => {
    const basePath = `mcpServers[${index}]`;

    if (!server.id.trim() && hasMcpContent(server)) {
      issues.push(
        createIssue(
          "error",
          `${basePath}.id`,
          fieldRequiredWhen(fieldLabel("mcpId"), validationText.rowHasContent),
        ),
      );
    }

    if (server.id.trim() && server.transport === "stdio" && !server.command.trim()) {
      issues.push(
        createIssue(
          "error",
          `${basePath}.command`,
          fieldRequiredWhen(
            fieldLabel("command"),
            interpolate(validationText.transportIs, {
              value: dictionary.options.transport.stdio,
            }),
          ),
        ),
      );
    }

    if (server.id.trim() && server.transport === "http" && !server.url.trim()) {
      issues.push(
        createIssue(
          "error",
          `${basePath}.url`,
          fieldRequiredWhen(
            fieldLabel("url"),
            interpolate(validationText.transportIs, {
              value: dictionary.options.transport.http,
            }),
          ),
        ),
      );
    }

    for (const duplicate of findDuplicateKeys(server.env)) {
      issues.push(
        createIssue("warning", `${basePath}.env`, duplicateKey(fieldLabel("env"), duplicate)),
      );
    }

    for (const duplicate of findDuplicateKeys(server.httpHeaders)) {
      issues.push(
        createIssue(
          "warning",
          `${basePath}.httpHeaders`,
          duplicateKey(fieldLabel("httpHeaders"), duplicate),
        ),
      );
    }

    for (const duplicate of findDuplicateKeys(server.envHttpHeaders)) {
      issues.push(
        createIssue(
          "warning",
          `${basePath}.envHttpHeaders`,
          duplicateKey(fieldLabel("envHttpHeaders"), duplicate),
        ),
      );
    }

    const startupTimeoutSec = parseIntegerLike(server.startupTimeoutSec);
    if (startupTimeoutSec !== null && (!Number.isFinite(startupTimeoutSec) || startupTimeoutSec <= 0)) {
      issues.push(
        createIssue(
          "error",
          `${basePath}.startupTimeoutSec`,
          positiveNumber(fieldLabel("startupTimeoutSec")),
        ),
      );
    }

    const toolTimeoutSec = parseIntegerLike(server.toolTimeoutSec);
    if (toolTimeoutSec !== null && (!Number.isFinite(toolTimeoutSec) || toolTimeoutSec <= 0)) {
      issues.push(
        createIssue(
          "error",
          `${basePath}.toolTimeoutSec`,
          positiveNumber(fieldLabel("toolTimeoutSec")),
        ),
      );
    }
  });

  draft.profiles.forEach((profile, index) => {
    if (!profile.id.trim() && hasProfileContent(profile)) {
      issues.push(
        createIssue(
          "error",
          `profiles[${index}].id`,
          fieldRequiredWhen(fieldLabel("profileId"), validationText.rowHasContent),
        ),
      );
    }
  });

  draft.projects.forEach((project, index) => {
    const basePath = `projects[${index}]`;

    if (!project.path.trim() && hasProjectContent(project)) {
      issues.push(
        createIssue(
          "error",
          `${basePath}.path`,
          fieldRequiredWhen(
            fieldLabel("projectPath"),
            interpolate(validationText.fieldIsSet, { field: fieldLabel("trustLevel") }),
          ),
        ),
      );
    }

    if (project.path.trim() && !project.trustLevel.trim()) {
      issues.push(
        createIssue(
          "error",
          `${basePath}.trustLevel`,
          fieldRequiredWhen(
            fieldLabel("trustLevel"),
            interpolate(validationText.fieldIsSet, { field: fieldLabel("projectPath") }),
          ),
        ),
      );
    }
  });

  const historyMaxBytes = parseIntegerLike(draft.history.maxBytes);
  if (historyMaxBytes !== null && (!Number.isFinite(historyMaxBytes) || historyMaxBytes <= 0)) {
    issues.push(
      createIssue("error", "history.maxBytes", positiveNumber(fieldLabel("historyMaxBytes"))),
    );
  }

  const projectDocMaxBytes = parseIntegerLike(draft.general.projectDocMaxBytes);
  if (
    projectDocMaxBytes !== null &&
    (!Number.isFinite(projectDocMaxBytes) || projectDocMaxBytes <= 0)
  ) {
    issues.push(
      createIssue(
        "error",
        "general.projectDocMaxBytes",
        positiveNumber(fieldLabel("projectDocMaxBytes")),
      ),
    );
  }

  const mcpOauthCallbackPort = parseIntegerLike(draft.general.mcpOauthCallbackPort);
  if (
    mcpOauthCallbackPort !== null &&
    (!Number.isFinite(mcpOauthCallbackPort) || mcpOauthCallbackPort <= 0)
  ) {
    issues.push(
      createIssue(
        "error",
        "general.mcpOauthCallbackPort",
        positiveNumber(fieldLabel("mcpOauthCallbackPort")),
      ),
    );
  }

  return issues.sort((left, right) => {
    if (left.severity !== right.severity) {
      return left.severity === "error" ? -1 : 1;
    }

    return left.path.localeCompare(right.path);
  });
}
