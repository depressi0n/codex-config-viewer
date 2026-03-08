import { NextResponse } from "next/server";

import { safelyGenerateConfigToml } from "@/lib/config/toml";
import type { ConfigDraft, GenerateConfigOptions } from "@/lib/config/types";
import { isLocale } from "@/lib/i18n/config";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    draft?: ConfigDraft;
    unsupportedToml?: unknown;
    options?: GenerateConfigOptions;
  };

  if (!body.draft || typeof body.draft !== "object") {
    return NextResponse.json(
      {
        error: {
          message: "Expected a `draft` object in the request body.",
        },
      },
      { status: 400 },
    );
  }

  if (body.unsupportedToml !== undefined && typeof body.unsupportedToml !== "string") {
    return NextResponse.json(
      {
        error: {
          message: "`unsupportedToml` must be a string when provided.",
        },
      },
      { status: 400 },
    );
  }

  if (body.options !== undefined && typeof body.options !== "object") {
    return NextResponse.json(
      {
        error: {
          message: "`options` must be an object when provided.",
        },
      },
      { status: 400 },
    );
  }

  if (
    body.options?.includeComments !== undefined &&
    typeof body.options.includeComments !== "boolean"
  ) {
    return NextResponse.json(
      {
        error: {
          message: "`options.includeComments` must be a boolean when provided.",
        },
      },
      { status: 400 },
    );
  }

  if (body.options?.locale !== undefined && !isLocale(body.options.locale)) {
    return NextResponse.json(
      {
        error: {
          message: "`options.locale` must be one of `en` or `zh-CN` when provided.",
        },
      },
      { status: 400 },
    );
  }

  const result = safelyGenerateConfigToml(body.draft, body.unsupportedToml, body.options);

  if ("error" in result) {
    return NextResponse.json(
      {
        error: result.error,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
