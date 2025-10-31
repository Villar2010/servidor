import { z } from 'zod';

export const ClientSchema = z.object({
  accountNumber: z.string().min(1, "O número da conta é obrigatório."),
  name: z.string().optional(),
  email: z.string().email("Endereço de e-mail inválido.").optional().or(z.literal('')),
  brokerServer: z.string().min(1, "O servidor da corretora é obrigatório."),
  status: z.enum(['Liberado', 'Bloqueado']),
  balanceGross: z.coerce.number().optional().default(0),
  balanceNet: z.coerce.number().optional().default(0),
  openTradesCount: z.coerce.number().optional().default(0),
  openTradesProfit: z.coerce.number().optional().default(0),
  totalInBRL: z.coerce.number().optional().default(0),
  lastUpdate: z.string().optional(),
});

export type Client = z.infer<typeof ClientSchema>;

// Esquema de entrada para a validação (não depende mais de um flow)
export const ValidateClientAuthorizationInputSchema = z.object({
  accountNumber: z.string(),
  brokerServer: z.string(),
});
export type ValidateClientAuthorizationInput = z.infer<typeof ValidateClientAuthorizationInputSchema>;


// Esquema de saída para a validação
export const ValidateClientAuthorizationOutputSchema = z.object({
  status: z.enum(['authorized', 'blocked']).describe("O resultado da validação de autorização."),
  reason: z.string().describe("A justificativa para o status de autorização."),
});
export type ValidateClientAuthorizationOutput = z.infer<typeof ValidateClientAuthorizationOutputSchema>;
