import { File, Paths } from "expo-file-system";

import { createOnboardingDrafts, type OnboardingDraftStorage } from "./onboarding-draft";

/** One key per account: `moojot-onboarding-draft-v1-<user id>`, with any character unsafe in a file name replaced. */
const draftKey = (userId: string) => `moojot-onboarding-draft-v1-${userId.replace(/[^A-Za-z0-9_-]/g, "_")}`;
const draftFile = (userId: string) => new File(Paths.document, `${draftKey(userId)}.json`);

/** One small file per account on the device, like the remembered email. */
const deviceStorage: OnboardingDraftStorage =
  process.env.EXPO_OS === "web"
    ? {
        read: async (userId) => globalThis.localStorage?.getItem(draftKey(userId)) ?? null,
        write: async (userId, text) => globalThis.localStorage?.setItem(draftKey(userId), text),
        remove: async (userId) => globalThis.localStorage?.removeItem(draftKey(userId)),
      }
    : {
        async read(userId) {
          const file = draftFile(userId);
          return file.exists ? file.text() : null;
        },
        async write(userId, text) {
          const file = draftFile(userId);
          if (!file.exists) file.create();
          file.write(text);
        },
        async remove(userId) {
          const file = draftFile(userId);
          if (file.exists) file.delete();
        },
      };

export const onboardingDrafts = createOnboardingDrafts(deviceStorage);
