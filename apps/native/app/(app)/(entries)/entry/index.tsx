import { Redirect, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { EntryEditor } from "@/features/entries/components/entry-editor";
import { blankEntryDraft } from "@/features/entries/entry-draft";
import { isValidISODate, todayISO } from "@/utils/format";

type Params = {
  id?: string | string[];
  /** Prefills, such as the photo date of a slip to record by hand or the card a card screen started from. */
  occurredOn?: string;
  bank?: string;
  cardName?: string;
  cardLast4?: string;
};

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default function CreateEntryRoute() {
  const params = useLocalSearchParams<Params>();
  const legacyId = one(params.id);
  const [initialDraft] = useState(() => {
    const today = todayISO();
    const occurredOn = one(params.occurredOn);
    return {
      ...blankEntryDraft(today),
      occurredOn: occurredOn && isValidISODate(occurredOn) && occurredOn <= today ? occurredOn : today,
      bank: one(params.bank) ?? "",
      cardName: one(params.cardName) ?? "",
      cardLast4: one(params.cardLast4) ?? "",
    };
  });
  if (legacyId) return <Redirect href={{ pathname: "/entry/[id]", params: { id: legacyId } }} />;
  return <EntryEditor mode="create" initialDraft={initialDraft} />;
}
