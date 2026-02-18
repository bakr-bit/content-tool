import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { parseSiteArchitectCsv } from '@/utils/csv-parser';
import type { ImportPageInput } from '@/types/content-plan';

interface ImportArchitectureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (pages: ImportPageInput[]) => Promise<unknown>;
}

export function ImportArchitectureDialog({ open, onOpenChange, onImport }: ImportArchitectureDialogProps) {
  const [parsedPages, setParsedPages] = useState<ImportPageInput[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const pages = parseSiteArchitectCsv(text);
        if (pages.length === 0) {
          setParseError('No pages found in CSV. Please check the file format.');
          setParsedPages([]);
          return;
        }
        setParsedPages(pages);
      } catch {
        setParseError('Failed to parse CSV file. Please check the format.');
        setParsedPages([]);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      await onImport(parsedPages);
      handleClose();
    } catch {
      // Error handled by parent
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setParsedPages([]);
    setFileName('');
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import Site Architecture</DialogTitle>
          <DialogDescription>
            Upload a CSV file exported from the site-architect tool to import your URL structure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div
            className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center cursor-pointer hover:border-zinc-500 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            {fileName ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <FileText className="h-5 w-5 text-zinc-400" />
                <span className="text-white">{fileName}</span>
                <Badge variant="secondary">{parsedPages.length} pages</Badge>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-zinc-500" />
                <p className="text-sm text-zinc-400">
                  Click to select a CSV file or drag and drop
                </p>
              </div>
            )}
          </div>

          {parseError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {parseError}
            </div>
          )}

          {/* Preview Table */}
          {parsedPages.length > 0 && (
            <div className="max-h-[40vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-[60px]">Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedPages.map((page, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-zinc-500">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        {page.url || '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {page.metaTitle || '-'}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs text-zinc-400">
                        {page.keywords || '-'}
                      </TableCell>
                      <TableCell>
                        {page.pageType && (
                          <Badge variant="outline" className="text-xs">
                            {page.pageType}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{page.level ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={parsedPages.length === 0 || importing}>
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import {parsedPages.length} Pages
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
