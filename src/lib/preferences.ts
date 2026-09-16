import { updateUserProfile } from "@/actions/user.actions";

export interface UserPreferences {
  theme?: string;
  attendanceTarget?: number;
}

const PREF_REGEX = /<!--otium-pref:(.*?)-->/;

/**
 * Parse user preferences (like attendance target and theme) stored securely in user metadata/bio
 */
export function parsePreferencesFromBio(bio?: string | null): {
  preferences: UserPreferences;
  cleanBio: string;
} {
  const defaultPrefs: UserPreferences = {
    attendanceTarget: 75,
    theme: "cyber-neon",
  };

  if (!bio) {
    return { preferences: defaultPrefs, cleanBio: "" };
  }

  const match = bio.match(PREF_REGEX);
  if (!match) {
    return { preferences: defaultPrefs, cleanBio: bio };
  }

  try {
    const parsed = JSON.parse(match[1]);
    const cleanBio = bio.replace(PREF_REGEX, "").trim();
    return {
      preferences: {
        attendanceTarget:
          typeof parsed.attendanceTarget === "number" &&
          parsed.attendanceTarget >= 40 &&
          parsed.attendanceTarget <= 99
            ? parsed.attendanceTarget
            : 75,
        theme: parsed.theme || "cyber-neon",
      },
      cleanBio,
    };
  } catch {
    return { preferences: defaultPrefs, cleanBio: bio };
  }
}

/**
 * Serialize bio and preferences into database storage string
 */
export function serializeBioWithPreferences(
  cleanBio: string,
  preferences: UserPreferences
): string {
  const meta = JSON.stringify(preferences);
  const trimmed = (cleanBio || "").replace(PREF_REGEX, "").trim();
  return trimmed ? `${trimmed}\n\n<!--otium-pref:${meta}-->` : `<!--otium-pref:${meta}-->`;
}

/**
 * Helper to update user preferences in the cloud database
 */
export async function syncUserPreferencesToCloud(
  userId: string,
  currentBio: string | null | undefined,
  partialPrefs: Partial<UserPreferences>
) {
  const { preferences: currentPrefs, cleanBio } = parsePreferencesFromBio(currentBio);
  const updatedPrefs: UserPreferences = {
    ...currentPrefs,
    ...partialPrefs,
  };

  const newBio = serializeBioWithPreferences(cleanBio, updatedPrefs);
  const res = await updateUserProfile({
    userId,
    bio: newBio,
  });

  return { res, updatedPrefs };
}
