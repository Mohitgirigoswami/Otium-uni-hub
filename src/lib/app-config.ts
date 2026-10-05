/**
 * Central app distribution config.
 * Update APK_DOWNLOAD_URL here whenever a new GitHub Release is published.
 * Use `/latest/download/otium.apk` to always point to the newest release.
 */
export const APP_CONFIG = {
  /** Android APK — GitHub Releases (unlimited bandwidth, permanent link) */
  APK_DOWNLOAD_URL:
    "https://github.com/Mohitgirigoswami/Otium-uni-hub/releases/latest/download/otium.apk",

  /** App version shown in UI banners */
  APP_VERSION: "1.0.5",

  /** GitHub repo for release notes */
  GITHUB_RELEASES_URL:
    "https://github.com/Mohitgirigoswami/Otium-uni-hub/releases",
} as const;
