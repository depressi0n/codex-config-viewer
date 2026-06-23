import {
  createEmptyMcpServer,
  createRecommendedDraft,
  createSampleDraft,
} from "@/lib/config/defaults";
import {
  createSampleToml,
  generateConfigToml,
  parseConfigToml,
  parseConfigTomlWithLocale,
  safelyParseConfigToml,
} from "@/lib/config/toml";

describe("config TOML transforms", () => {
  it("round-trips key supported fields", () => {
    const draft = createSampleDraft();
    draft.general.sandboxMode = "workspace-write";
    draft.general.allowLoginShell = true;
    draft.general.projectDocMaxBytes = "65536";
    draft.general.modelVerbosity = "high";
    draft.general.modelContextWindow = "400000";
    draft.general.modelAutoCompactTokenLimit = "200000";
    draft.general.toolOutputTokenLimit = "16000";
    draft.general.modelCatalogJson = "./models.json";
    draft.general.modelSupportsReasoningSummaries = true;
    draft.general.personality = "pragmatic";
    draft.general.approvalsReviewer = "auto_review";
    draft.general.projectDocFallbackFilenames = ["AGENTS.md", "README.md"];
    draft.general.projectRootMarkers = [".git", "package.json"];
    draft.general.notify = ["terminal-notifier", "-title", "Codex"];
    draft.sandboxWorkspaceWrite.writableRoots = ["/tmp/shared"];
    draft.sandboxWorkspaceWrite.networkAccess = true;
    draft.sandboxWorkspaceWrite.excludeTmpdirEnvVar = true;
    draft.history.maxBytes = "5242880";
    draft.shellEnvironmentPolicy.set = [{ key: "FOO", value: "bar" }];
    draft.shellEnvironmentPolicy.experimentalUseProfile = true;
    draft.tools.viewImage = true;
    draft.agents.maxThreads = "6";
    draft.agents.maxDepth = "1";
    draft.agents.jobMaxRuntimeSeconds = "1800";
    draft.projects = [{ path: "/workspace/project", trustLevel: "trusted" }];

    const docsServer = createEmptyMcpServer();
    docsServer.id = "docs";
    docsServer.transport = "http";
    docsServer.url = "https://docs.example.com/mcp";
    docsServer.scopes = ["read:docs"];
    draft.mcpServers = [docsServer];

    const generated = generateConfigToml(draft);
    const parsed = parseConfigToml(generated.toml);

    expect(generated.toml).toContain(
      "# Reference: https://developers.openai.com/codex/config-sample/",
    );
    expect(generated.toml).toContain(
      "# Reference: https://developers.openai.com/codex/subagents",
    );
    expect(generated.toml).toContain(
      "# Declared against official docs on 2026-06-23",
    );
    expect(parsed.draft.general.model).toBe("gpt-5.5");
    expect(parsed.draft.general.sandboxMode).toBe("workspace-write");
    expect(parsed.draft.general.modelVerbosity).toBe("high");
    expect(parsed.draft.general.modelContextWindow).toBe("400000");
    expect(parsed.draft.general.modelAutoCompactTokenLimit).toBe("200000");
    expect(parsed.draft.general.toolOutputTokenLimit).toBe("16000");
    expect(parsed.draft.general.modelCatalogJson).toBe("./models.json");
    expect(parsed.draft.general.modelSupportsReasoningSummaries).toBe(true);
    expect(parsed.draft.general.personality).toBe("pragmatic");
    expect(parsed.draft.general.approvalsReviewer).toBe("auto_review");
    expect(parsed.draft.general.projectDocMaxBytes).toBe("65536");
    expect(parsed.draft.general.projectDocFallbackFilenames).toEqual([
      "AGENTS.md",
      "README.md",
    ]);
    expect(parsed.draft.general.projectRootMarkers).toEqual([".git", "package.json"]);
    expect(parsed.draft.general.notify).toEqual(["terminal-notifier", "-title", "Codex"]);
    expect(parsed.draft.history.maxBytes).toBe("5242880");
    expect(parsed.draft.sandboxWorkspaceWrite.writableRoots).toEqual(["/tmp/shared"]);
    expect(parsed.draft.sandboxWorkspaceWrite.excludeTmpdirEnvVar).toBe(true);
    expect(parsed.draft.shellEnvironmentPolicy.set).toEqual([{ key: "FOO", value: "bar" }]);
    expect(parsed.draft.shellEnvironmentPolicy.experimentalUseProfile).toBe(true);
    expect(parsed.draft.tools.viewImage).toBe(true);
    expect(parsed.draft.agents.maxThreads).toBe("6");
    expect(parsed.draft.agents.maxDepth).toBe("1");
    expect(parsed.draft.agents.jobMaxRuntimeSeconds).toBe("1800");
    expect(parsed.draft.mcpServers[0]?.url).toBe("https://docs.example.com/mcp");
    expect(parsed.draft.projects[0]?.trustLevel).toBe("trusted");
  });

  it("preserves unsupported TOML and lets supported fields win conflicts", () => {
    const draft = createSampleDraft();
    draft.general.model = "gpt-5.4";

    const generated = generateConfigToml(
      draft,
      ['model = "wrong-model"', "", "[permissions.network]", 'allow = ["api.openai.com"]'].join(
        "\n",
      ),
    );

    expect(generated.toml).toContain('model = "gpt-5.4"');
    expect(generated.toml).toContain("[permissions.network]");
    expect(generated.toml).toContain('allow = [ "api.openai.com" ]');
  });

  it("preserves unknown parsed sections in unsupported TOML", () => {
    const parsed = parseConfigToml(
      [
        'model = "gpt-5.4"',
        "",
        "[permissions.network]",
        'allow = ["api.openai.com"]',
      ].join("\n"),
    );

    expect(parsed.unsupportedToml).toContain("[permissions.network]");
    expect(parsed.unsupportedToml).toContain('allow = [ "api.openai.com" ]');
  });

  it("round-trips granular approval policies", () => {
    const parsed = parseConfigToml(
      [
        "approval_policy = { granular = { sandbox_approval = true, rules = true, mcp_elicitations = true, request_permissions = false, skill_approval = false } }",
      ].join("\n"),
    );
    const generated = generateConfigToml(parsed.draft);
    const reparsed = parseConfigToml(generated.toml);

    expect(parsed.draft.general.approvalPolicy).toBe("granular");
    expect(parsed.draft.general.approvalPolicyGranular.sandboxApproval).toBe(true);
    expect(parsed.unsupportedToml).toBe("");
    expect(reparsed.draft.general.approvalPolicy).toBe("granular");
    expect(reparsed.draft.general.approvalPolicyGranular.requestPermissions).toBe(false);
  });

  it("round-trips current provider and MCP additions", () => {
    const parsed = parseConfigToml(
      [
        "[model_providers.proxy]",
        'name = "Proxy"',
        'base_url = "https://proxy.example.com/v1"',
        'wire_api = "responses"',
        "requires_openai_auth = true",
        "[model_providers.proxy.auth]",
        'command = "/usr/local/bin/fetch-codex-token"',
        'args = ["--audience", "codex"]',
        "timeout_ms = 5000",
        "refresh_interval_ms = 300000",
        "[model_providers.proxy.aws]",
        'profile = "dev"',
        'region = "us-east-1"',
        "",
        "[mcp_servers.docs]",
        'command = "docs-server"',
        'env_vars = ["LOCAL_TOKEN", "REMOTE_TOKEN"]',
        'experimental_environment = "remote"',
        "startup_timeout_ms = 10000",
      ].join("\n"),
    );
    const generated = generateConfigToml(parsed.draft);
    const reparsed = parseConfigToml(generated.toml);

    expect(parsed.unsupportedToml).toBe("");
    expect(reparsed.draft.modelProviders[0]?.requiresOpenaiAuth).toBe(true);
    expect(reparsed.draft.modelProviders[0]?.authCommand).toBe(
      "/usr/local/bin/fetch-codex-token",
    );
    expect(reparsed.draft.modelProviders[0]?.authArgs).toEqual(["--audience", "codex"]);
    expect(reparsed.draft.modelProviders[0]?.authTimeoutMs).toBe("5000");
    expect(reparsed.draft.modelProviders[0]?.authRefreshIntervalMs).toBe("300000");
    expect(reparsed.draft.modelProviders[0]?.awsProfile).toBe("dev");
    expect(reparsed.draft.modelProviders[0]?.awsRegion).toBe("us-east-1");
    expect(reparsed.draft.mcpServers[0]?.envVars).toEqual(["LOCAL_TOKEN", "REMOTE_TOKEN"]);
    expect(reparsed.draft.mcpServers[0]?.experimentalEnvironment).toBe("remote");
    expect(reparsed.draft.mcpServers[0]?.startupTimeoutSec).toBe("10");
  });

  it("round-trips current feature overrides with explicit enabled and disabled values", () => {
    const parsed = parseConfigToml(
      [
        "[features]",
        "apps = false",
        "hooks = true",
        "fast_mode = false",
        "unified_exec = true",
        "memories = true",
        "undo = false",
      ].join("\n"),
    );
    const generated = generateConfigToml(parsed.draft);
    const reparsed = parseConfigToml(generated.toml);

    expect(parsed.draft.features.apps).toBe("disabled");
    expect(parsed.draft.features.hooks).toBe("enabled");
    expect(parsed.draft.features.fastMode).toBe("disabled");
    expect(parsed.draft.features.unifiedExec).toBe("enabled");
    expect(parsed.draft.features.memories).toBe("enabled");
    expect(parsed.draft.features.undo).toBe("disabled");
    expect(parsed.unsupportedToml).toBe("");
    expect(generated.toml).toContain("apps = false");
    expect(generated.toml).toContain("hooks = true");
    expect(generated.toml).toContain("fast_mode = false");
    expect(generated.toml).toContain("unified_exec = true");
    expect(reparsed.draft.features.fastMode).toBe("disabled");
    expect(reparsed.draft.features.unifiedExec).toBe("enabled");
  });

  it("maps documented legacy feature aliases into current fields", () => {
    const parsed = parseConfigToml(
      [
        "experimental_use_unified_exec_tool = false",
        "",
        "[features]",
        "disable_fast_model = true",
        "codex_hooks = true",
        "web_search_cached = true",
      ].join("\n"),
    );
    const generated = generateConfigToml(parsed.draft);

    expect(parsed.draft.features.unifiedExec).toBe("disabled");
    expect(parsed.draft.features.fastMode).toBe("disabled");
    expect(parsed.draft.features.hooks).toBe("enabled");
    expect(parsed.draft.general.webSearch).toBe("cached");
    expect(parsed.unsupportedToml).not.toContain("experimental_use_unified_exec_tool");
    expect(parsed.unsupportedToml).not.toContain("disable_fast_model");
    expect(parsed.unsupportedToml).not.toContain("codex_hooks");
    expect(parsed.unsupportedToml).not.toContain("web_search_cached");
    expect(generated.toml).toContain("unified_exec = false");
    expect(generated.toml).toContain("fast_mode = false");
    expect(generated.toml).toContain('web_search = "cached"');
  });

  it("returns parse error details for invalid TOML", () => {
    const result = safelyParseConfigToml("model = [");

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.message.length).toBeGreaterThan(0);
      expect(result.error.line).toBeGreaterThan(0);
      expect(result.error.column).toBeGreaterThan(0);
    }
  });

  it("serializes the recommended preset with expected operational defaults", () => {
    const draft = createRecommendedDraft();
    const generated = generateConfigToml(draft);
    const parsed = parseConfigToml(generated.toml);

    expect(parsed.draft.general.approvalPolicy).toBe("on-request");
    expect(parsed.draft.general.sandboxMode).toBe("workspace-write");
    expect(parsed.draft.general.webSearch).toBe("live");
    expect(parsed.draft.tools.webSearch).toBe("live");
    expect(parsed.draft.shellEnvironmentPolicy.inherit).toBe("core");
    expect(parsed.draft.sandboxWorkspaceWrite.networkAccess).toBe(true);
  });

  it("can include localized explanatory comments when requested", () => {
    const withComments = generateConfigToml(createSampleDraft(), "", {
      includeComments: true,
      locale: "en",
    });
    const withoutComments = generateConfigToml(createSampleDraft(), "", {
      includeComments: false,
      locale: "en",
    });

    expect(withComments.toml).toContain("# General: Core model, approval, auth, and UI behavior.");
    expect(withComments.toml).toContain("# Model: Default session model.");
    expect(withComments.toml).toContain("# History: Compaction and persistence controls.");
    expect(withoutComments.toml).not.toContain("# Model: Default session model.");
  });

  it("supports parsing and annotating the [agents] section", () => {
    const parsed = parseConfigToml(
      [
        "[agents]",
        "max_threads = 8",
        "max_depth = 2",
        "job_max_runtime_seconds = 900",
      ].join("\n"),
    );
    const generated = generateConfigToml(parsed.draft, "", {
      includeComments: true,
      locale: "en",
    });

    expect(parsed.draft.agents.maxThreads).toBe("8");
    expect(parsed.draft.agents.maxDepth).toBe("2");
    expect(parsed.draft.agents.jobMaxRuntimeSeconds).toBe("900");
    expect(parsed.unsupportedToml).toBe("");
    expect(generated.toml).toContain("# Agents: Subagent concurrency and runtime limits under [agents].");
    expect(generated.toml).toContain("# Max threads: Maximum concurrent subagent threads.");
  });

  it("includes the current official unsupported sample sections in the sample TOML", () => {
    const sampleToml = createSampleToml({
      includeComments: false,
      locale: "en",
    });

    expect(sampleToml).toContain("[tui]");
    expect(sampleToml).toContain("[analytics]");
    expect(sampleToml).toContain("[otel]");
    expect(sampleToml).toContain("[agents.reviewer]");
    expect(sampleToml).toContain('config_file = "./agents/reviewer.toml"');
    expect(sampleToml).toContain("[[skills.config]]");
  });

  it("returns validation issues from generated draft output", () => {
    const draft = createSampleDraft();
    draft.general.activeProfile = "missing";

    const generated = generateConfigToml(draft, "", { locale: "en" });

    expect(
      generated.validationIssues.some(
        (issue) => issue.path === "general.activeProfile" && issue.severity === "error",
      ),
    ).toBe(true);
  });

  it("returns validation issues when parsing imported TOML", () => {
    const parsed = parseConfigTomlWithLocale(
      ['profile = "missing"', "", "[history]", "max_bytes = -1"].join("\n"),
      "en",
    );

    expect(
      parsed.validationIssues.some(
        (issue) => issue.path === "general.activeProfile" && issue.severity === "error",
      ),
    ).toBe(true);
    expect(
      parsed.validationIssues.some(
        (issue) => issue.path === "history.maxBytes" && issue.severity === "error",
      ),
    ).toBe(true);
  });
});
