export interface FundRequestEditRecord {
  id: string;
  edited_at: string;
  edited_by: string;
  editor_name: string;
  editor_role: string;
  old_amount: number;
  new_amount: number;
  difference: number;
  old_date: string;
  new_date: string;
  notes: string;
  old_breakdown?: Array<{ wallet_id: string; phone_number?: string; amount_approved: number }>;
  new_breakdown?: Array<{ wallet_id: string; phone_number?: string; amount_approved: number }>;
}

export function extractFundRequestEditHistory(multiWalletData: any): FundRequestEditRecord[] {
  if (!multiWalletData) return [];
  if (Array.isArray(multiWalletData)) {
    const auditObj = multiWalletData.find((x: any) => x && x.__audit);
    return Array.isArray(auditObj?.edit_history) ? auditObj.edit_history : [];
  }
  if (typeof multiWalletData === "object" && Array.isArray(multiWalletData.edit_history)) {
    return multiWalletData.edit_history;
  }
  return [];
}

export function extractFundRequestWallets(req: { is_multi_wallet?: boolean; multi_wallet_data?: any }): any[] {
  if (!req?.is_multi_wallet || !Array.isArray(req.multi_wallet_data)) return [];
  return req.multi_wallet_data.filter((item: any) => item && !item.__audit);
}
