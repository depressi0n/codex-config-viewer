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
      "# Declared against official sample on 2026-03-19",
    );
    expect(parsed.draft.general.model).toBe("gpt-5.4");
    expect(parsed.draft.general.sandboxMode).toBe("workspace-write");
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

  it("preserves unsupported granular approval policies instead of dropping them", () => {
    const parsed = parseConfigToml(
      [
        "[approval_policy]",
        'mode = "granular"',
        "",
        "[approval_policy.granular]",
        "read = true",
      ].join("\n"),
    );

    expect(parsed.draft.general.approvalPolicy).toBe("");
    expect(parsed.unsupportedToml).toContain("[approval_policy]");
    expect(parsed.unsupportedToml).toContain("read = true");
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

    expect(parsed.draft.general.approvalPolicy).toBe("on-failure");
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

  it("includes the current official unsupported sample sections in the sample TOML", () => {
    const sampleToml = createSampleToml({
      includeComments: false,
      locale: "en",
    });

    expect(sampleToml).toContain("[tui]");
    expect(sampleToml).toContain("[analytics]");
    expect(sampleToml).toContain("[otel]");
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
