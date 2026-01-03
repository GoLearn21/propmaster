/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Balance Sync Trigger - Single Source of Truth
 *
 * CRITICAL FIX: This trigger ensures tenant.balance_due is ALWAYS
 * synchronized with the authoritative journal_postings data.
 *
 * TITANIUM RULES ENFORCED:
 * 1. balance_due is ONLY updated via this trigger (never directly)
 * 2. All balance calculations use the accounting system as source of truth
 * 3. Trigger fires after every journal_posting insert
 */

-- Function to update tenant balance from journal postings
CREATE OR REPLACE FUNCTION sync_tenant_balance_from_journal()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_new_balance DECIMAL(15,4);
BEGIN
    -- Get the tenant_id from the posting
    v_tenant_id := NEW.tenant_id;

    -- Skip if no tenant associated with this posting
    IF v_tenant_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Calculate the authoritative balance from dimensional_balances
    -- (O(1) read - follows TITANIUM rule #3)
    SELECT COALESCE(SUM(balance), 0)
    INTO v_new_balance
    FROM dimensional_balances
    WHERE tenant_id = v_tenant_id;

    -- Update tenant's balance_due to match the accounting truth
    UPDATE tenants
    SET balance_due = v_new_balance,
        updated_at = NOW()
    WHERE id = v_tenant_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on journal_postings
DROP TRIGGER IF EXISTS trg_sync_tenant_balance ON journal_postings;
CREATE TRIGGER trg_sync_tenant_balance
    AFTER INSERT ON journal_postings
    FOR EACH ROW
    WHEN (NEW.tenant_id IS NOT NULL)
    EXECUTE FUNCTION sync_tenant_balance_from_journal();

-- Also create trigger for dimensional_balances updates (backup sync)
CREATE OR REPLACE FUNCTION sync_tenant_balance_from_dimensional()
RETURNS TRIGGER AS $$
BEGIN
    -- Update tenant's balance_due when dimensional_balances changes
    IF NEW.tenant_id IS NOT NULL THEN
        UPDATE tenants
        SET balance_due = (
            SELECT COALESCE(SUM(balance), 0)
            FROM dimensional_balances
            WHERE tenant_id = NEW.tenant_id
        ),
        updated_at = NOW()
        WHERE id = NEW.tenant_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_tenant_balance_dimensional ON dimensional_balances;
CREATE TRIGGER trg_sync_tenant_balance_dimensional
    AFTER INSERT OR UPDATE ON dimensional_balances
    FOR EACH ROW
    WHEN (NEW.tenant_id IS NOT NULL)
    EXECUTE FUNCTION sync_tenant_balance_from_dimensional();

-- Add comment explaining the trigger
COMMENT ON FUNCTION sync_tenant_balance_from_journal() IS
'TITANIUM: Syncs tenant.balance_due from authoritative accounting data.
This trigger enforces single source of truth for tenant balances.
NEVER update balance_due directly - let the accounting system handle it.';

COMMENT ON TRIGGER trg_sync_tenant_balance ON journal_postings IS
'Automatically syncs tenant balance when journal entries are posted';
