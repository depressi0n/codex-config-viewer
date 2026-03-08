import { NextResponse } from "next/server";

import { safelyParseConfigToml } from "@/lib/config/toml";
import { isLocale } from "@/lib/i18n/config";

export async function POST(request: Request) {
  const body = (await request.json()) as { toml?: unknown; locale?: unknown };
  const locale =
    typeof body.locale === "string" && isLocale(body.locale) ? body.locale : undefined;

  if (typeof body.toml !== "string") {
    return NextResponse.json(
      {
        error: {
          message: "Expected a `toml` string in the request body.",
        },
      },
      { status: 400 },
    );
  }

  if (body.locale !== undefined && !locale) {
    return NextResponse.json(
      {
        error: {
          message: "`locale` must be one of `en` or `zh-CN` when provided.",
        },
      },
      { status: 400 },
    );
  }

  const result = safelyParseConfigToml(body.toml, locale ?? "en");

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
