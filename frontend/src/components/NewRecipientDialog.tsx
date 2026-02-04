import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCreateRecipient } from "@/hooks/use-recipients";
import { useToast } from "@/hooks/use-toast";

// Local form schema (don't require server-only fields like userId)
const formSchema = z.object({
  email: z.string().min(1, "Email is required").email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  isSubscribed: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewRecipientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewRecipientDialog({ open, onOpenChange }: NewRecipientDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateRecipient();
  const [pairs, setPairs] = useState<{ key: string; value: string }[]>([]);

  const { register, handleSubmit, reset, formState: { errors }, control } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      isSubscribed: true,
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log('NewRecipientDialog onSubmit', data);
    const dynamicData = pairs.reduce((acc, { key, value }) => {
      if (key && value) acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    createMutation.mutate(
      { ...data, dynamicData },
      {
        onSuccess: () => {
          toast({ title: "Recipient created", description: "Successfully added new recipient." });
          onOpenChange(false);
          reset();
          setPairs([]);
        },
        onError: (err) => {
          toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
        },
      }
    );
  };

  const addPair = () => setPairs([...pairs, { key: "", value: "" }]);
  const removePair = (index: number) => setPairs(pairs.filter((_, i) => i !== index));
  const updatePair = (index: number, field: "key" | "value", val: string) => {
    const newPairs = [...pairs];
    newPairs[index][field] = val;
    setPairs(newPairs);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Add Manual Recipient</DialogTitle>
          <DialogDescription>Enter recipient details. Use Dynamic Data for custom variable replacement.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register("firstName")} placeholder="Jane" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...register("lastName")} placeholder="Doe" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
            <Input id="email" type="email" {...register("email")} placeholder="jane@example.com" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="isSubscribed"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isSubscribed"
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="isSubscribed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Subscribed to emails
            </Label>
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Dynamic Data</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPair}>
                <Plus className="w-4 h-4 mr-2" /> Add Variable
              </Button>
            </div>

            {pairs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg border border-dashed border-border">
                No custom data added. Click "Add Variable" to define fields like job_title, salary, etc.
              </p>
            )}

            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
              {pairs.map((pair, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <Input 
                    placeholder="Key (e.g. salary)" 
                    value={pair.key}
                    onChange={(e) => updatePair(idx, "key", e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <Input 
                    placeholder="Value (e.g. $50,000)" 
                    value={pair.value}
                    onChange={(e) => updatePair(idx, "value", e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removePair(idx)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isLoading || createMutation.isPending} className="bg-primary hover:bg-primary/90">
              {createMutation.isLoading || createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Recipient
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
