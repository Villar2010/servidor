"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Client, ClientSchema } from "@/lib/types";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "./ui/scroll-area";
import React from "react";
import { useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";

interface ClientFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  client?: Client | null;
  onSuccess: () => void; // Callback para notificar sucesso
}

export default function ClientForm({ isOpen, setIsOpen, client, onSuccess }: ClientFormProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const firestore = useFirestore();

  const form = useForm<Client>({
    resolver: zodResolver(ClientSchema),
    defaultValues: client || {
      accountNumber: "",
      name: "",
      email: "",
      brokerServer: "",
      status: "Bloqueado",
      balanceGross: 0,
      balanceNet: 0,
      openTradesCount: 0,
      openTradesProfit: 0,
      totalInBRL: 0,
    },
  });

  React.useEffect(() => {
    form.reset(client || {
      accountNumber: "",
      name: "",
      email: "",
      brokerServer: "",
      status: "Bloqueado",
      balanceGross: 0,
      balanceNet: 0,
      openTradesCount: 0,
      openTradesProfit: 0,
      totalInBRL: 0,
    });
  }, [client, form, isOpen]);

  const onSubmit = async (values: Client) => {
    if (!firestore) {
      toast({ title: "Erro", description: "Firestore não inicializado. A conexão pode estar sendo estabelecida.", variant: "destructive" });
      return;
    }
    
    setIsPending(true);
    
    try {
      const validatedData = ClientSchema.parse(values);
      const clientRef = doc(firestore, 'clients', validatedData.accountNumber);
      
      const dataToSave = {
        ...validatedData,
        lastUpdate: new Date().toISOString(),
      };

      await setDoc(clientRef, dataToSave, { merge: true });

      toast({
        title: "Sucesso",
        description: `Cliente ${values.accountNumber} foi ${client ? 'atualizado' : 'adicionado'}.`,
      });
      setIsOpen(false);
      onSuccess();
      
    } catch(error) {
      console.error("Erro ao salvar cliente:", error);
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{client ? "Editar Cliente" : "Adicionar Novo Cliente"}</DialogTitle>
          <DialogDescription>
            {client ? "Atualize os detalhes do cliente abaixo." : "Insira os detalhes do novo cliente abaixo."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[60vh] pr-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número da Conta</FormLabel>
                        <FormControl>
                          <Input placeholder="12345678" {...field} disabled={!!client} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="brokerServer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Servidor da Corretora</FormLabel>
                        <FormControl>
                          <Input placeholder="Corretora-Live01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Cliente</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john.doe@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Liberado">Liberado</SelectItem>
                          <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              
                <h3 className="text-lg font-medium pt-4">Finanças (Opcional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="balanceGross"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Saldo Bruto</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10000.00" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="balanceNet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Saldo Líquido</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="9500.00" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="openTradesCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Negociações Abertas</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="5" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="openTradesProfit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lucro de Negociações Abertas</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="500.00" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="totalInBRL"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total (BRL)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="50000.00" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-6">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending || !firestore}>
                {isPending ? 'Salvando...' : 'Salvar Cliente'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
