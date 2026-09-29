import type { Category, FinanceTransaction, Tag } from "../../types/finance";

function csvCell(value: string): string {
  // A CSV may be opened in Excel or Sheets. Keep user-entered text from becoming a formula.
  const safe = /^\s*[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function bahtFromSatang(value: number): string {
  const whole = Math.floor(value / 100);
  const fraction = value % 100;
  return `${whole}.${String(fraction).padStart(2, "0")}`;
}

export function transactionsToCsv(transactions: FinanceTransaction[], categories: Category[], tags: Tag[]): string {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const tagNames = new Map(tags.map((tag) => [tag.id, tag.name]));
  const rows = [
    ["วันที่", "ประเภท", "จำนวนเงิน (บาท)", "รายการ", "หมวดหมู่", "แท็ก", "ธนาคาร", "หมายเหตุ", "ที่มา"],
    ...transactions.map((transaction) => [
      transaction.occurredOn,
      transaction.kind === "income" ? "รายรับ" : transaction.kind === "expense" ? "รายจ่าย" : "ย้ายเงิน",
      bahtFromSatang(transaction.amountSatang),
      transaction.title,
      transaction.categoryId ? (categoryNames.get(transaction.categoryId) ?? "") : "",
      transaction.tagIds
        .map((id) => tagNames.get(id) ?? "")
        .filter(Boolean)
        .join("; "),
      transaction.bank ?? "",
      transaction.note,
      transaction.source,
    ]),
  ];

  // BOM makes Thai text display correctly in common versions of Excel.
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
