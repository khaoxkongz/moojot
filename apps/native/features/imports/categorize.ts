import type { Category, FinanceTransaction, TransactionKind } from "@/types/finance";

const rules: [string, RegExp][] = [
  ["expense-food", /กาแฟ|คาเฟ่|อาหาร|ข้าว|ชา|ร้านอาหาร|coffee|cafe|restaurant|food|7.?eleven|เซเว่น/i],
  ["expense-transport", /เดินทาง|รถไฟ|แท็กซี่|วิน|เติมน้ำมัน|bts|mrt|taxi|grab|fuel|petrol/i],
  ["expense-shopping", /ช้อป|ซื้อของ|ห้าง|lazada|shopee|shopping|mall/i],
  ["expense-essentials", /ของใช้จำเป็น|ของใช้ประจำวัน|ทิชชู่|สบู่|แชมพู|detergent|toiletries/i],
  [
    "expense-home",
    /ค่าเช่า|บ้าน|คอนโด|เฟอร์นิเจอร์|ค่าน้ำ|ค่าไฟ|อินเทอร์เน็ต|โทรศัพท์|ค่าบริการ|rent|home|furniture|bill|internet|electric|subscription/i,
  ],
  ["expense-bills", /บัตรเครดิต|ผ่อนบัตร|ชำระหนี้|ดอกเบี้ย|สินเชื่อ|credit card|loan|interest/i],
  ["expense-health", /โรงพยาบาล|ยา|คลินิก|หมอ|hospital|clinic|pharmacy/i],
  ["expense-fun", /หนัง|คอนเสิร์ต|เกม|netflix|cinema|movie|concert/i],
  ["expense-education", /หนังสือ|เรียน|คอร์ส|school|course|tuition|book/i],
  ["income-salary", /เงินเดือน|salary|payroll/i],
  ["income-extra", /ค่าจ้าง|ฟรีแลนซ์|งานพิเศษ|wage|freelance/i],
  ["income-business", /ขายของ|รายได้ร้าน|ค้าขาย|ยอดขาย|sales|business/i],
  ["income-refund", /เงินคืน|คืนเงิน|refund|cashback/i],
  ["income-gift", /ของขวัญ|gift/i],
];

export function suggestCategory(
  title: string,
  kind: TransactionKind,
  categories: Category[],
  history: FinanceTransaction[]
) {
  if (kind === "transfer") return null;
  const normalized = title.trim().toLocaleLowerCase();
  if (!normalized) return null;
  const categoryIds = new Set(categories.filter((category) => category.kind === kind).map((category) => category.id));
  const learned = history.find(
    (item) =>
      item.kind === kind &&
      item.categoryId &&
      categoryIds.has(item.categoryId) &&
      item.title.trim().toLocaleLowerCase() === normalized
  );
  if (learned?.categoryId) return learned.categoryId;
  const rule = rules.find(([id, pattern]) => categoryIds.has(id) && pattern.test(normalized));
  return rule?.[0] ?? null;
}
