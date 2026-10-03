import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";

import { createRememberedEmail, type RememberedEmailStorage } from "@/lib/remembered-email";

const STORAGE_KEY = "moojot-last-email-v1";
const emailFile = () => new File(Paths.document, `${STORAGE_KEY}.txt`);

/** One small file per device, like the theme choice; it holds only the email. */
const deviceStorage: RememberedEmailStorage =
  process.env.EXPO_OS === "web"
    ? {
        read: async () => globalThis.localStorage?.getItem(STORAGE_KEY) ?? null,
        write: async (text) => globalThis.localStorage?.setItem(STORAGE_KEY, text),
      }
    : {
        async read() {
          const file = emailFile();
          return file.exists ? file.text() : null;
        },
        async write(text) {
          const file = emailFile();
          if (!file.exists) file.create();
          file.write(text);
        },
      };

/** The app's one remembered email. The root loads it before the first screen and updates it from the session. */
export const rememberedEmail = createRememberedEmail(deviceStorage);

export function useRememberedEmail() {
  return useSyncExternalStore(rememberedEmail.subscribe, rememberedEmail.getSnapshot, rememberedEmail.getSnapshot);
}
