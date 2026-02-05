"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { CopyLicense } from "@/lib/copytrade-types";
import { useFirestore } from "@/firebase";
import { doc, deleteDoc } from "firebase/firestore";


interface CopyLicenseActionsProps {
  license: CopyLicense;
  onEdit: (license: CopyLicense) => void;
  onDeleteSuccess: () => void;
}

export default function CopyLicenseActions({ license, onEdit, onDeleteSuccess }: CopyLicenseActionsProps) {
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const firestore = useFirestore();

  const handleDelete = async () => {
    if (!firestore) {
      toast({ title: "Erro", description: "Firestore não inicializado.", variant: "destructive" });
      return;
    }
    setIsPending(true);
    try {
      const licenseRef = doc(firestore, 'copytrade_licenses', license.account_login_mt5);
      await deleteDoc(licenseRef);
      
      toast({
          title: "Licença Excluída",
          description: `A licença para a conta ${license.account_login_mt5} foi excluída.`,
      });
      onDeleteSuccess();

    } catch (error) {
      console.error("Erro ao excluir licença:", error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível excluir a licença.";
      toast({
          title: "Erro ao Excluir",
          description: errorMessage,
          variant: "destructive",
      });
    } finally {
      setIsPending(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={!firestore}>
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(license.account_login_mt5)}>
            Copiar Nº da Conta
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onEdit(license)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. Isso excluirá permanentemente a licença de cópia para a conta <span className="font-bold">{license.account_login_mt5}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending || !firestore} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            {isPending ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
