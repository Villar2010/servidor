
"use client";

import * as React from "react";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlusCircle, Search, AlertCircle, Loader2, FileJson } from "lucide-react";
import { Client, ClientSchema } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ClientForm from "./client-form";
import ClientTableActions from "./client-table-actions";
import { Input } from "./ui/input";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, writeBatch, doc } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function ClientTable() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const { toast } = useToast();
  const [isImporting, setIsImporting] = React.useState(false);

  const firestore = useFirestore();

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "clients"));
  }, [firestore]);

  const { data: clients, isLoading, error } = useCollection<Client>(clientsQuery);
  
  const handleAddClient = () => {
    setSelectedClient(null);
    setIsFormOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };

  const handleSuccess = () => {
     // A UI irá re-renderizar automaticamente por causa do listener do useCollection
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!firestore) {
      toast({ title: "Erro", description: "Firestore não inicializado.", variant: "destructive" });
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("Não foi possível ler o arquivo.");
        }
        const clientsToImport = JSON.parse(text);

        if (!Array.isArray(clientsToImport)) {
            throw new Error("O arquivo JSON deve conter um array de clientes.");
        }

        const batch = writeBatch(firestore);
        
        clientsToImport.forEach((clientData: any) => {
          try {
            // Garante que o lastUpdate seja uma string
            const clientWithUpdate = {
              ...clientData,
              lastUpdate: new Date().toISOString(),
            };
            
            const validatedData = ClientSchema.parse(clientWithUpdate);
            const docRef = doc(firestore, "clients", validatedData.accountNumber);
            batch.set(docRef, validatedData, { merge: true });
          } catch(validationError) {
             // Pula registros inválidos e loga o erro
             console.warn(`Registro inválido pulado durante a importação: ${clientData.accountNumber}`, validationError);
          }
        });

        await batch.commit();
        toast({
          title: "Importação Concluída",
          description: `${clientsToImport.length} clientes foram importados/atualizados com sucesso.`,
        });
      } catch (err) {
        console.error("Erro na importação:", err);
        const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
        toast({
          title: "Erro na Importação",
          description: `Não foi possível importar os clientes. Verifique o formato do arquivo. Detalhes: ${errorMessage}`,
          variant: "destructive",
        });
      } finally {
        setIsImporting(false);
         // Limpa o valor do input para permitir re-importar o mesmo arquivo
         event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const filteredClients = React.useMemo(() => {
    if (!clients) return [];
    
    // Ordena os clientes pela data de atualização (mais recente primeiro)
    const sortedClients = [...clients].sort((a, b) => {
      const dateA = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0;
      const dateB = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0;
      return dateB - dateA;
    });

    return sortedClients.filter(client => {
        const term = searchTerm.toLowerCase();
        return (
            client.accountNumber.toLowerCase().includes(term) ||
            (client.name && client.name.toLowerCase().includes(term)) ||
            (client.brokerServer && client.brokerServer.toLowerCase().includes(term))
        );
    });

  }, [clients, searchTerm]);

  // Função para formatar moeda
  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  const renderTableContent = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={8}>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
       return (
        <TableRow>
          <TableCell colSpan={8}>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro ao Carregar Clientes</AlertTitle>
              <AlertDescription>
                Não foi possível buscar os dados do Firestore. Verifique as regras de segurança e a conexão.
                <pre className="mt-2 text-xs whitespace-pre-wrap">{error.message}</pre>
              </AlertDescription>
            </Alert>
          </TableCell>
        </TableRow>
       );
    }
    
    if (!filteredClients || filteredClients.length === 0) {
      return (
         <TableRow>
            <TableCell
              colSpan={8}
              className="h-24 text-center text-muted-foreground"
            >
              {searchTerm ? "Nenhum cliente encontrado com os critérios de busca." : "Nenhum cliente cadastrado."}
            </TableCell>
          </TableRow>
      );
    }

    return filteredClients.map((client) => (
      <TableRow key={client.accountNumber}>
        <TableCell>
          <Badge
            variant={
              client.status === "Liberado"
                ? "default"
                : "destructive"
            }
            className={client.status === "Liberado" ? "bg-accent text-accent-foreground" : ""}
          >
            {client.status}
          </Badge>
        </TableCell>
        <TableCell className="font-medium">
          {client.accountNumber}
        </TableCell>
          <TableCell className="hidden md:table-cell">{client.name || "-"}</TableCell>
        <TableCell className="hidden lg:table-cell">
          {client.brokerServer}
        </TableCell>
        <TableCell className="text-right font-mono">{formatCurrency(client.balanceNet)}</TableCell>
        <TableCell className="text-center font-mono">{client.openTradesCount ?? '-'}</TableCell>
        <TableCell className="hidden sm:table-cell">
          {client.lastUpdate ? formatDistanceToNow(new Date(client.lastUpdate), { addSuffix: true, locale: ptBR }) : '-'}
        </TableCell>
        <TableCell>
          <ClientTableActions client={client} onEdit={handleEditClient} onDeleteSuccess={handleSuccess} />
        </TableCell>
      </TableRow>
    ))
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle>Clientes</CardTitle>
              <CardDescription>
                Uma lista de todos os clientes registrados e o status de suas licenças.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
               <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Pesquisar por conta, nome..."
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
               <Button asChild variant="outline" className="w-full sm:w-auto">
                <label htmlFor="import-json" className="cursor-pointer">
                  {isImporting ? <Loader2 className="mr-2 animate-spin" /> : <FileJson className="mr-2" />}
                   Importar de JSON
                   <input
                    id="import-json"
                    type="file"
                    accept=".json"
                    className="sr-only"
                    onChange={handleImport}
                    disabled={isImporting}
                  />
                </label>
              </Button>
              <Button onClick={handleAddClient} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Cliente
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="hidden md:table-cell">Nome</TableHead>
                  <TableHead className="hidden lg:table-cell">Corretora</TableHead>
                  <TableHead className="text-right">Saldo Líq.</TableHead>
                  <TableHead className="text-center">Ordens</TableHead>
                  <TableHead className="hidden sm:table-cell">Última Atualização</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderTableContent()}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ClientForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        client={selectedClient}
        onSuccess={handleSuccess}
      />
    </>
  );
}

    