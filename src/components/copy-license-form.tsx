"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CopyLicenseForm, CopyLicenseFormSchema, CopyLicense } from "@/lib/copytrade-types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import React from "react";
import { useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";

interface CopyLicenseFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  license?: CopyLicense | null;
  onSuccess: () => void;
}

export default function CopyLicenseForm({ isOpen, setIsOpen, license, onSuccess }: CopyLicenseFormProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const firestore = useFirestore();

  const defaultValues = {
    account_login_mt5: "",
    master_id: "",
    active: true,
    risk_divider: 0,
  };

  const form = useForm<CopyLicenseForm>({
    resolver: zodResolver(CopyLicenseFormSchema),
    defaultValues: license ? {
        account_login_mt5: license.account_login_mt5,
        master_id: license.master_id,
        active: license.active,
        risk_divider: license.risk_divider ?? 0
    } : defaultValues,
  });

  React.useEffect(() => {
    form.reset(license ? {
        account_login_mt5: license.account_login_mt5,
        master_id: license.master_id,
        active: license.active,
        risk_divider: license.risk_divider ?? 0
    } : defaultValues);
  }, [license, form, isOpen]);

  const onSubmit = async (values: CopyLicenseForm) => {
    if (!firestore) {
      toast({ title: "Erro", description: "Firestore não inicializado.", variant: "destructive" });
      return;
    }
    
    setIsPending(true);
    
    try {
      const validatedData = CopyLicenseFormSchema.parse(values);
      const licenseRef = doc(firestore, 'copytrade_licenses', validatedData.account_login_mt5);
      
      const dataToSave = {
        ...validatedData,
        // Add created_at only if it's a new document
        ...(!license && { created_at: new Date().toISOString() }),
      };

      await setDoc(licenseRef, dataToSave, { merge: true });

      toast({
        title: "Sucesso",
        description: `Licença para a conta ${values.account_login_mt5} foi ${license ? 'atualizada' : 'adicionada'}.`,
      });
      setIsOpen(false);
      onSuccess();
      
    } catch(error) {
      console.error("Erro ao salvar licença:", error);
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
      toast({
        title: "Erro ao Salvar",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{license ? "Editar Licença" : "Adicionar Licença de Cópia"}</DialogTitle>
          <DialogDescription>
            {license ? "Atualize os detalhes da licença abaixo." : "Insira os detalhes da nova licença abaixo."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
                control={form.control}
                name="account_login_mt5"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Conta MT5 do Slave</FormLabel>
                    <FormControl>
                        <Input placeholder="1234567" {...field} disabled={!!license} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="master_id"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>ID do Master</FormLabel>
                    <FormControl>
                        <Input placeholder="VILLAR_MASTER_01" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="risk_divider"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Divisor de Risco</FormLabel>
                    <FormControl>
                        <Input 
                            type="number" 
                            placeholder="0" 
                            {...field} 
                            onChange={e => field.onChange(e.target.valueAsNumber || 0)}
                            value={field.value ?? ''}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Licença Ativa</FormLabel>
                    <FormDescription>
                      Permite que esta conta copie as operações.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending || !firestore}>
                {isPending ? 'Salvando...' : 'Salvar Licença'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
