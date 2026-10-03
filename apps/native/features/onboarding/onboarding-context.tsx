import { createContext, use, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { AppState, View } from "react-native";

import { countSlipPhotos } from "@/features/slips/auto-import/discovery";
import { nativePhotoLibrary, readPhotoAccess, requestPhotoAccess } from "@/features/slips/library-scan";
import { authClient } from "@/lib/auth-client";
import { useAppTheme } from "@/lib/use-app-theme";
import { client, orpc, queryClient } from "@/utils/orpc";

import { onboardingDrafts } from "./device-onboarding-draft";
import { startOnboarding, type OnboardingFlow } from "./onboarding-flow";
import { createPhotoStep, type PhotoStep, type PhotoStepPorts, type PhotoStepState } from "./photo-step";
import { createSetupSave, type SetupSave, type SetupSaveState } from "./save-onboarding";

/** This device's photo permission and bank albums. Setup only counts image metadata; Home reads the photos. */
const devicePhotos: PhotoStepPorts = {
  read: readPhotoAccess,
  request: requestPhotoAccess,
  count: () => countSlipPhotos(nativePhotoLibrary, Date.now()),
};

type OnboardingContextValue = {
  flow: OnboardingFlow;
  update: (change: (flow: OnboardingFlow) => OnboardingFlow) => void;
  /** The recap's save. It outlives the recap screen, so a pending save blocks back and a second save. */
  setupSave: SetupSave;
  saveState: SetupSaveState;
  photoStep: PhotoStep;
  photo: PhotoStepState;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * Holds setup's answers until they are saved, and the photo step. The answers are also kept on the device: iOS stops
 * the app when its photo access changes in Settings, and setup then resumes at the same step. The photo permission is
 * read again whenever the app returns to the foreground, so the step and the recap show the access the device has.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id ?? null;
  const [flow, setFlow] = useState<OnboardingFlow | null>(null);
  const [photoStep] = useState(() => createPhotoStep(devicePhotos));
  const photo = useSyncExternalStore(photoStep.subscribe, photoStep.getState);
  const setupSave = useMemo(
    () =>
      createSetupSave({
        settings: client.financePreferences,
        // A fresh setup check also updates the root guard's answer, which swaps setup for Home.
        isComplete: () =>
          queryClient.fetchQuery({ ...orpc.financePreferences.hasCompletedOnboarding.queryOptions(), staleTime: 0 }),
        forgetDraft: () => (userId ? onboardingDrafts.forget(userId) : Promise.resolve()),
      }),
    [userId]
  );
  const saveState = useSyncExternalStore(setupSave.subscribe, setupSave.getState);

  useEffect(() => {
    if (!userId) return;
    let current = true;
    void onboardingDrafts.load(userId).then((draft) => {
      if (current) setFlow(draft ?? startOnboarding());
    });
    return () => {
      current = false;
    };
  }, [userId]);

  useEffect(() => {
    if (userId && flow) void onboardingDrafts.keep(userId, flow);
  }, [userId, flow]);

  useEffect(() => {
    void photoStep.check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void photoStep.check();
    });
    return () => subscription.remove();
  }, [photoStep]);

  // The draft is one small file; until it is read, setup shows its background rather than the greeting.
  if (!flow) return <View style={{ flex: 1, backgroundColor: theme.background }} />;

  return (
    <OnboardingContext
      value={{
        flow,
        update: (change) => setFlow((current) => (current ? change(current) : current)),
        setupSave,
        saveState,
        photoStep,
        photo,
      }}
    >
      {children}
    </OnboardingContext>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const value = use(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return value;
}
