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

export function formatFundRequestTransferText(
  req: {
    agent?: { full_name?: string } | null;
    wallet?: { phone_number?: string } | null;
    amount_requested?: number | string | null;
    is_multi_wallet?: boolean;
    multi_wallet_data?: any;
  },
  specificWallet?: { phone_number?: string; amount?: number | string }
): string {
  const agentName = req.agent?.full_name?.trim() || "موظف";

  if (specificWallet && specificWallet.phone_number) {
    const phone = specificWallet.phone_number.trim();
    const amt = Math.round(Number(specificWallet.amount || 0));
    return `${agentName}\n${phone}\n${amt}`;
  }

  if (req.is_multi_wallet && Array.isArray(req.multi_wallet_data)) {
    const validWallets = req.multi_wallet_data.filter((w: any) => w && !w.__audit);
    if (validWallets.length === 1) {
      const phone = validWallets[0].phone_number?.trim() || "";
      const amt = Math.round(Number(validWallets[0].amount_requested || validWallets[0].amount || req.amount_requested || 0));
      return `${agentName}\n${phone}\n${amt}`;
    } else if (validWallets.length > 1) {
      const lines = [agentName];
      validWallets.forEach((w: any) => {
        const phone = w.phone_number?.trim() || "";
        const amt = Math.round(Number(w.amount_requested || w.amount || 0));
        lines.push(phone);
        lines.push(String(amt));
      });
      return lines.join("\n");
    }
  }

  const phone = req.wallet?.phone_number?.trim() || "";
  const amt = Math.round(Number(req.amount_requested || 0));
  return `${agentName}\n${phone}\n${amt}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Copy failed:", err);
    return false;
  }
}

