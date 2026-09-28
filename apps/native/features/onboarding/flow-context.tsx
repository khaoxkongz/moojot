import { createContext, use, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

import type { Choice } from "@/features/onboarding/components/onboarding-controls";

type OnboardingFlow = {
  birthDate: Date | null;
  setBirthDate: Dispatch<SetStateAction<Date | null>>;
  acceptedTerms: boolean;
  setAcceptedTerms: Dispatch<SetStateAction<boolean>>;
  personalization: Choice;
  setPersonalization: Dispatch<SetStateAction<Choice>>;
  updates: Choice;
  setUpdates: Dispatch<SetStateAction<Choice>>;
  reasons: string[];
  setReasons: Dispatch<SetStateAction<string[]>>;
};

const OnboardingFlowContext = createContext<OnboardingFlow | null>(null);

export function OnboardingFlowProvider({ children }: { children: ReactNode }) {
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [personalization, setPersonalization] = useState<Choice>(null);
  const [updates, setUpdates] = useState<Choice>(null);
  const [reasons, setReasons] = useState<string[]>([]);

  return (
    <OnboardingFlowContext.Provider
      value={{
        birthDate,
        setBirthDate,
        acceptedTerms,
        setAcceptedTerms,
        personalization,
        setPersonalization,
        updates,
        setUpdates,
        reasons,
        setReasons,
      }}
    >
      {children}
    </OnboardingFlowContext.Provider>
  );
}

export function useOnboardingFlow(): OnboardingFlow {
  const flow = use(OnboardingFlowContext);
  if (!flow) throw new Error("useOnboardingFlow must be used inside OnboardingFlowProvider");
  return flow;
}
