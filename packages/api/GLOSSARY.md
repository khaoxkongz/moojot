# Finance Import

Shared terms for document candidates and transactions in the user's ledger.

## Language

**Import Candidate**:
A proposed finance entry read from a slip or statement.
The candidate remains unsaved.

**Ready candidate** (`รายการพร้อมบันทึก`):
An Import Candidate with all required data for a FinanceTransaction.
The candidate remains unsaved.

**FinanceTransaction**:
A financial transaction saved in the user's ledger.

**Automatic slip import** (`นำเข้าสลิปอัตโนมัติ`):
Automatic slip import reads a slip image and immediately saves its ready candidate without candidate review.
An image without a transaction produces a skipped outcome.
