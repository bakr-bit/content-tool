import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrandSelector } from './BrandSelector';
import { ColumnConfigurator } from './ColumnConfigurator';
import { ToplistPreview } from './ToplistPreview';
import { getTemplates } from '@/services/toplist-api';
import type {
  ArticleToplist,
  ToplistTemplate,
  ToplistEntry,
  ColumnDefinition,
  Brand,
} from '@/types/toplist';

interface ToplistBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toplist: ArticleToplist | null;
  onSave: (toplist: ArticleToplist) => void;
}

export function ToplistBuilder({ open, onOpenChange, toplist, onSave }: ToplistBuilderProps) {
  const [templates, setTemplates] = useState<ToplistTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [name, setName] = useState('');
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [entries, setEntries] = useState<ToplistEntry[]>([]);
  const [activeTab, setActiveTab] = useState('template');

  // Load templates on mount
  useEffect(() => {
    async function loadTemplates() {
      const result = await getTemplates();
      if (result.success && result.data) {
        setTemplates(result.data.templates);
      }
    }
    loadTemplates();
  }, []);

  // Initialize form when editing existing toplist
  useEffect(() => {
    if (open) {
      if (toplist) {
        setName(toplist.name);
        setColumns(toplist.columns);
        setEntries(toplist.entries || []);
        setSelectedTemplateId(toplist.templateId || '');
        setActiveTab('columns');
      } else {
        setName('');
        setColumns([]);
        setEntries([]);
        setSelectedTemplateId('');
        setActiveTab('template');
      }
    }
  }, [open, toplist]);

  const handleTemplateSelect = (templateId: string) => {
    const actualId = templateId === '__blank__' ? '' : templateId;
    setSelectedTemplateId(actualId);
    const template = templates.find((t) => t.templateId === actualId);
    if (template) {
      setColumns(template.columns);
      if (!name) {
        setName(template.name);
      }
    }
  };

  const handleAddBrand = (brand: Brand) => {
    // Check if brand already exists
    if (entries.some((e) => e.brandId === brand.brandId)) {
      return;
    }

    const newEntry: ToplistEntry = {
      entryId: uuidv4(),
      toplistId: toplist?.toplistId || '',
      brandId: brand.brandId,
      rank: entries.length + 1,
      brand,
      createdAt: new Date().toISOString(),
    };

    setEntries([...entries, newEntry]);
  };

  const handleRemoveBrand = (entryId: string) => {
    const newEntries = entries
      .filter((e) => e.entryId !== entryId)
      .map((e, index) => ({ ...e, rank: index + 1 }));
    setEntries(newEntries);
  };

  const handleReorderBrands = (newEntries: ToplistEntry[]) => {
    const reordered = newEntries.map((e, index) => ({ ...e, rank: index + 1 }));
    setEntries(reordered);
  };

  const handleUpdateOverride = (entryId: string, overrides: ToplistEntry['attributeOverrides']) => {
    setEntries(entries.map((e) =>
      e.entryId === entryId ? { ...e, attributeOverrides: overrides } : e
    ));
  };

  const handleSave = () => {
    if (!name.trim() || columns.length === 0) {
      return;
    }

    const newToplist: ArticleToplist = {
      toplistId: toplist?.toplistId || uuidv4(),
      name: name.trim(),
      templateId: selectedTemplateId || undefined,
      columns,
      entries,
      position: toplist?.position || 0,
      createdAt: toplist?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Preserve article integration settings when editing
      includeInArticle: toplist?.includeInArticle,
      heading: toplist?.heading,
      headingLevel: toplist?.headingLevel,
    };

    onSave(newToplist);
  };

  const isValid = name.trim() && columns.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>
            {toplist ? 'Edit Toplist' : 'Create Toplist'}
          </DialogTitle>
          <DialogDescription>
            {toplist ? 'Modify your comparison table settings and brands.' : 'Create a comparison table by selecting a template and adding brands.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-6 border-b">
              <TabsList>
                <TabsTrigger value="template">Template</TabsTrigger>
                <TabsTrigger value="columns">Columns</TabsTrigger>
                <TabsTrigger value="brands">Brands</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <TabsContent value="template" className="p-6 space-y-6 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="name">Toplist Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Top 10 Online Casinos"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select
                    value={selectedTemplateId || '__blank__'}
                    onValueChange={handleTemplateSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template or start blank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__blank__">Start Blank</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.templateId} value={template.templateId}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplateId && (
                    <p className="text-sm text-muted-foreground">
                      {templates.find((t) => t.templateId === selectedTemplateId)?.description}
                    </p>
                  )}
                </div>

                {!selectedTemplateId && columns.length === 0 && (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">
                      Select a template to get started, or go to the Columns tab to create custom columns.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="columns" className="p-6 mt-0">
                <ColumnConfigurator
                  columns={columns}
                  onChange={setColumns}
                />
              </TabsContent>

              <TabsContent value="brands" className="p-6 mt-0">
                <BrandSelector
                  entries={entries}
                  onAddBrand={handleAddBrand}
                  onRemoveBrand={handleRemoveBrand}
                  onReorder={handleReorderBrands}
                  onUpdateOverride={handleUpdateOverride}
                  columns={columns}
                />
              </TabsContent>

              <TabsContent value="preview" className="p-6 mt-0">
                {entries.length > 0 ? (
                  <ToplistPreview
                    toplist={{
                      toplistId: toplist?.toplistId || '',
                      name,
                      columns,
                      entries,
                      position: 0,
                      createdAt: '',
                    }}
                  />
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-12 text-center">
                    <p className="text-muted-foreground">
                      Add some brands to see a preview of your toplist.
                    </p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {toplist ? 'Save Changes' : 'Create Toplist'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
