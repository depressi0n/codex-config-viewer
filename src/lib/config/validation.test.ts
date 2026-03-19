import { createEmptyMcpServer, createSampleDraft } from "@/lib/config/defaults";
import { validateConfigDraft } from "@/lib/config/validation";

describe("config validation", () => {
  it("reports missing references, duplicate ids, and transport-specific requirements", () => {
    const draft = createSampleDraft();
    draft.general.activeProfile = "missing-profile";
    draft.general.projectDocMaxBytes = "-1";
    draft.general.mcpOauthCallbackPort = "0";
    draft.history.maxBytes = "-1";
    draft.shellEnvironmentPolicy.set = [
      { key: "FOO", value: "bar" },
      { key: "FOO", value: "baz" },
    ];
    draft.modelProviders = [
      {
        ...draft.modelProviders[0],
        id: "openai-compatible",
        name: "Provider A",
        baseUrl: "https://example.com/v1",
        wireApi: "responses",
        queryParams: [],
        envKey: "API_KEY",
        envKeyInstructions: "",
        requestMaxRetries: "",
        streamMaxRetries: "",
        streamIdleTimeoutMs: "",
        supportsWebsockets: false,
        experimentalBearerToken: "",
        httpHeaders: [],
        envHttpHeaders: [],
      },
      {
        id: "openai-compatible",
        name: "Provider B",
        baseUrl: "https://example.com/v2",
        wireApi: "responses",
        queryParams: [],
        envKey: "API_KEY",
        envKeyInstructions: "",
        requestMaxRetries: "",
        streamMaxRetries: "",
        streamIdleTimeoutMs: "",
        supportsWebsockets: false,
        experimentalBearerToken: "",
        httpHeaders: [],
        envHttpHeaders: [],
      },
    ];

    const httpServer = createEmptyMcpServer();
    httpServer.id = "docs";
    httpServer.transport = "http";
    httpServer.url = "";
    draft.mcpServers = [httpServer];

    const issues = validateConfigDraft(draft, "en");

    expect(
      issues.some(
        (issue) =>
          issue.severity === "error" &&
          issue.path === "general.activeProfile" &&
          issue.message.includes("missing profile"),
      ),
    ).toBe(true);
    expect(
      issues.some(
        (issue) =>
          issue.severity === "error" &&
          issue.path === "modelProviders" &&
          issue.message.includes("Duplicate value: openai-compatible"),
      ),
    ).toBe(true);
    expect(
      issues.some(
        (issue) =>
          issue.severity === "error" &&
          issue.path === "mcpServers[0].url" &&
          issue.message.includes("Transport is HTTP"),
      ),
    ).toBe(true);
    expect(
      issues.some(
        (issue) =>
          issue.severity === "error" &&
          issue.path === "history.maxBytes" &&
          issue.message.includes("greater than 0"),
      ),
    ).toBe(true);
    expect(
      issues.some(
        (issue) =>
          issue.severity === "error" &&
          issue.path === "general.projectDocMaxBytes" &&
          issue.message.includes("greater than 0"),
      ),
    ).toBe(true);
    expect(
      issues.some(
        (issue) =>
          issue.severity === "error" &&
          issue.path === "general.mcpOauthCallbackPort" &&
          issue.message.includes("greater than 0"),
      ),
    ).toBe(true);
    expect(
      issues.some(
        (issue) =>
          issue.severity === "warning" &&
          issue.path === "shellEnvironmentPolicy.set" &&
          issue.message.includes("duplicate key"),
      ),
    ).toBe(true);
  });
});
