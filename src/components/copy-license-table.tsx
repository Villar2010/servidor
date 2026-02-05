"use client";

import * as React from "react";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlusCircle, Search, AlertCircle, Loader2 } from "lucide-react";
import { CopyLicense } from "@/lib/copytrade-types";
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
import CopyLicenseForm from "./copy-license-form";
import CopyLicenseActions from "./copy-license-actions";
import { Input } from "./ui/input";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export default function CopyLicenseTable() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedLicense, setSelectedLicense] = React.useState<CopyLicense | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const licensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "copytrade_licenses"));
  }, [firestore, user]);

  const { data: licenses, isLoading: isCollectionLoading, error } = useCollection<CopyLicense>(licensesQuery);
  
  const handleAddLicense = () => {
    setSelectedLicense(null);
    setIsFormOpen(true);
  };

  const handleEditLicense = (license: CopyLicense) => {
    setSelectedLicense(license);
    setIsFormOpen(true);
  };

  const handleSuccess = () => {
     // A UI irá re-renderizar automaticamente por causa do listener do useCollection
  };

  const filteredLicenses = React.useMemo(() => {
    if (!licenses) return [];
    
    // Enrich data with the document ID
    const enrichedLicenses = licenses.map(l => ({ ...l, account_login_mt5: l.id }));
    
    const sortedLicenses = [...enrichedLicenses].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    return sortedLicenses.filter(license => {
        const term = searchTerm.toLowerCase();
        return (
            license.account_login_mt5.toLowerCase().includes(term) ||
            (license.master_id && license.master_id.toLowerCase().includes(term))
        );
    });

  }, [licenses, searchTerm]);

  const isLoading = isUserLoading || (user && isCollectionLoading);

  const renderTableContent = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={6}>
            <div className="space-y-2">
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
          <TableCell colSpan={6}>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro ao Carregar Licenças</AlertTitle>
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
             colSpan={6}
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

    if (!filteredLicenses || filteredLicenses.length === 0) {
      return (
         <TableRow>
            <TableCell
              colSpan={6}
              className="h-24 text-center text-muted-foreground"
            >
              {searchTerm ? "Nenhuma licença encontrada com os critérios de busca." : "Nenhuma licença de cópia cadastrada."}
            </TableCell>
          </TableRow>
      );
    }

    return filteredLicenses.map((license) => (
      <TableRow key={license.account_login_mt5}>
        <TableCell>
          <Badge
            variant={license.active ? "default" : "secondary"}
            className={license.active ? "bg-accent text-accent-foreground" : ""}
          >
            {license.active ? "Ativa" : "Inativa"}
          </Badge>
        </TableCell>
        <TableCell className="font-medium">
          {license.account_login_mt5}
        </TableCell>
        <TableCell className="hidden md:table-cell">{license.master_id || "-"}</TableCell>
        <TableCell className="font-mono">{license.risk_divider ?? '0'}</TableCell>
        <TableCell className="hidden sm:table-cell">
          {license.last_check ? formatDistanceToNow(new Date(license.last_check), { addSuffix: true, locale: ptBR }) : 'Nunca'}
        </TableCell>
        <TableCell>
          <CopyLicenseActions license={license} onEdit={handleEditLicense} onDeleteSuccess={handleSuccess} />
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
              <CardTitle>Licenças de Copy Trade</CardTitle>
              <CardDescription>
                Gerencie as contas "slave" que podem copiar as operações de um "master".
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
               <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Pesquisar por conta, master..."
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
              <Button onClick={handleAddLicense} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Licença
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
                  <TableHead>Conta Slave</TableHead>
                  <TableHead className="hidden md:table-cell">Master ID</TableHead>
                  <TableHead>Divisor Risco</TableHead>
                  <TableHead className="hidden sm:table-cell">Última Checagem</TableHead>
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
      <CopyLicenseForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        license={selectedLicense}
        onSuccess={handleSuccess}
      />
    </>
  );
}
