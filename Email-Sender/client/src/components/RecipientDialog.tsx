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
import { useState, useEffect } from "react";
import { useCreateRecipient, useUpdateRecipient } from "@/hooks/use-recipients";
import { useToast } from "@/hooks/use-toast";

// Local form schema (don't require server-only fields like userId)
const formSchema = z.object({
  email: z.string().min(1, "Email is required").email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  isSubscribed: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RecipientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient?: any; // optional recipient for edit mode
}

export function RecipientDialog({ open, onOpenChange, recipient }: RecipientDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateRecipient();
  const updateMutation = useUpdateRecipient();
  const [pairs, setPairs] = useState<{ key: string; value: string }[]>([]);

  const { register, handleSubmit, reset, formState: { errors }, setValue, control } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      isSubscribed: true,
    },
  });

  // Initialize pairs from recipient.dynamicData when editing
  useEffect(() => {
    console.log('Pairs useEffect called with recipient:', recipient);
    if (recipient && recipient.dynamicData) {
      const initial = Object.entries(recipient.dynamicData).map(([k, v]) => ({ key: k, value: String(v) }));
      console.log('Setting pairs to:', initial);
      setPairs(initial);
    } else {
      console.log('Setting pairs to empty');
      setPairs([]);
    }
  }, [recipient]);

  // Reset form when recipient changes
  useEffect(() => {
    console.log('Reset useEffect called with recipient:', recipient);
    if (recipient) {
      reset({
        email: recipient.email || "",
        firstName: recipient.firstName || "",
        lastName: recipient.lastName || "",
        isSubscribed: recipient.isSubscribed ?? true,
      });
    } else {
      reset({
        email: "",
        firstName: "",
        lastName: "",
        isSubscribed: true,
      });
    }
  }, [recipient, reset]);

  const onSubmit = (data: FormValues) => {
    console.log('onSubmit called with data:', data);
    console.log('recipient:', recipient);
    console.log('pairs:', pairs);
    // Convert array of pairs back to object
    const dynamicData = pairs.reduce((acc, { key, value }) => {
      if (key && value) acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    console.log('dynamicData:', dynamicData);

    if (recipient) {
      console.log('Calling updateMutation');
      updateMutation.mutate(
        { id: recipient.id, ...data, dynamicData },
        {
          onSuccess: () => {
            console.log('Update success');
            toast({ title: "Recipient updated", description: "Recipient details updated successfully." });
            onOpenChange(false);
            setPairs([]);
          },
          onError: (err) => {
            console.error('Update error:', err);
            toast({ title: "Error", description: err.message, variant: "destructive" });
          },
        }
      );
    } else {
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
            toast({ title: "Error", description: err.message, variant: "destructive" });
          },
        }
      );
    }
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
          <DialogTitle className="text-2xl font-display">{recipient ? "Edit Recipient" : "Add Manual Recipient"}</DialogTitle>
          <DialogDescription>
            {recipient ? "Update recipient details. Use Dynamic Data for custom variable replacement." : "Enter recipient details. Use Dynamic Data for custom variable replacement."}
          </DialogDescription>
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
            <Button type="submit" disabled={createMutation.isLoading || createMutation.isPending || updateMutation.isLoading || updateMutation.isPending} className="bg-primary hover:bg-primary/90">
              {(createMutation.isLoading || createMutation.isPending || updateMutation.isLoading || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {recipient ? "Update Recipient" : "Add Recipient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
