import { useState } from "react";
import { useVariables, useCreateVariable, useDeleteVariable } from "@/hooks/use-variables";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Database, Plus, Trash2, Tag, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Variables() {
  const { data: variables, isLoading } = useVariables();
  const createMutation = useCreateVariable();
  const deleteMutation = useDeleteVariable();
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newLabel) return;

    createMutation.mutate(
      { name: newName, label: newLabel },
      {
        onSuccess: () => {
          toast({ title: "Variable Added", description: `{{${newName}}} is now available.` });
          setNewName("");
          setNewLabel("");
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: "Deleted", description: "Variable removed." })
    });
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <MobileNav />

      <main className="flex-1 p-6 md:p-8 lg:p-10 pb-20 md:pb-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Variables</h1>
          <p className="text-muted-foreground mt-2">
            Define dynamic placeholders for your email templates.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Form */}
          <div className="lg:col-span-1">
            <Card className="border-border shadow-md sticky top-8">
              <CardHeader>
                <CardTitle>Add Variable</CardTitle>
                <CardDescription>Create a new dynamic tag.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Variable Key</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                        {"{{"}
                      </span>
                      <Input 
                        id="name" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                        className="pl-8 pr-8 font-mono"
                        placeholder="job_title" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                        {"}}"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Only letters, numbers, and underscores.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="label">Display Name</Label>
                    <Input 
                      id="label" 
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Job Title" 
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={createMutation.isPending || !newName || !newLabel}
                  >
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Variable"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* List */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-card rounded-xl border border-border animate-pulse" />
              ))
            ) : variables?.length === 0 ? (
               <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                 <Database className="w-10 h-10 mb-4 opacity-20" />
                 <p>No variables defined yet.</p>
               </div>
            ) : (
              <AnimatePresence>
                {variables?.map((variable) => (
                  <motion.div
                    key={variable.id}
                    layout
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-card group rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 relative"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 text-primary font-semibold">
                        <Tag className="w-4 h-4" />
                        {variable.label}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(variable.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <code className="block bg-muted/50 text-foreground px-3 py-1.5 rounded-md text-sm font-mono border border-border w-fit">
                      {"{{"}{variable.name}{"}}"}
                    </code>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
