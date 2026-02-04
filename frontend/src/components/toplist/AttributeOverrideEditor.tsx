import { useState, useEffect } from 'react';
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
import type { ToplistEntry, ColumnDefinition, BrandAttributes } from '@/types/toplist';

interface AttributeOverrideEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: ToplistEntry;
  columns: ColumnDefinition[];
  onSave: (overrides: BrandAttributes | undefined) => void;
}

export function AttributeOverrideEditor({
  open,
  onOpenChange,
  entry,
  columns,
  onSave,
}: AttributeOverrideEditorProps) {
  const [overrides, setOverrides] = useState<BrandAttributes>({});

  useEffect(() => {
    if (open) {
      setOverrides(entry.attributeOverrides || {});
    }
  }, [open, entry]);

  const getOriginalValue = (key: string): unknown => {
    if (!entry.brand) return undefined;
    const brand = entry.brand;

    // Map column attributes to Brand fields
    switch (key) {
      case 'name': return brand.name;
      case 'bonus': return brand.defaultBonus;
      case 'rating': return brand.defaultRating;
      case 'logo': return brand.defaultLogo;
      case 'affiliateUrl': return brand.defaultAffiliateUrl;
      case 'terms': return brand.terms;
      case 'license': return brand.license;
      case 'pros': return brand.pros;
      case 'cons': return brand.cons;
      case 'website': return brand.website;
      case 'description': return brand.description;
      default: return undefined;
    }
  };

  const handleChange = (key: string, value: string) => {
    if (value === '' || value === String(getOriginalValue(key))) {
      // Remove override if empty or same as original
      const { [key]: _, ...rest } = overrides;
      setOverrides(rest);
    } else {
      setOverrides({ ...overrides, [key]: value });
    }
  };

  const handleListChange = (key: string, value: string) => {
    const items = value.split(',').map((s) => s.trim()).filter(Boolean);
    const originalValue = getOriginalValue(key);
    const originalArray = Array.isArray(originalValue) ? originalValue : [];

    if (items.length === 0 || JSON.stringify(items) === JSON.stringify(originalArray)) {
      const { [key]: _, ...rest } = overrides;
      setOverrides(rest);
    } else {
      setOverrides({ ...overrides, [key]: items });
    }
  };

  const handleSave = () => {
    onSave(Object.keys(overrides).length > 0 ? overrides : undefined);
    onOpenChange(false);
  };

  // Get columns that can be overridden (exclude _rank)
  const overridableColumns = columns.filter((col) => col.brandAttribute !== '_rank');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Edit Overrides for {entry.brand?.name || 'Brand'}
          </DialogTitle>
          <DialogDescription>
            Override specific values for this brand in this toplist only.
            Leave blank to use the original brand value.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            {overridableColumns.map((column) => {
              const key = column.brandAttribute;
              const originalValue = getOriginalValue(key);
              const overrideValue = overrides[key];
              const isList = column.type === 'list';

              let displayOriginal: string;
              if (Array.isArray(originalValue)) {
                displayOriginal = originalValue.join(', ');
              } else if (originalValue !== undefined && originalValue !== null) {
                displayOriginal = String(originalValue);
              } else {
                displayOriginal = '';
              }

              let displayOverride: string;
              if (overrideValue !== undefined) {
                if (Array.isArray(overrideValue)) {
                  displayOverride = overrideValue.join(', ');
                } else {
                  displayOverride = String(overrideValue);
                }
              } else {
                displayOverride = '';
              }

              return (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`override-${key}`}>{column.label}</Label>
                  <Input
                    id={`override-${key}`}
                    value={displayOverride}
                    onChange={(e) =>
                      isList
                        ? handleListChange(key, e.target.value)
                        : handleChange(key, e.target.value)
                    }
                    placeholder={displayOriginal || 'No value set'}
                  />
                  {displayOriginal && (
                    <p className="text-xs text-muted-foreground">
                      Original: {displayOriginal}
                    </p>
                  )}
                </div>
              );
            })}

            {overridableColumns.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No columns available for override.
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Overrides</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
