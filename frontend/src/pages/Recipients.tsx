import { useState, useRef } from "react";
import { useRecipients, useUploadRecipients, useDeleteRecipient, useDeleteAllRecipients } from "@/hooks/use-recipients";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import { RecipientDialog } from "@/components/RecipientDialog";
import { NewRecipientDialog } from "@/components/NewRecipientDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Upload, Trash2, MoreHorizontal, Loader2, Download, Trash, Users, Pencil } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Recipients() {
  const { data: recipients, isLoading } = useRecipients();
  const deleteMutation = useDeleteRecipient();
  const deleteAllMutation = useDeleteAllRecipients();
  const uploadMutation = useUploadRecipients();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredRecipients = recipients?.filter((r: any) => 
    r.email.toLowerCase().includes(search.toLowerCase()) ||
    (r.firstName || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.lastName || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const formData = new FormData();
      formData.append("file", e.target.files[0]);
      
      uploadMutation.mutate(formData, {
        onSuccess: (data) => {
          toast({ 
            title: "Upload Successful", 
            description: `Uploaded ${data.count} records successfully`,
          });
          // Clear input so same file can be selected again if needed
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
        onError: (err) => {
          toast({ title: "Upload Failed", description: (err as Error).message, variant: "destructive" });
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this recipient?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast({ title: "Deleted", description: "Recipient removed successfully." })
      });
    }
  };

  const handleExportCSV = () => {
    if (!recipients || recipients.length === 0) {
      toast({ title: "No data", description: "No recipients to export.", variant: "destructive" });
      return;
    }

    // Collect all unique dynamic keys
    const dynamicKeys = new Set<string>();
    recipients.forEach((recipient: any) => {
      Object.keys(recipient.dynamicData).forEach(key => dynamicKeys.add(key));
    });

    // Create CSV headers
    const headers = ['email', 'firstname', 'lastname', ...Array.from(dynamicKeys)];

    // Create CSV rows
    const rows = recipients.map((recipient: any) => [
      recipient.email,
      recipient.firstName || '',
      recipient.lastName || '',
      ...headers.slice(3).map((key: any) => recipient.dynamicData[key] || '')
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map((field: any) => `"${field}"`).join(','))
      .join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'recipients.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to delete ALL recipients? This action cannot be undone.")) {
      // console.log("Frontend: Starting delete all mutation");
      deleteAllMutation.mutate(undefined, {
        onSuccess: () => {
          // console.log("Frontend: Delete all mutation succeeded");
          toast({ title: "Cleared", description: "All recipients removed successfully." })
        },
        onError: (error) => {
          console.error("Frontend: Delete all mutation failed:", error);
          toast({ title: "Error", description: "Failed to clear recipients.", variant: "destructive" })
        }
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <MobileNav />
      
      <main className="flex-1 p-6 md:p-8 lg:p-10 pb-20 md:pb-10">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Recipients</h1>
            <p className="text-muted-foreground mt-2">Manage your email list and dynamic data.</p>
          </div>
          
          <div className="flex gap-1 flex-wrap justify-start">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv,.xlsx,.xls" 
              onChange={handleFileUpload}
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="border-primary/20 hover:bg-primary/5 text-primary px-2 py-1 text-xs h-8"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Download className="w-3 h-3 mr-1" />
              )}
              Import
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 px-2 py-1 text-xs h-8">
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportCSV}
              className="border-green-500/20 hover:bg-green-500/5 text-green-600 px-2 py-1 text-xs h-8"
            >
              <Upload className="w-3 h-3 mr-1" />
              Export
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClearAll}
              disabled={deleteAllMutation.isPending}
              className="border-red-500/20 hover:bg-red-500/5 text-red-600 px-2 py-1 text-xs h-8"
            >
              {deleteAllMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Trash className="w-3 h-3 mr-1" />
              )}
              Clear
            </Button>
          </div>
        </header>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or email..." 
                className="pl-9 bg-background border-border/50 focus:border-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground font-medium ml-auto">
              Total: {filteredRecipients?.length || 0}
            </div>
          </div>

          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow>
                  <TableHead className="w-[250px]">Email</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Dynamic Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted animate-pulse rounded w-3/4" /></TableCell>
                      <TableCell><div className="h-4 bg-muted animate-pulse rounded w-1/2" /></TableCell>
                      <TableCell><div className="h-4 bg-muted animate-pulse rounded w-1/2" /></TableCell>
                      <TableCell><div className="h-4 bg-muted animate-pulse rounded w-full" /></TableCell>
                      <TableCell><div className="h-4 bg-muted animate-pulse rounded w-10" /></TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                ) : filteredRecipients?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                          <Users className="w-6 h-6 opacity-50" />
                        </div>
                        <p className="font-medium">No recipients found</p>
                        <p className="text-sm mt-1">Try adding some manually or import a CSV file.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence>
                    {filteredRecipients?.map((recipient: any) => (
                      <motion.tr 
                        key={recipient.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="group hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0"
                      >
                        <TableCell className="font-medium font-mono text-xs md:text-sm text-primary">
                          {recipient.email}
                        </TableCell>
                        <TableCell>{recipient.firstName || "-"}</TableCell>
                        <TableCell>{recipient.lastName || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(recipient.dynamicData as Record<string,string> || {}).slice(0, 3).map(([k, v]) => (
                              <Badge key={k} variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-blue-50 text-blue-700 border-blue-100">
                                {k}: {v}
                              </Badge>
                            ))}
                            {Object.keys(recipient.dynamicData as object).length > 5 && (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                +{Object.keys(recipient.dynamicData as object).length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {recipient.isSubscribed ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Unsubscribed</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 opacity-100 group-hover:opacity-100 transition-opacity">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { console.log('Edit clicked, recipient:', recipient); setEditingRecipient(recipient); setIsEditDialogOpen(true); }}>
                                <Pencil className="mr-2 h-4 w-4 inline-block"/> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => {
                                console.log("Deleting Recipient", recipient);
                                handleDelete(recipient.id);
                                }}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <RecipientDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            console.log('Edit Dialog onOpenChange:', open);
            if (!open) setEditingRecipient(null);
            setIsEditDialogOpen(open);
          }}
          recipient={editingRecipient || undefined}
        />

        <NewRecipientDialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            console.log('Create Dialog onOpenChange:', open);
            setIsCreateDialogOpen(open);
          }}
        />
      </main>
    </div>
  );
}
