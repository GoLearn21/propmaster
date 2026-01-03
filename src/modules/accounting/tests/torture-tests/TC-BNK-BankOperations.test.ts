/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category 15: Bank Operations & Reconciliation
 *
 * Goal: Handle bank rec edge cases, stale checks, escheatment, trust accounting
 * Critical for: Audit compliance, trust account integrity, regulatory requirements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface BankTransaction {
  id: string;
  date: Date;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'fee' | 'interest' | 'transfer';
  cleared: boolean;
  reference: string;
}

interface BookTransaction {
  id: string;
  date: Date;
  amount: number;
  type: 'receipt' | 'disbursement' | 'journal';
  reconciled: boolean;
  bankReference?: string;
}

interface ReconciliationResult {
  bankBalance: number;
  bookBalance: number;
  outstandingDeposits: number;
  outstandingChecks: number;
  adjustedBankBalance: number;
  adjustedBookBalance: number;
  variance: number;
  reconciled: boolean;
}

interface StaleCheck {
  checkNumber: string;
  payee: string;
  amount: number;
  issueDate: Date;
  voidDate?: Date;
  escheatmentDate?: Date;
  status: 'outstanding' | 'voided' | 'escheated' | 'cleared';
}

// Bank Reconciliation Engine
class BankReconciliationEngine {
  reconcile(
    bankStatement: {
      endingBalance: number;
      transactions: BankTransaction[];
    },
    bookRecords: {
      endingBalance: number;
      transactions: BookTransaction[];
    },
    statementDate: Date
  ): ReconciliationResult {
    // Find outstanding deposits (in books, not on bank statement)
    const outstandingDeposits = bookRecords.transactions
      .filter(t => t.type === 'receipt' && !t.reconciled)
      .filter(t => !bankStatement.transactions.some(bt =>
        bt.type === 'deposit' && Math.abs(bt.amount - t.amount) < 0.01
      ))
      .reduce((sum, t) => sum + t.amount, 0);

    // Find outstanding checks (in books, not cleared at bank)
    const outstandingChecks = bookRecords.transactions
      .filter(t => t.type === 'disbursement' && !t.reconciled)
      .filter(t => !bankStatement.transactions.some(bt =>
        bt.type === 'withdrawal' && bt.cleared && Math.abs(bt.amount - t.amount) < 0.01
      ))
      .reduce((sum, t) => sum + t.amount, 0);

    // Adjusted bank balance = bank ending + outstanding deposits - outstanding checks
    const adjustedBankBalance = Math.round(
      (bankStatement.endingBalance + outstandingDeposits - outstandingChecks) * 100
    ) / 100;

    // Find bank charges not in books
    const unreconciledBankFees = bankStatement.transactions
      .filter(t => t.type === 'fee' && !bookRecords.transactions.some(bt =>
        bt.bankReference === t.reference
      ))
      .reduce((sum, t) => sum + t.amount, 0);

    // Find bank interest not in books
    const unreconciledInterest = bankStatement.transactions
      .filter(t => t.type === 'interest' && !bookRecords.transactions.some(bt =>
        bt.bankReference === t.reference
      ))
      .reduce((sum, t) => sum + t.amount, 0);

    // Adjusted book balance = book ending - fees + interest
    const adjustedBookBalance = Math.round(
      (bookRecords.endingBalance - unreconciledBankFees + unreconciledInterest) * 100
    ) / 100;

    const variance = Math.round((adjustedBankBalance - adjustedBookBalance) * 100) / 100;

    return {
      bankBalance: bankStatement.endingBalance,
      bookBalance: bookRecords.endingBalance,
      outstandingDeposits,
      outstandingChecks,
      adjustedBankBalance,
      adjustedBookBalance,
      variance,
      reconciled: Math.abs(variance) < 0.01,
    };
  }
}

// Stale Check Handler
class StaleCheckHandler {
  private staleThresholdDays = 180; // 6 months
  private escheatmentThresholdDays = 365 * 3; // 3 years (varies by state)

  evaluateCheck(check: StaleCheck, asOfDate: Date): {
    isStale: boolean;
    requiresEscheatment: boolean;
    recommendedAction: string;
    daysSinceIssue: number;
  } {
    const daysSinceIssue = Math.floor(
      (asOfDate.getTime() - check.issueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isStale = daysSinceIssue >= this.staleThresholdDays && check.status === 'outstanding';
    const requiresEscheatment = daysSinceIssue >= this.escheatmentThresholdDays &&
      check.status === 'outstanding';

    let recommendedAction: string;
    if (requiresEscheatment) {
      recommendedAction = 'Process escheatment to state unclaimed property';
    } else if (isStale) {
      recommendedAction = 'Contact payee or void and reissue';
    } else {
      recommendedAction = 'No action required';
    }

    return {
      isStale,
      requiresEscheatment,
      recommendedAction,
      daysSinceIssue,
    };
  }

  voidCheck(check: StaleCheck): {
    journalEntry: Array<{ account: string; debit: number; credit: number }>;
    newStatus: StaleCheck['status'];
  } {
    return {
      journalEntry: [
        { account: 'cash', debit: check.amount, credit: 0 },
        { account: 'accounts_payable', debit: 0, credit: check.amount },
      ],
      newStatus: 'voided',
    };
  }

  processEscheatment(check: StaleCheck, state: string): {
    journalEntry: Array<{ account: string; debit: number; credit: number }>;
    reportingRequired: boolean;
    dueDate: Date;
  } {
    // Escheat to state - transfer from AP to liability to state
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 3); // Typical 3-month reporting window

    return {
      journalEntry: [
        { account: 'accounts_payable', debit: check.amount, credit: 0 },
        { account: 'escheatment_liability', debit: 0, credit: check.amount },
      ],
      reportingRequired: true,
      dueDate,
    };
  }
}

// Trust Account Manager
class TrustAccountManager {
  validateTrustBalance(
    trustBankBalance: number,
    tenantDeposits: number,
    prepaidRents: number,
    ownerReserves: number
  ): {
    isCompliant: boolean;
    shortage: number;
    overage: number;
    details: string;
  } {
    const totalLiabilities = tenantDeposits + prepaidRents + ownerReserves;
    const difference = trustBankBalance - totalLiabilities;

    return {
      isCompliant: difference >= 0,
      shortage: difference < 0 ? Math.abs(difference) : 0,
      overage: difference > 0 ? difference : 0,
      details: difference >= 0
        ? `Trust account has $${difference.toFixed(2)} cushion`
        : `CRITICAL: Trust account is $${Math.abs(difference).toFixed(2)} short`,
    };
  }

  threeProngedReconciliation(
    bankBalance: number,
    generalLedgerBalance: number,
    subsidiaryLedgerBalance: number
  ): {
    allMatch: boolean;
    bankVsGL: number;
    bankVsSubsidiary: number;
    glVsSubsidiary: number;
    issues: string[];
  } {
    const bankVsGL = Math.round((bankBalance - generalLedgerBalance) * 100) / 100;
    const bankVsSubsidiary = Math.round((bankBalance - subsidiaryLedgerBalance) * 100) / 100;
    const glVsSubsidiary = Math.round((generalLedgerBalance - subsidiaryLedgerBalance) * 100) / 100;

    const issues: string[] = [];

    if (Math.abs(bankVsGL) > 0.01) {
      issues.push(`Bank vs GL variance: $${bankVsGL}`);
    }
    if (Math.abs(bankVsSubsidiary) > 0.01) {
      issues.push(`Bank vs Subsidiary variance: $${bankVsSubsidiary}`);
    }
    if (Math.abs(glVsSubsidiary) > 0.01) {
      issues.push(`GL vs Subsidiary variance: $${glVsSubsidiary}`);
    }

    return {
      allMatch: issues.length === 0,
      bankVsGL,
      bankVsSubsidiary,
      glVsSubsidiary,
      issues,
    };
  }
}

// Positive Pay Handler
class PositivePayHandler {
  generatePositivePayFile(
    checks: Array<{
      checkNumber: string;
      amount: number;
      payee: string;
      issueDate: Date;
    }>
  ): {
    fileContent: string;
    recordCount: number;
    totalAmount: number;
  } {
    let fileContent = 'CHECK_NUM|AMOUNT|PAYEE|DATE\n';
    let totalAmount = 0;

    for (const check of checks) {
      fileContent += `${check.checkNumber}|${check.amount.toFixed(2)}|${check.payee}|${check.issueDate.toISOString().split('T')[0]}\n`;
      totalAmount += check.amount;
    }

    return {
      fileContent,
      recordCount: checks.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }

  validatePositivePayException(
    presentedCheck: { checkNumber: string; amount: number },
    issuedCheck: { checkNumber: string; amount: number } | null
  ): {
    valid: boolean;
    exceptionType: 'not_issued' | 'amount_mismatch' | 'already_paid' | 'none';
    recommendation: string;
  } {
    if (!issuedCheck) {
      return {
        valid: false,
        exceptionType: 'not_issued',
        recommendation: 'RETURN - Check was never issued',
      };
    }

    if (Math.abs(presentedCheck.amount - issuedCheck.amount) > 0.01) {
      return {
        valid: false,
        exceptionType: 'amount_mismatch',
        recommendation: `REVIEW - Presented: $${presentedCheck.amount}, Issued: $${issuedCheck.amount}`,
      };
    }

    return {
      valid: true,
      exceptionType: 'none',
      recommendation: 'PAY - Check matches issued record',
    };
  }
}

describe('TC-BNK: Bank Operations & Reconciliation Tests', () => {
  describe('TC-BNK-201: Basic Bank Reconciliation', () => {
    it('should reconcile when adjusted balances match', () => {
      const engine = new BankReconciliationEngine();

      const result = engine.reconcile(
        {
          endingBalance: 10000,
          transactions: [], // Deposit not yet at bank - no transactions on bank statement
        },
        {
          endingBalance: 10500, // Book has deposit not yet at bank
          transactions: [
            { id: '1', date: new Date(), amount: 500, type: 'receipt', reconciled: false },
          ],
        },
        new Date()
      );

      expect(result.outstandingDeposits).toBe(500);
      expect(result.adjustedBankBalance).toBe(10500);
      expect(result.reconciled).toBe(true);
    });
  });

  describe('TC-BNK-202: Outstanding Checks Detection', () => {
    it('should identify checks issued but not cleared', () => {
      const engine = new BankReconciliationEngine();

      const result = engine.reconcile(
        {
          endingBalance: 12000,
          transactions: [],
        },
        {
          endingBalance: 10000, // Book lower due to check issued
          transactions: [
            { id: '1', date: new Date(), amount: 2000, type: 'disbursement', reconciled: false },
          ],
        },
        new Date()
      );

      expect(result.outstandingChecks).toBe(2000);
      expect(result.adjustedBankBalance).toBe(10000);
      expect(result.reconciled).toBe(true);
    });
  });

  describe('TC-BNK-203: Reconciliation Variance Detection', () => {
    it('should detect and report variance', () => {
      const engine = new BankReconciliationEngine();

      const result = engine.reconcile(
        { endingBalance: 10000, transactions: [] },
        { endingBalance: 10100, transactions: [] },
        new Date()
      );

      expect(result.variance).toBe(-100);
      expect(result.reconciled).toBe(false);
    });
  });

  describe('TC-BNK-204: Stale Check Detection', () => {
    it('should flag check as stale after 180 days', () => {
      const handler = new StaleCheckHandler();
      const today = new Date();

      const check: StaleCheck = {
        checkNumber: '1001',
        payee: 'Vendor ABC',
        amount: 500,
        issueDate: new Date(today.getTime() - 200 * 24 * 60 * 60 * 1000), // 200 days ago
        status: 'outstanding',
      };

      const result = handler.evaluateCheck(check, today);

      expect(result.isStale).toBe(true);
      expect(result.daysSinceIssue).toBe(200);
      expect(result.recommendedAction).toContain('void');
    });
  });

  describe('TC-BNK-205: Escheatment Requirement', () => {
    it('should flag check for escheatment after 3 years', () => {
      const handler = new StaleCheckHandler();
      const today = new Date();

      const check: StaleCheck = {
        checkNumber: '1002',
        payee: 'Former Tenant',
        amount: 1200,
        issueDate: new Date(today.getTime() - 1100 * 24 * 60 * 60 * 1000), // ~3 years ago
        status: 'outstanding',
      };

      const result = handler.evaluateCheck(check, today);

      expect(result.requiresEscheatment).toBe(true);
      expect(result.recommendedAction).toContain('escheatment');
    });
  });

  describe('TC-BNK-206: Void Check Journal Entry', () => {
    it('should create correct entries when voiding stale check', () => {
      const handler = new StaleCheckHandler();

      const check: StaleCheck = {
        checkNumber: '1003',
        payee: 'Contractor XYZ',
        amount: 750,
        issueDate: new Date('2023-01-01'),
        status: 'outstanding',
      };

      const result = handler.voidCheck(check);

      expect(result.journalEntry[0].account).toBe('cash');
      expect(result.journalEntry[0].debit).toBe(750);
      expect(result.journalEntry[1].account).toBe('accounts_payable');
      expect(result.journalEntry[1].credit).toBe(750);
      expect(result.newStatus).toBe('voided');
    });
  });

  describe('TC-BNK-207: Trust Account Three-Prong Test', () => {
    it('should verify bank, GL, and subsidiary all match', () => {
      const manager = new TrustAccountManager();

      const result = manager.threeProngedReconciliation(
        50000,  // Bank balance
        50000,  // GL balance
        50000   // Subsidiary (sum of tenant deposits)
      );

      expect(result.allMatch).toBe(true);
      expect(result.issues.length).toBe(0);
    });
  });

  describe('TC-BNK-208: Trust Account Shortage Detection', () => {
    it('should flag critical shortage in trust account', () => {
      const manager = new TrustAccountManager();

      const result = manager.validateTrustBalance(
        45000,  // Bank balance
        40000,  // Tenant deposits
        5000,   // Prepaid rents
        2000    // Owner reserves
      );

      // Total liabilities = 47,000, but bank only has 45,000
      expect(result.isCompliant).toBe(false);
      expect(result.shortage).toBe(2000);
      expect(result.details).toContain('CRITICAL');
    });
  });

  describe('TC-BNK-209: Trust Account Overage', () => {
    it('should report overage for investigation', () => {
      const manager = new TrustAccountManager();

      const result = manager.validateTrustBalance(
        55000,  // Bank balance
        40000,  // Tenant deposits
        5000,   // Prepaid rents
        5000    // Owner reserves
      );

      expect(result.isCompliant).toBe(true);
      expect(result.overage).toBe(5000);
    });
  });

  describe('TC-BNK-210: Three-Prong Variance Detection', () => {
    it('should identify which reconciliation is off', () => {
      const manager = new TrustAccountManager();

      const result = manager.threeProngedReconciliation(
        50000,  // Bank
        50000,  // GL
        49500   // Subsidiary (tenant ledger total is short)
      );

      expect(result.allMatch).toBe(false);
      expect(result.glVsSubsidiary).toBe(500);
      expect(result.issues.some(i => i.includes('GL vs Subsidiary'))).toBe(true);
    });
  });

  describe('TC-BNK-211: Positive Pay File Generation', () => {
    it('should generate properly formatted positive pay file', () => {
      const handler = new PositivePayHandler();

      const checks = [
        { checkNumber: '1001', amount: 1500, payee: 'Vendor A', issueDate: new Date('2024-06-01') },
        { checkNumber: '1002', amount: 750.50, payee: 'Vendor B', issueDate: new Date('2024-06-01') },
      ];

      const result = handler.generatePositivePayFile(checks);

      expect(result.recordCount).toBe(2);
      expect(result.totalAmount).toBe(2250.50);
      expect(result.fileContent).toContain('1001|1500.00|Vendor A');
    });
  });

  describe('TC-BNK-212: Positive Pay Exception - Not Issued', () => {
    it('should reject check not in positive pay file', () => {
      const handler = new PositivePayHandler();

      const result = handler.validatePositivePayException(
        { checkNumber: '9999', amount: 5000 },
        null // Check not found
      );

      expect(result.valid).toBe(false);
      expect(result.exceptionType).toBe('not_issued');
      expect(result.recommendation).toContain('RETURN');
    });
  });

  describe('TC-BNK-213: Positive Pay Exception - Amount Mismatch', () => {
    it('should flag amount alteration', () => {
      const handler = new PositivePayHandler();

      const result = handler.validatePositivePayException(
        { checkNumber: '1001', amount: 5000 },
        { checkNumber: '1001', amount: 500 }
      );

      expect(result.valid).toBe(false);
      expect(result.exceptionType).toBe('amount_mismatch');
      expect(result.recommendation).toContain('REVIEW');
    });
  });

  describe('TC-BNK-214: ACH Batch Processing', () => {
    it('should generate balanced ACH batch', () => {
      interface ACHEntry {
        routingNumber: string;
        accountNumber: string;
        amount: number;
        transactionCode: '22' | '32' | '27' | '37'; // Debit/Credit checking/savings
        name: string;
      }

      const generateACHBatch = (entries: ACHEntry[]): {
        totalDebits: number;
        totalCredits: number;
        entryCount: number;
        balanced: boolean;
      } => {
        let totalDebits = 0;
        let totalCredits = 0;

        for (const entry of entries) {
          if (entry.transactionCode === '27' || entry.transactionCode === '37') {
            totalDebits += entry.amount;
          } else {
            totalCredits += entry.amount;
          }
        }

        return {
          totalDebits: Math.round(totalDebits * 100) / 100,
          totalCredits: Math.round(totalCredits * 100) / 100,
          entryCount: entries.length,
          balanced: Math.abs(totalDebits - totalCredits) < 0.01,
        };
      };

      const entries: ACHEntry[] = [
        { routingNumber: '123456789', accountNumber: '1111', amount: 1000, transactionCode: '22', name: 'Owner A' },
        { routingNumber: '987654321', accountNumber: '2222', amount: 500, transactionCode: '22', name: 'Owner B' },
        { routingNumber: '111111111', accountNumber: '3333', amount: 1500, transactionCode: '27', name: 'Company' },
      ];

      const result = generateACHBatch(entries);

      expect(result.totalCredits).toBe(1500);
      expect(result.totalDebits).toBe(1500);
      expect(result.balanced).toBe(true);
    });
  });

  describe('TC-BNK-215: Wire Transfer Verification', () => {
    it('should require dual approval for wires over threshold', () => {
      interface WireRequest {
        amount: number;
        beneficiary: string;
        accountNumber: string;
        approvals: string[];
      }

      const validateWireApproval = (
        request: WireRequest,
        threshold: number
      ): { approved: boolean; requiredApprovals: number; currentApprovals: number } => {
        const requiredApprovals = request.amount >= threshold ? 2 : 1;

        return {
          approved: request.approvals.length >= requiredApprovals,
          requiredApprovals,
          currentApprovals: request.approvals.length,
        };
      };

      const largeWire: WireRequest = {
        amount: 50000,
        beneficiary: 'Major Vendor',
        accountNumber: '1234567890',
        approvals: ['manager-1'], // Only 1 approval
      };

      const result = validateWireApproval(largeWire, 25000);

      expect(result.approved).toBe(false);
      expect(result.requiredApprovals).toBe(2);
    });
  });

  describe('TC-BNK-216: Bank Fee Categorization', () => {
    it('should properly categorize and allocate bank fees', () => {
      interface BankFee {
        description: string;
        amount: number;
        date: Date;
      }

      const categorizeFee = (fee: BankFee): {
        category: string;
        glAccount: string;
        allocateTo: 'property' | 'management_company' | 'split';
      } => {
        const description = fee.description.toLowerCase();

        if (description.includes('wire')) {
          return { category: 'wire_fee', glAccount: 'bank_charges', allocateTo: 'property' };
        }
        if (description.includes('nsf') || description.includes('returned')) {
          return { category: 'nsf_fee', glAccount: 'bank_charges', allocateTo: 'property' };
        }
        if (description.includes('service') || description.includes('monthly')) {
          return { category: 'service_fee', glAccount: 'bank_charges', allocateTo: 'management_company' };
        }
        if (description.includes('ach')) {
          return { category: 'ach_fee', glAccount: 'bank_charges', allocateTo: 'split' };
        }

        return { category: 'other', glAccount: 'bank_charges', allocateTo: 'management_company' };
      };

      const wireFee: BankFee = { description: 'Outgoing Wire Fee', amount: 25, date: new Date() };
      const result = categorizeFee(wireFee);

      expect(result.category).toBe('wire_fee');
      expect(result.allocateTo).toBe('property');
    });
  });
});
