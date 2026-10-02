/**
 * A bank groups entries; it is not an account. Entries store a bank's identity, the short name slips and older data
 * already use (“KBank”, “SCB”), and screens show its Thai name. Older rows may hold another spelling of the same bank
 * (“กสิกรไทย”, “kasikorn”), so selection and filters work on groups of spellings, never on one exact string.
 */
const knownBanks = [
  { id: "KBank", name: "กสิกรไทย", pattern: /kbank|kasikorn|กสิกร/ },
  { id: "TrueMoney", name: "ทรูมันนี่", pattern: /truemoney|ทรูมันนี/ },
  { id: "KTB", name: "กรุงไทย", pattern: /krungthai|กรุงไทย|ktb/ },
  { id: "SCB", name: "ไทยพาณิชย์", pattern: /scb|siamcommercial|ไทยพาณิชย์/ },
  { id: "Krungsri", name: "กรุงศรี", pattern: /krungsri|^bay$|กรุงศรี/ },
  { id: "BBL", name: "กรุงเทพ", pattern: /bangkokbank|bbl|ธนาคารกรุงเทพ|กรุงเทพ/ },
  { id: "ttb", name: "ทหารไทยธนชาต", pattern: /ttb|ทหารไทย|ธนชาต|ทีทีบี/ },
] as const;

/** Banks offered for a manual entry before the user has any of their own, by identity. */
export const commonBanks = ["KBank", "SCB", "KTB", "BBL", "Krungsri", "ttb"] as const;

function knownBank(name: string) {
  const key = name
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s._-]+/g, "");
  return knownBanks.find((bank) => bank.pattern.test(key));
}

/** The identity an entry stores for a bank, however it was written. Unknown names are kept as given. */
export function bankId(name: string) {
  return knownBank(name)?.id ?? name.trim();
}

/** The Thai name of a bank, however it was written (“KBank”, “kasikorn”, “กสิกร”). Unknown names are kept as given. */
export function bankDisplayName(name: string) {
  return knownBank(name)?.name ?? name.trim();
}

/** One row of the bank filter: every stored spelling of one bank, so selecting it matches all of them. */
export type BankFilterGroup = { id: string; label: string; banks: string[] };

/** Stored bank names grouped by bank, in the order the names first appear. */
export function bankFilterGroups(names: readonly string[]): BankFilterGroup[] {
  const groups = new Map<string, BankFilterGroup>();
  for (const name of names) {
    if (!name.trim()) continue;
    const id = bankId(name);
    const group = groups.get(id) ?? { id, label: bankDisplayName(name), banks: [] };
    if (!group.banks.includes(name)) group.banks.push(name);
    groups.set(id, group);
  }
  return [...groups.values()];
}

/**
 * Whether a search term names the bank a stored spelling belongs to: by that spelling, the bank's identity, its Thai
 * name, or one of its known spellings, so "กสิกร" finds rows stored as "KBank" and "kbank" finds "กสิกรไทย".
 */
export function bankMatchesSearch(storedName: string, term: string) {
  const needle = term.trim().toLocaleLowerCase();
  if (!needle) return false;
  const names = [storedName, bankId(storedName), bankDisplayName(storedName)];
  if (names.some((name) => name.toLocaleLowerCase().includes(needle))) return true;
  const bank = knownBank(storedName);
  return bank !== undefined && knownBank(term)?.id === bank.id;
}
