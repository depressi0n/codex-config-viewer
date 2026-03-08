import React from "react";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfigEditor } from "@/components/config-editor";
import { createRecommendedDraft, createSampleDraft } from "@/lib/config/defaults";
import { generateConfigToml } from "@/lib/config/toml";
import { getDictionary } from "@/lib/i18n/config";

function mockGenerateFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const payload = generateConfigToml(body.draft, body.unsupportedToml, body.options);

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }),
  );
}

function createPreview(locale: "en" | "zh-CN", includeComments = true) {
  return generateConfigToml(createSampleDraft(), "", { includeComments, locale }).toml;
}

describe("ConfigEditor", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockGenerateFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists edited draft across locale remounts", async () => {
    const { unmount } = render(
      <ConfigEditor
        locale="en"
        dictionary={getDictionary("en")}
        initialDraft={createSampleDraft()}
        initialPreview={createPreview("en")}
        initialUnsupportedToml=""
      />,
    );

    const generalSection = screen.getByRole("heading", { name: "General" }).closest("section");
    expect(generalSection).not.toBeNull();
    if (!generalSection) {
      return;
    }

    const modelInput = within(generalSection).getAllByRole("textbox")[0];
    await userEvent.clear(modelInput);
    await userEvent.type(modelInput, "gpt-custom");

    await waitFor(() => {
      expect(window.localStorage.getItem("codex-config-viewer-state:v1")).toContain("gpt-custom");
    });

    unmount();

    render(
      <ConfigEditor
        locale="zh-CN"
        dictionary={getDictionary("zh-CN")}
        initialDraft={createSampleDraft()}
        initialPreview={createPreview("zh-CN")}
        initialUnsupportedToml=""
      />,
    );

    const zhGeneralSection = screen
      .getByRole("heading", { name: "通用设置" })
      .closest("section");
    expect(zhGeneralSection).not.toBeNull();
    if (!zhGeneralSection) {
      return;
    }

    expect(within(zhGeneralSection).getAllByRole("textbox")[0]).toHaveValue("gpt-custom");
  });

  it("adds and removes a model provider row", async () => {
    render(
      <ConfigEditor
        locale="en"
        dictionary={getDictionary("en")}
        initialDraft={createSampleDraft()}
        initialPreview={createPreview("en")}
        initialUnsupportedToml=""
      />,
    );

    const section = screen.getByRole("heading", { name: "Model Providers" }).closest("section");
    expect(section).not.toBeNull();
    if (!section) {
      return;
    }

    await userEvent.click(within(section).getByRole("button", { name: "Add" }));
    const providerIdInput = within(section).getAllByRole("textbox")[0];
    await userEvent.type(providerIdInput, "azure");
    expect(within(section).getByDisplayValue("azure")).toBeInTheDocument();

    await userEvent.click(within(section).getAllByRole("button", { name: "Remove" })[0]);

    await waitFor(() => {
      expect(within(section).queryByDisplayValue("azure")).not.toBeInTheDocument();
    });
  });

  it("applies the recommended preset", async () => {
    render(
      <ConfigEditor
        locale="en"
        dictionary={getDictionary("en")}
        initialDraft={createSampleDraft()}
        initialPreview={createPreview("en")}
        initialUnsupportedToml=""
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Apply recommended preset" }));

    const generalSection = screen.getByRole("heading", { name: "General" }).closest("section");
    expect(generalSection).not.toBeNull();
    if (!generalSection) {
      return;
    }

    const recommendedDraft = createRecommendedDraft();
    const toolsSection = screen.getByRole("heading", { name: "Tools" }).closest("section");
    const sandboxSection = screen.getByRole("heading", { name: "Sandbox" }).closest("section");

    expect(
      within(generalSection).getByRole("combobox", { name: /approval policy/i }),
    ).toHaveValue(recommendedDraft.general.approvalPolicy);
    expect(
      within(generalSection).getByRole("combobox", { name: /sandbox mode/i }),
    ).toHaveValue(recommendedDraft.general.sandboxMode);
    expect(toolsSection).not.toBeNull();
    if (!toolsSection) {
      return;
    }

    expect(
      within(toolsSection).getByRole("combobox", { name: /web search/i }),
    ).toHaveValue(recommendedDraft.general.webSearch);

    expect(sandboxSection).not.toBeNull();
    if (!sandboxSection) {
      return;
    }

    expect(within(sandboxSection).getByRole("checkbox")).toBeChecked();

    await waitFor(() => {
      expect(window.localStorage.getItem("codex-config-viewer-state:v1")).toContain(
        '"approvalPolicy":"on-failure"',
      );
      expect(window.localStorage.getItem("codex-config-viewer-state:v1")).toContain(
        '"networkAccess":true',
      );
    });
  });

  it("toggles explanatory comments in generated preview output", async () => {
    render(
      <ConfigEditor
        locale="en"
        dictionary={getDictionary("en")}
        initialDraft={createSampleDraft()}
        initialPreview={createPreview("en")}
        initialUnsupportedToml=""
      />,
    );

    expect(
      screen.getByText((content) => content.includes("# Model: Default session model.")),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("checkbox", { name: /include explanatory comments/i }),
    );

    await waitFor(() => {
      expect(
        screen.queryByText((content) => content.includes("# Model: Default session model.")),
      ).not.toBeInTheDocument();
      expect(window.localStorage.getItem("codex-config-viewer-state:v1")).toContain(
        '"includeComments":false',
      );
    });
  });
});
