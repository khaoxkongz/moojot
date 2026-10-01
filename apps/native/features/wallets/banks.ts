/** Banks offered for a manual entry before the user has any of their own. Not accounts: a bank groups entries. */
export const commonBanks = ["กสิกรไทย", "ไทยพาณิชย์", "กรุงไทย", "กรุงเทพ", "กรุงศรี", "ทหารไทยธนชาต"] as const;

/** The Thai name of a bank, however it was written (“KBank”, “kasikorn”, “กสิกร”). Unknown names are kept as given. */
export function bankDisplayName(name: string) {
  const key = name
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s._-]+/g, "");
  if (/kbank|kasikorn|กสิกร/.test(key)) return "กสิกรไทย";
  if (/truemoney|ทรูมันนี่|ทรูมันนี/.test(key)) return "ทรูมันนี่";
  if (/krungthai|กรุงไทย|ktb/.test(key)) return "กรุงไทย";
  if (/scb|siamcommercial|ไทยพาณิชย์/.test(key)) return "ไทยพาณิชย์";
  if (/krungsri|^bay$|กรุงศรี/.test(key)) return "กรุงศรี";
  if (/bangkokbank|bbl|ธนาคารกรุงเทพ|กรุงเทพ/.test(key)) return "กรุงเทพ";
  if (/ttb|ทหารไทย|ธนชาต|ทีทีบี/.test(key)) return "ทหารไทยธนชาต";
  return name.trim();
}
