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

// Schema for a slave's license
export const CopyLicenseSchema = z.object({
    active: z.boolean(),
    master_id: z.string(),
    risk_divider: z.number().default(0),
    created_at: z.string(),
    last_check: z.string().optional(),
});

export type CopyLicense = z.infer<typeof CopyLicenseSchema>;
