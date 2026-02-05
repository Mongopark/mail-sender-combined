import { useState, useRef, useEffect, forwardRef } from "react";
import { Sidebar, MobileNav, MobileHeader } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useRecipients } from "@/hooks/use-recipients";
import { useVariables } from "@/hooks/use-variables";
import { useSendEmail } from "@/hooks/use-email";
import { useEmailDrafts, useCreateEmailDraft, useUpdateEmailDraft } from "@/hooks/use-email-drafts";
import { useEmailAttachments, useCreateEmailAttachment, useDeleteEmailAttachment, useCleanupAttachments, EmailAttachment } from "@/hooks/use-email-attachments";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Eye, Wand2, Save, FileText, X, File, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// Helper functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const isImageFile = (mimeType: string): boolean => {
  return mimeType?.startsWith('image/');
};

const getFileIcon = (mimeType: string) => {
  if (isImageFile(mimeType)) {
    return <ImageIcon className="w-4 h-4" />;
  }
  return <File className="w-4 h-4" />;
};

// Authenticated Image Component - fetches image with auth and displays as blob URL
const AuthenticatedImage = ({ attachmentId, alt, className, onError }: { 
  attachmentId: number; 
  alt: string; 
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadImage = async () => {
      try {
        const res = await apiRequest("GET", `/api/attachments/${attachmentId}/download`);
        if (!cancelled && res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          setBlobUrl(url);
        }
      } catch (err) {
        if (!cancelled) setError(true);
      }
    };
    loadImage();
    return () => {
      cancelled = true;
      if (blobUrl) window.URL.revokeObjectURL(blobUrl);
    };
  }, [attachmentId]);

  if (error || !blobUrl) {
    return (
      <div className={cn("flex items-center justify-center bg-muted", className)}>
        <ImageIcon className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className={className} onError={onError} />;
};

// Rich Text Editor Component (forwardRef so parent can access the div)
const RichTextEditor = forwardRef<HTMLDivElement, {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  showCharCount?: boolean;
}> (function RichTextEditor({ value, onChange, onFocus, placeholder, className = "", maxLength, showCharCount = false }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync forwarded ref
  useEffect(() => {
    const el = editorRef.current;
    if (!el || !ref) return;
    if (typeof ref === 'function') (ref as any)(el);
    else (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  }, [ref]);

  // Only overwrite editor HTML when it's not focused to avoid caret jumping
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement !== el && el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    const text = el.innerText;

    // If user typed literal HTML tags, render them as HTML
    if (text.includes('<') && text.includes('>')) {
      el.innerHTML = text;

      // Move caret to end after programmatic change
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);

      onChange(el.innerHTML);
    } else {
      // Normal text input, convert <div> to <br> for line breaks
      const cleanHtml = html.replace(/<div>/g, '<br>').replace(/<\/div>/g, '');
      onChange(cleanHtml);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (maxLength && value.length >= maxLength && e.key !== 'Backspace' && e.key !== 'Delete') {
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-1">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        className={cn(
          "min-h-[40px] p-3 border border-input bg-background rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "prose prose-sm max-w-none",
          "[&]:empty:before:content-[attr(data-placeholder)] [&]:empty:before:text-muted-foreground [&]:empty:before:pointer-events-none",
          className
        )}
        data-placeholder={placeholder}
        style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}
      />
      {showCharCount && (
        <div className="flex justify-end">
          <span className={`text-xs ${value.length > (maxLength || 0) * 0.8 ? 'text-orange-500' : value.length > (maxLength || 0) ? 'text-red-500' : 'text-muted-foreground'}`}>
            {value.length}/{maxLength}
          </span>
        </div>
      )}
    </div>
  );
});

export default function SendEmail() {
  const { data: variables } = useVariables();
  const { data: recipients } = useRecipients();
  const sendMutation = useSendEmail();
  const { toast } = useToast();

  // Email draft hooks
  const { data: drafts } = useEmailDrafts();
  const createDraftMutation = useCreateEmailDraft();
  const updateDraftMutation = useUpdateEmailDraft();

  // Email attachment hooks
  const { data: attachments } = useEmailAttachments();
  const createAttachmentMutation = useCreateEmailAttachment();
  const deleteAttachmentMutation = useDeleteEmailAttachment();
  const cleanupAttachmentsMutation = useCleanupAttachments();

  const subjectRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState("Hello {{first_name}}!");
  const [body, setBody] = useState(`
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #222;">
  <p><strong>Dear {{first_name}},</strong></p>
  <p>
    We are pleased to inform you of an official update regarding your role with
    <strong><u>The Company</u></strong>.
  </p>
  <p>
    Your position as <strong><u>{{job_title}}</u></strong> has been reviewed, and your
    compensation has been set at <strong><em>{{salary}}</em></strong>.
  </p>
  <p>
    <em>This adjustment reflects our confidence in your continued contributions.</em>
  </p>
  <br />
  <p>
    <strong>Best regards,</strong><br />
    <strong>The Team</strong>
  </p>
</div>
`);
  const [footer, setFooter] = useState("");
  const [senderName, setSenderName] = useState("Bulk Sender");
  const [logoAttachmentId, setLogoAttachmentId] = useState<number | null>(null);
  const [logoBlobUrl, setLogoBlobUrl] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("My Email Draft");
  const [activeField, setActiveField] = useState<"subject" | "body" | "footer" | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  const [originalState, setOriginalState] = useState({ subject: "", body: "", footer: "", senderName: "", logoAttachmentId: null });
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<number[]>([]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // Formatting handler
  const handleFormatClick = (format: 'bold' | 'italic' | 'underline') => {
    let ref: HTMLDivElement | null = null;
    let setter: (val: string) => void = () => {};

    if (activeField === 'body') {
      ref = bodyRef.current;
      setter = setBody;
    } else if (activeField === 'footer') {
      ref = footerRef.current;
      setter = setFooter;
    }

    if (!ref) return;

    ref.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return; // nothing selected

    const selectedFragment = range.extractContents();
    const temp = document.createElement('div');
    temp.appendChild(selectedFragment);
    let html = temp.innerHTML;

    let tag = '';
    if (format === 'bold') tag = 'strong';
    if (format === 'italic') tag = 'em';
    if (format === 'underline') tag = 'u';

    // If the selected fragment is exactly a single element with this tag, unwrap it.
    const firstChild = temp.firstChild as ChildNode | null;
    const isFullyWrapped = firstChild && temp.childNodes.length === 1 && firstChild.nodeType === Node.ELEMENT_NODE && (firstChild as Element).tagName.toLowerCase() === tag;

    if (isFullyWrapped) {
      html = (firstChild as Element).innerHTML;
    } else {
      html = `<${tag}>` + html + `</${tag}>`;
    }

    // Insert the updated HTML back into the range
    const frag = document.createRange().createContextualFragment(html);
    range.insertNode(frag);

    // Collapse selection to the end of the inserted content
    selection.removeAllRanges();
    const newRange = document.createRange();
    // place caret after the last inserted node
    let last = ref.lastChild;
    if (last) {
      if (last.nodeType === Node.TEXT_NODE) {
        newRange.setStart(last, (last as Text).length);
      } else {
        newRange.setStartAfter(last);
      }
    } else {
      newRange.setStart(ref, ref.childNodes.length);
    }
    newRange.collapse(true);
    selection.addRange(newRange);

    // Update the state with the new HTML
    setTimeout(() => {
      setter(ref?.innerHTML || '');
    }, 0);
  };

  // Load default draft on mount
  useEffect(() => {
    if (drafts && drafts.length > 0) {
      const defaultDraft = drafts.find(d => d.isDefault) || drafts[0];
      if (defaultDraft) {
        setSubject(defaultDraft.subject);
        setBody(defaultDraft.body);
        setFooter(defaultDraft.footer || "");
        setSenderName(defaultDraft.senderName || "Bulk Sender");
        setLogoAttachmentId(defaultDraft.logoAttachmentId || null);
        setDraftName(defaultDraft.name);
        setCurrentDraftId(defaultDraft.id);
        setOriginalState({
          subject: defaultDraft.subject,
          body: defaultDraft.body,
          footer: defaultDraft.footer || "",
          senderName: defaultDraft.senderName || "Bulk Sender",
          logoAttachmentId: defaultDraft.logoAttachmentId as any
        });
        setSelectedAttachmentIds((defaultDraft.attachmentIds || []).filter(id => id !== defaultDraft.logoAttachmentId));
      }
    }
  }, [drafts]);

  // Load logo blob URL when logoAttachmentId changes
  useEffect(() => {
    if (logoAttachmentId) {
      const loadLogo = async () => {
        try {
          
          const res = await apiRequest(
                  "GET",
                  `/api/attachments/${logoAttachmentId}/download`,
                );

          if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            setLogoBlobUrl(url);
          }
        } catch (error) {
          console.error("Failed to load logo:", error);
        }
      };

      loadLogo();
    } else {
      // Clean up previous blob URL
      if (logoBlobUrl) {
        window.URL.revokeObjectURL(logoBlobUrl);
        setLogoBlobUrl(null);
      }
    }

    // Cleanup function
    return () => {
      if (logoBlobUrl) {
        window.URL.revokeObjectURL(logoBlobUrl);
      }
    };
  }, [logoAttachmentId]);

  // Check if there are unsaved changes
  const hasChanges = subject !== originalState.subject || 
                    body !== originalState.body || 
                    footer !== originalState.footer ||
                    senderName !== originalState.senderName ||
                    logoAttachmentId !== originalState.logoAttachmentId ||
                    JSON.stringify(selectedAttachmentIds.sort()) !== JSON.stringify((drafts?.find(d => d.id === currentDraftId)?.attachmentIds || []).sort());

  const handleVariableClick = (varName: string) => {
    const textToInsert = `{{${varName}}}`;
    let ref: HTMLDivElement | null = null;
    let setter: (val: string) => void = () => {};
    
    if (activeField === "subject") {
      ref = subjectRef.current;
      setter = setSubject;
    } else if (activeField === "body") {
      ref = bodyRef.current;
      setter = setBody;
    } else if (activeField === "footer") {
      ref = footerRef.current;
      setter = setFooter;
    }
    
    if (!ref) return;
    
    ref.focus();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // No selection, just append to the end
      const currentHtml = ref.innerHTML;
      const newHtml = currentHtml + textToInsert;
      ref.innerHTML = newHtml;
      setter(newHtml);
      return;
    }
    
    const range = selection.getRangeAt(0);
    
    // Insert the text at cursor position
    const textNode = document.createTextNode(textToInsert);
    range.insertNode(textNode);
    
    // Move cursor after inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Update state
    setter(ref.innerHTML);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const newAttachment = await createAttachmentMutation.mutateAsync(formData);
        setSelectedAttachmentIds(prev => [...prev, newAttachment.id]);
        toast({ title: "File Uploaded", description: `${file.name} has been uploaded.` });
      } catch (error) {
        toast({ title: "Upload Failed", description: `Failed to upload ${file.name}.`, variant: "destructive" });
      }
    }
    
    // Clear the input
    e.target.value = '';
  };

  const handleRemoveAttachment = (attachmentId: number) => {
    setSelectedAttachmentIds(prev => prev.filter(id => id !== attachmentId));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid File", description: "Please select an image file for the logo.", variant: "destructive" });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const newAttachment = await createAttachmentMutation.mutateAsync(formData);
      setLogoAttachmentId(newAttachment.id);
      toast({ title: "Logo Uploaded", description: `${file.name} has been uploaded as your logo.` });
    } catch (error) {
      toast({ title: "Upload Failed", description: `Failed to upload ${file.name}.`, variant: "destructive" });
    }
    
    // Clear the input
    e.target.value = '';
  };

  const handleRemoveLogo = (logoAttachmentId: number) => {
    const currentLogoId = logoAttachmentId;
    if (logoBlobUrl) {
      window.URL.revokeObjectURL(logoBlobUrl);
      setLogoBlobUrl(null);
    }
    setLogoAttachmentId(null);
    // Also remove the logo attachment from selected attachments
    setSelectedAttachmentIds(prev => prev.filter(id => id !== currentLogoId));
  };

  const handleOpenLogo = async () => {
    if (!logoAttachmentId) return;
    
    try {
      const res = await apiRequest(
        "GET",
        `/api/attachments/${logoAttachmentId}/download`
      );

      if (!res.ok) {
        throw new Error("Failed to download");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error("Failed to open logo:", error);
      toast({ title: "Error", description: "Failed to open logo image.", variant: "destructive" });
    }
  };


const handleOpenAttachment = async (attachment: EmailAttachment) => {

    const res = await apiRequest(
    "GET",
    `/api/attachments/${attachment.id}/download`
  );

  if (!res.ok) {
    throw new Error("Failed to download");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  window.open(url);
};




  const handleSaveDraft = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Validation Error", description: "Subject and body cannot be empty.", variant: "destructive" });
      return;
    }

    try {
      // Determine which attachment IDs to keep (selected attachments + logo if exists)
      const allKeptAttachmentIds = [...selectedAttachmentIds];
      if (logoAttachmentId && !allKeptAttachmentIds.includes(logoAttachmentId)) {
        allKeptAttachmentIds.push(logoAttachmentId);
      }

      if (currentDraftId) {
        // Update existing draft
        await updateDraftMutation.mutateAsync({
          id: currentDraftId,
          subject: subject.trim(),
          body: body.trim(),
          footer: footer.trim() || undefined,
          senderName: senderName.trim() || undefined,
          logoAttachmentId: logoAttachmentId === null ? undefined : logoAttachmentId,
          attachmentIds: selectedAttachmentIds.filter(id => id !== logoAttachmentId),
        });
        toast({ title: "Draft Saved!", description: "Your email draft has been updated." });
      } else {
        // Create new draft
        const newDraft = await createDraftMutation.mutateAsync({
          name: draftName.trim(),
          subject: subject.trim(),
          body: body.trim(),
          footer: footer.trim() || undefined,
          senderName: senderName.trim() || undefined,
          logoAttachmentId: logoAttachmentId === null ? undefined : logoAttachmentId,
          attachmentIds: selectedAttachmentIds.filter(id => id !== logoAttachmentId),
        });
        setCurrentDraftId(newDraft.id);
        toast({ title: "Draft Saved!", description: "Your email draft has been created." });
      }

      // Cleanup orphaned attachments - remove any files not in the saved draft
      await cleanupAttachmentsMutation.mutateAsync(allKeptAttachmentIds);

      // Update original state to reflect saved changes
      setOriginalState({
        subject: subject.trim(),
        body: body.trim(),
        footer: footer.trim(),
        senderName: senderName.trim(),
        logoAttachmentId: logoAttachmentId as any
      });

      // If logo was removed, delete the attachment file
      if (originalState.logoAttachmentId && !logoAttachmentId) {
        deleteAttachmentMutation.mutate(originalState.logoAttachmentId, {
          onSuccess: () => {
            console.log("Logo attachment deleted successfully");
          },
          onError: (err) => {
            console.error("Failed to delete logo attachment:", err);
          }
        });
      }
    } catch (error) {
      toast({ title: "Save Failed", description: "Failed to save email draft.", variant: "destructive" });
    }
  };

  const handleSend = async () => {
    if (!subject || !body) return toast({ title: "Missing fields", description: "Subject and Body are required.", variant: "destructive" });
    
    if (confirm(`Send this email to ${recipients?.length || 0} recipients?`)) {
      // Auto-save draft before sending (this also triggers cleanup)
      try {
        // Determine which attachment IDs to keep (selected attachments + logo if exists)
        const allKeptAttachmentIds = [...selectedAttachmentIds];
        if (logoAttachmentId && !allKeptAttachmentIds.includes(logoAttachmentId)) {
          allKeptAttachmentIds.push(logoAttachmentId);
        }

        if (currentDraftId) {
          await updateDraftMutation.mutateAsync({
            id: currentDraftId,
            subject: subject.trim(),
            body: body.trim(),
            footer: footer.trim() || undefined,
            senderName: senderName.trim() || undefined,
            logoAttachmentId: logoAttachmentId === null ? undefined : logoAttachmentId,
            attachmentIds: selectedAttachmentIds.filter(id => id !== logoAttachmentId),
          });
        } else if (draftName.trim()) {
          const newDraft = await createDraftMutation.mutateAsync({
            name: draftName.trim(),
            subject: subject.trim(),
            body: body.trim(),
            footer: footer.trim() || undefined,
            senderName: senderName.trim() || undefined,
            logoAttachmentId: logoAttachmentId === null ? undefined : logoAttachmentId,
            attachmentIds: selectedAttachmentIds.filter(id => id !== logoAttachmentId),
          });
          setCurrentDraftId(newDraft.id);
        }

        // Cleanup orphaned attachments
        await cleanupAttachmentsMutation.mutateAsync(allKeptAttachmentIds);

        // Update original state
        setOriginalState({
          subject: subject.trim(),
          body: body.trim(),
          footer: footer.trim(),
          senderName: senderName.trim(),
          logoAttachmentId: logoAttachmentId as any
        });
      } catch (error) {
        console.error("Auto-save before send failed:", error);
        // Continue with sending even if auto-save fails
      }

      // Exclude logo from regular attachments to avoid duplication
      const regularAttachmentIds = selectedAttachmentIds.filter(id => id !== logoAttachmentId);
      sendMutation.mutate(
        { subject, body, footer, senderName, logoAttachmentId, attachmentIds: regularAttachmentIds },
        {
          onSuccess: (data) => {
            toast({ title: "Emails Sent!", description: data.message });
          },
          onError: (err) => {
            toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
          }
        }
      );
    }
  };

  // Generate preview for first recipient
  const previewRecipient = recipients?.[0];
  const generatePreview = (text: string) => {
    if (!previewRecipient) return text;
    let result = text;
    
    // Replace standard fields
    result = result.replace(/{{email}}/g, previewRecipient.email);
    result = result.replace(/{{firstName}}/g, previewRecipient.firstName || '');
    result = result.replace(/{{lastName}}/g, previewRecipient.lastName || '');
    result = result.replace(/{{name}}/g, `${previewRecipient.firstName || ''} ${previewRecipient.lastName || ''}`.trim());
    
    // Replace dynamic fields
    const dynamicData = previewRecipient.dynamicData as Record<string, string>;
    if (dynamicData) {
      Object.entries(dynamicData).forEach(([key, val]) => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), val);
      });
    }
    
    return result;
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <MobileNav />

      <main className="flex-1 overflow-y-auto">
        <MobileHeader title="Send Email" />
        
        <div className="p-6 md:p-8 lg:p-10 pb-20 md:pb-10 h-screen overflow-y-auto">
        <header className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="hidden md:block text-3xl md:text-4xl font-bold text-foreground">Email Builder</h1>
              <p className="hidden md:block text-muted-foreground mt-2">Compose personalized emails using variables.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-1 md:gap-2">
              <FileText className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Draft name"
                className="w-40 md:w-40 h-10 md:h-8 text-xs md:text-sm"
              />
            </div>
            <Button
              onClick={handleSaveDraft}
              variant="outline"
              disabled={!hasChanges || createDraftMutation.isPending || updateDraftMutation.isPending}
              className="gap-1 h-6 px-2 text-xs"
            >
              {(createDraftMutation.isPending || updateDraftMutation.isPending) ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">{hasChanges ? "Save Changes" : "Saved"}</span>
              <span className="sm:hidden">{hasChanges ? "Save" : "Saved"}</span>
            </Button>
            <Button 
              onClick={() => setPreviewMode(!previewMode)}
              variant="outline"
              className={cn("gap-1 h-6 px-2 text-xs", previewMode && "bg-primary/10 text-primary border-primary/20")}
            >
              <Eye className="w-3 h-3" />
              <span className="hidden sm:inline">{previewMode ? "Edit Mode" : "Preview"}</span>
              <span className="sm:hidden">{previewMode ? "Edit" : "Preview"}</span>
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border shadow-md">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Sender Name</Label>
                  {previewMode ? (
                     <div className="px-3 py-2 bg-muted/30 rounded-md border border-border/50">
                       {senderName || "Bulk Sender"}
                     </div>
                  ) : (
                    <Input 
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Enter sender name..."
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Subject Line</Label>
                  {previewMode ? (
                     <div className="px-3 py-2 bg-muted/30 rounded-md border border-border/50 font-medium">
                       {generatePreview(subject)}
                     </div>
                  ) : (
                    <div>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Enter subject..."
                        maxLength={78}
                        className="font-medium"
                      />
                      <div className="flex justify-end mt-1">
                        <span className={`text-xs ${subject.length > 62 ? 'text-orange-500' : subject.length > 78 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {subject.length}/78
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Company Logo (Optional)</Label>
                  {previewMode ? (
                    logoAttachmentId && logoBlobUrl ? (
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md border border-border/50">
                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={logoBlobUrl}
                            alt="Company Logo"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-muted hidden">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">Logo will appear at the top of your email</span>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/30 rounded-md border border-border/50 text-sm text-muted-foreground">
                        No logo uploaded
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="file"
                        onChange={handleLogoUpload}
                        className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        accept="image/*"
                      />
                      {logoAttachmentId && logoBlobUrl && (
                        <div 
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-md border border-border/50 cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={handleOpenLogo}
                          title="Click to open logo in new tab"
                        >
                          <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={logoBlobUrl}
                              alt="Company Logo"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to icon if image fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-muted hidden">
                              <ImageIcon className="w-6 h-6 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Logo uploaded</p>
                            <p className="text-xs text-muted-foreground">Click to preview • Will appear at the top of your email</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveLogo(logoAttachmentId);
                            }}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Email Body</Label>
                  {previewMode ? (
                    <div className="min-h-[300px] p-4 bg-muted/30 rounded-md border border-border/50">
                      {logoAttachmentId && logoBlobUrl && (
                        <div className="text-center mb-6">
                          <img
                            src={logoBlobUrl}
                            alt="Company Logo"
                            className="max-w-[150px] h-auto mx-auto rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">
                        {generatePreview(body)}
                      </div>
                    </div>
                  ) : (
                    <RichTextEditor
                      value={body}
                      onChange={setBody}
                      onFocus={() => setActiveField("body")}
                      ref={bodyRef}
                      placeholder="Type your message here...&#10;&#10;Press Enter for new paragraphs."
                      className="min-h-[400px] font-mono text-sm leading-relaxed"
                    />
                  )}
                </div>

                {/* File Attachments */}
                <div className="space-y-2">
                  <Label>Attachments</Label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    
                    {/* Selected Attachments */}
                    {selectedAttachmentIds.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Selected Attachments ({selectedAttachmentIds.length})
                        </Label>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                          {selectedAttachmentIds.map(id => {
                            const attachment = attachments?.find(a => a.id === id);
                            if (!attachment) return null;

                            const isImage = isImageFile(attachment.mimeType);

                            return (
                              <div
                                key={id}
                                className={cn(
                                  "relative group border rounded-lg p-3 bg-card hover:bg-accent/50 transition-colors cursor-pointer",
                                  isImage ? "flex items-center gap-3" : "flex items-center justify-between"
                                )}
                                onClick={() => handleOpenAttachment(attachment)}
                              >
                                {isImage ? (
                                  <>
                                    {/* Image Preview */}
                                    <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                      <AuthenticatedImage
                                        attachmentId={id}
                                        alt={attachment.originalName}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    
                                    {/* Image Info */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                                      <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Document Card */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      {getFileIcon(attachment.mimeType)}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                                        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                                      </div>
                                    </div>
                                  </>
                                )}

                                {/* Remove Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveAttachment(id);
                                  }}
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-100 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email Footer (Optional)</Label>
                  {previewMode ? (
                    <div className="p-3 bg-muted/30 rounded-md border border-border/50">
                      {/* Show attachments above footer */}
                      {selectedAttachmentIds.length > 0 && (
                        <div className="pt-4 border-t border-border/50">
                          <p className="text-sm font-medium mb-2 text-muted-foreground">Attachments:</p>
                          <div className="space-y-2">
                            {selectedAttachmentIds.map(id => {
                              const attachment = attachments?.find(a => a.id === id);
                              if (!attachment) return null;
                              
                              const isImage = isImageFile(attachment.mimeType);
                              
                              return (
                                <div key={id} className="flex items-center gap-2">
                                  {isImage ? (
                                    <div className="relative w-16 h-16 rounded overflow-hidden border">
                                      <AuthenticatedImage
                                        attachmentId={id}
                                        alt={attachment.originalName}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                                      <File className="w-4 h-4" />
                                      <span className="truncate max-w-[200px]">{attachment.originalName}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Footer */}
                      {footer ? (
                        <div className="pt-4 border-t border-border/50 text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                          {generatePreview(footer)}
                        </div>
                      ) : (
                        <div className="pt-4 border-t border-border/50 text-sm text-muted-foreground">
                          No footer added
                        </div>
                      )}
                    </div>
                  ) : (
                    <RichTextEditor
                      value={footer}
                      onChange={setFooter}
                      onFocus={() => setActiveField("footer")}
                      ref={footerRef}
                      placeholder="Add a footer to your email...&#10;&#10;This will appear in grey, small text at the bottom."
                      className="min-h-[80px] font-mono text-sm leading-relaxed"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Tools */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-primary/5 border-primary/10 shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3 text-primary font-semibold text-sm">
                  <Wand2 className="w-4 h-4" />
                  Text Formatting
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Select text in any field and click to format.
                </p>
                
                <div className="flex gap-2 mb-4">
                  <Button variant="outline" size="sm" onClick={() => handleFormatClick('bold')} title="Bold (Ctrl+B)">
                    <strong>B</strong>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleFormatClick('italic')} title="Italic (Ctrl+I)">
                    <em>I</em>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleFormatClick('underline')} title="Underline (Ctrl+U)">
                    <u>U</u>
                  </Button>
                </div>

                <div className="flex items-center gap-2 mb-3 text-primary font-semibold text-sm">
                  <Wand2 className="w-4 h-4" />
                  Available Variables
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Click to insert into the active field.
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {/* Standard Variables */}
                  {["firstname", "lastname", "email"].map((v) => (
                     <Button
                       key={v}
                       variant="outline"
                       size="sm"
                       onClick={() => handleVariableClick(v)}
                       className="h-7 text-xs bg-white hover:bg-white hover:text-primary hover:border-primary/50 transition-colors"
                     >
                       {v}
                     </Button>
                  ))}
                  
                  {/* Custom Variables */}
                  {variables?.map((v: any) => (
                    <Button
                      key={v.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleVariableClick(v.name)}
                      className="h-7 text-xs bg-white text-primary border-primary/20 hover:bg-primary hover:text-white transition-colors"
                    >
                      {v.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm mb-16 md:mb-0">
               <h3 className="font-semibold text-sm mb-2">Sending Summary</h3>
               <div className="space-y-2 text-sm text-muted-foreground mb-4">
                 <div className="flex justify-between">
                   <span>From:</span>
                   <span className="font-medium text-foreground">{senderName || "Bulk Sender"}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Recipients:</span>
                   <span className="font-medium text-foreground">{recipients?.length || 0}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Estimated Time:</span>
                   <span className="font-medium text-foreground">~{Math.ceil((recipients?.length || 0) * 0.5) + 5.5}s</span>
                 </div>
               </div>
               
               <Button 
                 className="w-full bg-primary hover:bg-primary/90 h-11 text-base shadow-lg shadow-primary/25"
                 onClick={handleSend}
                 disabled={sendMutation.isPending || !recipients?.length}
               >
                 {sendMutation.isPending ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...
                   </>
                 ) : (
                   <>
                     <Send className="w-4 h-4 mr-2" /> Send Campaign
                   </>
                 )}
               </Button>
               {!recipients?.length && (
                 <p className="text-xs text-center text-destructive mt-2">No recipients found.</p>
               )}
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
