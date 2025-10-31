
"use client";

import * as React from "react";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlusCircle, Search, AlertCircle, Loader2, FileDown } from "lucide-react";
import { Client } from "@/lib/types";
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
import { useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function ClientTable() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const clientsQuery = useMemoFirebase(() => {
    // Aguarda o usuário e o firestore estarem prontos
    if (!firestore || !user) return null;
    return query(collection(firestore, "clients"));
  }, [firestore, user]);

  const { data: clients, isLoading: isCollectionLoading, error } = useCollection<Client>(clientsQuery);
  
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

  const handleExportJson = () => {
    if (!filteredClients || filteredClients.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há clientes para serem exportados.",
        variant: "destructive"
      });
      return;
    }

    const jsonString = JSON.stringify(filteredClients, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exportação Concluída",
      description: `${filteredClients.length} clientes foram exportados para clientes.json`,
    });
  };

  const filteredClients = React.useMemo(() => {
    if (!clients) return [];
    
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
  
  const isLoading = isUserLoading || (user && isCollectionLoading);

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
    
    if (!user) {
       return (
        <TableRow>
           <TableCell
             colSpan={8}
             className="h-24 text-center text-muted-foreground"
           >
             <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-muted-foreground" />
                <span>Aguardando autenticação do Firebase...</span>
              </div>
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
              <Button onClick={handleExportJson} variant="outline" className="w-full sm:w-auto">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar JSON
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
