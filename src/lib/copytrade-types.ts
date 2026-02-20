
import { z } from 'zod';

// Schema for an order sent by an EA Master
export const CopyOrderSchema = z.object({
  ticket_master: z.string().min(1, "Ticket do Master é obrigatório"),
  symbol: z.string().min(1, "Símbolo é obrigatório"),
  type: z.enum(['BUY', 'SELL']),
  sl: z.number().optional().default(0),
  tp: z.number().optional().default(0),
  status: z.enum(['OPEN', 'CLOSED']),
});

export type CopyOrder = z.infer<typeof CopyOrderSchema>;

// Schema for the master API endpoint
export const MasterApiSchema = z.object({
    master_id: z.string().min(1),
    order: CopyOrderSchema
});

// Schema for a slave's license document in Firestore
export const CopyLicenseSchema = z.object({
    id: z.string().optional(),
    account_login_mt5: z.string().min(1, "O login da conta MT5 é obrigatório."),
    name: z.string().optional(),
    active: z.boolean(),
    master_id: z.string().min(1, "Master ID é obrigatório"),
    risk_divider: z.coerce.number().default(0),
    created_at: z.string().optional(),
    last_check: z.string().optional(),
});
export type CopyLicense = z.infer<typeof CopyLicenseSchema>;


// Schema for the form used to create/edit a license in the dashboard
export const CopyLicenseFormSchema = z.object({
    account_login_mt5: z.string().min(1, "O login da conta MT5 é obrigatório."),
    name: z.string().optional(),
    master_id: z.string().min(1, "O Master ID é obrigatório."),
    active: z.boolean().default(true),
    risk_divider: z.coerce.number().default(0),
});
export type CopyLicenseForm = z.infer<typeof CopyLicenseFormSchema>;
