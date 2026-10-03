import { File, Paths } from "expo-file-system";

import { createOnboardingDrafts, type OnboardingDraftStorage } from "./onboarding-draft";

const DRAFT_KEY = "moojot-onboarding-draft-v1";
const draftFile = () => new File(Paths.document, `${DRAFT_KEY}.json`);

/** One small file per device, like the remembered email. */
const deviceStorage: OnboardingDraftStorage =
  process.env.EXPO_OS === "web"
    ? {
        read: async () => globalThis.localStorage?.getItem(DRAFT_KEY) ?? null,
        write: async (text) => globalThis.localStorage?.setItem(DRAFT_KEY, text),
        remove: async () => globalThis.localStorage?.removeItem(DRAFT_KEY),
      }
    : {
        async read() {
          const file = draftFile();
          return file.exists ? file.text() : null;
        },
        async write(text) {
          const file = draftFile();
          if (!file.exists) file.create();
          file.write(text);
        },
        async remove() {
          const file = draftFile();
          if (file.exists) file.delete();
        },
      };

export const onboardingDrafts = createOnboardingDrafts(deviceStorage);
