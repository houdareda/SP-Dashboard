-- ==============================================================================
-- Shift Point Dashboard - High Performance Database Indexes
-- Run this script in Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Daily Expenses Indexes (Accelerates overview cards, custody, and history queries)
CREATE INDEX IF NOT EXISTS idx_daily_expenses_agent_date 
  ON public.daily_expenses(agent_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_expenses_date 
  ON public.daily_expenses(expense_date DESC);

-- 2. Fund Requests Indexes (Accelerates approved funds, wallet balances, and custody)
CREATE INDEX IF NOT EXISTS idx_fund_requests_agent_status 
  ON public.fund_requests(agent_id, status);

CREATE INDEX IF NOT EXISTS idx_fund_requests_wallet_status_date 
  ON public.fund_requests(wallet_id, status, request_date);

CREATE INDEX IF NOT EXISTS idx_fund_requests_date 
  ON public.fund_requests(request_date DESC);

-- 3. Expense Transfers Indexes (Accelerates custody transfer calculations)
CREATE INDEX IF NOT EXISTS idx_expense_transfers_from_agent 
  ON public.expense_transfers(from_agent_id);

CREATE INDEX IF NOT EXISTS idx_expense_transfers_to_agent 
  ON public.expense_transfers(to_agent_id);

CREATE INDEX IF NOT EXISTS idx_expense_transfers_expense_id 
  ON public.expense_transfers(expense_id);

-- 4. Wallets & Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_agent 
  ON public.wallets(agent_id);

CREATE INDEX IF NOT EXISTS idx_profiles_role_active 
  ON public.profiles(role, is_active);
