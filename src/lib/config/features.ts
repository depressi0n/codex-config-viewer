import type { FeatureToggleValue, FeaturesSettings } from "@/lib/config/types";

export const FEATURE_TOGGLE_DEFINITIONS = [
  { field: "shellTool", tomlKey: "shell_tool" },
  { field: "apps", tomlKey: "apps" },
  { field: "hooks", tomlKey: "hooks" },
  { field: "unifiedExec", tomlKey: "unified_exec" },
  { field: "shellSnapshot", tomlKey: "shell_snapshot" },
  { field: "multiAgent", tomlKey: "multi_agent" },
  { field: "goals", tomlKey: "goals" },
  { field: "remotePlugin", tomlKey: "remote_plugin" },
  { field: "personalityFeature", tomlKey: "personality" },
  { field: "fastMode", tomlKey: "fast_mode" },
  { field: "enableRequestCompression", tomlKey: "enable_request_compression" },
  {
    field: "skillMcpDependencyInstall",
    tomlKey: "skill_mcp_dependency_install",
  },
  { field: "preventIdleSleep", tomlKey: "prevent_idle_sleep" },
  { field: "memories", tomlKey: "memories" },
] as const satisfies readonly {
  field: keyof FeaturesSettings;
  tomlKey: string;
}[];

export const LEGACY_FEATURE_KEYS = [
  "codex_hooks",
  "disable_fast_model",
  "web_search",
  "web_search_cached",
  "web_search_request",
] as const;

export type FeatureToggleField = (typeof FEATURE_TOGGLE_DEFINITIONS)[number]["field"];

export function parseFeatureToggle(value: unknown): FeatureToggleValue {
  if (value === true) {
    return "enabled";
  }

  if (value === false) {
    return "disabled";
  }

  return "";
}

export function serializeFeatureToggle(value: FeatureToggleValue): boolean | undefined {
  if (value === "enabled") {
    return true;
  }

  if (value === "disabled") {
    return false;
  }

  return undefined;
}
