export const slipAlbumSources = [
  { id: "krungthai", name: "Krungthai NEXT" },
  { id: "kplus", name: "K PLUS" },
  { id: "paotang", name: "Paotang" },
  { id: "truemoney", name: "TrueMoney" },
] as const;

export type SlipAlbumSourceId = (typeof slipAlbumSources)[number]["id"];

export const dayInMilliseconds = 24 * 60 * 60 * 1000;
export const slipLookbackDays = 30;

export function sourceForAlbum(title: string): SlipAlbumSourceId | null {
  const normalized = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s._-]+/g, "");
  if (normalized === "krungthainext" || normalized === "กรุงไทย") return "krungthai";
  if (normalized === "kplus" || normalized === "กสิกร") return "kplus";
  if (normalized === "paotang" || normalized === "เป๋าตัง") return "paotang";
  if (normalized === "truemoney" || normalized === "ทรูมันนี่") return "truemoney";
  return null;
}
