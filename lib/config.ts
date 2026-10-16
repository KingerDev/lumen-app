/**
 * Runtime configuration.
 *
 * ⚠️  Everything referenced here ends up inside the shipped JS bundle. Expo
 * inlines `EXPO_PUBLIC_*` variables at build time, and anyone can unzip an
 * .ipa/.apk and read them. So this file may only ever hold **public** values.
 *
 * R2 credentials (Access Key ID, Secret Access Key, Account ID) are NOT public.
 * They belong on the server, which hands the app short-lived presigned URLs.
 * See README → "Cloudflare R2".
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    console.warn(`[lumen] chýba ${name} — nastav ho v .env a reštartuj Metro s --clear`);
  }
  return value ?? '';
}

export const config = {
  /** Base URL of our own API. The app talks only to this — never to R2 directly. */
  apiUrl: required(process.env.EXPO_PUBLIC_API_URL, 'EXPO_PUBLIC_API_URL'),

  /**
   * Public read domain of the R2 bucket, e.g. https://media.lumen.sk.
   * Only set this if the bucket is genuinely public. For a private journal it
   * should stay empty and every read should go through a presigned URL.
   */
  mediaBaseUrl: process.env.EXPO_PUBLIC_MEDIA_BASE_URL ?? '',

  /** True once a backend is configured; until then the app is local-only. */
  get hasBackend(): boolean {
    return Boolean(process.env.EXPO_PUBLIC_API_URL);
  },
} as const;

/** Public pages on the API host — linked from the App Store and the app. */
export function legalUrl(page: 'privacy' | 'support', lang: string): string {
  return `${config.apiUrl.replace(/\/$/, '')}/${page}?lang=${lang}`;
}
