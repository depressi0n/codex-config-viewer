import { notFound } from "next/navigation";

import { ConfigEditor } from "@/components/config-editor";
import { createSampleDraft } from "@/lib/config/defaults";
import { createSampleToml } from "@/lib/config/toml";
import { getDictionary, isLocale } from "@/lib/i18n/config";

export default async function LocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);

  return (
    <ConfigEditor
      locale={locale}
      dictionary={dictionary}
      initialDraft={createSampleDraft()}
      initialPreview={createSampleToml({ includeComments: true, locale })}
      initialUnsupportedToml=""
    />
  );
}
