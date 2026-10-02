export type TransactionKind = "income" | "expense" | "transfer";
export type TransactionSource = "manual" | "slip" | "statement" | "recurring";
export type ISODate = string; // YYYY-MM-DD in the device's calendar, without a timezone.
export type PeriodKey = string; // YYYY-MM, identifying the month in which a period starts.

export interface FinanceTransaction {
  id: string;
  kind: TransactionKind;
  amountSatang: number;
  occurredOn: ISODate;
  title: string;
  note: string;
  bank: string | null;
  cardName: string | null;
  cardLast4: string | null;
  slipImageUri: string | null;
  source: TransactionSource;
  categoryId: string | null;
  tagIds: string[];
  recurringRuleId: string | null;
  dedupeKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TransactionInput = Pick<FinanceTransaction, "kind" | "amountSatang" | "occurredOn" | "title"> &
  Partial<
    Pick<
      FinanceTransaction,
      "note" | "bank" | "cardName" | "cardLast4" | "slipImageUri" | "source" | "categoryId" | "tagIds" | "dedupeKey"
    >
  >;

export type TransactionPatch = Partial<TransactionInput>;

export interface WalletCard {
  cardName: string;
  cardLast4: string | null;
}

/** Sources selected in the wallet sheet. Omit this filter to include every transaction. */
export interface WalletFilterSelection {
  banks: string[];
  cards: WalletCard[];
  /** รายการไม่ระบุบัญชี: entries with no bank and no card, however they were recorded. */
  includeUnspecified: boolean;
}

export interface WalletFilterOptions {
  banks: string[];
  cards: WalletCard[];
  canIdentifyDeletedCards: boolean;
}

export interface TransactionFilters {
  from?: ISODate;
  to?: ISODate;
  kind?: TransactionKind;
  bank?: string;
  cardName?: string;
  cardLast4?: string;
  categoryId?: string;
  tagId?: string;
  source?: TransactionSource;
  search?: string;
  walletFilter?: WalletFilterSelection;
  /** "occurred" (default): newest day first. "recorded": the entry recorded last first. */
  sort?: "occurred" | "recorded";
  limit?: number;
  offset?: number;
}

export interface Category {
  id: string;
  name: string;
  kind: "income" | "expense";
  icon: string;
  color: string;
  isSystem: boolean;
  sortOrder: number;
}

export type CategoryInput = Pick<Category, "name" | "kind"> & Partial<Pick<Category, "icon" | "color" | "sortOrder">>;
export type CategoryPatch = Partial<CategoryInput>;

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export type TagInput = Pick<Tag, "name"> & Partial<Pick<Tag, "color">>;
export type TagPatch = Partial<TagInput>;

export interface Budget {
  id: string;
  periodKey: PeriodKey;
  categoryId: string | null;
  tagId: string | null;
  limitSatang: number;
  warningThresholdPercent: number;
  createdAt: string;
  updatedAt: string;
}

export type BudgetInput = Pick<Budget, "periodKey" | "limitSatang"> &
  Partial<Pick<Budget, "categoryId" | "tagId" | "warningThresholdPercent">>;

export interface BudgetStatus {
  budget: Budget;
  spentSatang: number;
  remainingSatang: number;
  percentUsed: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
}

export interface RecurringRule {
  id: string;
  kind: TransactionKind;
  amountSatang: number;
  title: string;
  note: string;
  bank: string | null;
  categoryId: string | null;
  tagIds: string[];
  dayOfMonth: number;
  startsOn: ISODate;
  endsOn: ISODate | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RecurringRuleInput = Pick<RecurringRule, "kind" | "amountSatang" | "title" | "dayOfMonth" | "startsOn"> &
  Partial<Pick<RecurringRule, "note" | "bank" | "categoryId" | "tagIds" | "endsOn" | "isActive">>;

export type RecurringRulePatch = Partial<RecurringRuleInput>;

export interface PeriodBounds {
  periodKey: PeriodKey;
  from: ISODate;
  to: ISODate; // Inclusive.
  endExclusive: ISODate;
}

export interface PeriodSummary {
  from: ISODate;
  to: ISODate;
  incomeSatang: number;
  expenseSatang: number;
  transferSatang: number;
  netSatang: number;
  transactionCount: number;
}

export interface CategoryBreakdownItem {
  categoryId: string | null;
  categoryName: string;
  icon: string;
  color: string;
  totalSatang: number;
  transactionCount: number;
  percentage: number;
}

export interface TagBreakdownItem {
  tagId: string | null;
  tagName: string;
  color: string;
  totalSatang: number;
  transactionCount: number;
}

export interface TrendItem extends PeriodSummary {
  periodKey: PeriodKey;
  label: string;
}
