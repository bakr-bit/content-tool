import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GripVertical, X, Plus, Pencil } from 'lucide-react';
import { BrandEditor } from './BrandEditor';
import { AttributeOverrideEditor } from './AttributeOverrideEditor';
import { getBrands } from '@/services/toplist-api';
import type { Brand, ToplistEntry, ColumnDefinition } from '@/types/toplist';

interface BrandSelectorProps {
  entries: ToplistEntry[];
  onAddBrand: (brand: Brand) => void;
  onRemoveBrand: (entryId: string) => void;
  onReorder: (entries: ToplistEntry[]) => void;
  onUpdateOverride: (entryId: string, overrides: ToplistEntry['attributeOverrides']) => void;
  columns: ColumnDefinition[];
}

export function BrandSelector({
  entries,
  onAddBrand,
  onRemoveBrand,
  onReorder,
  onUpdateOverride,
  columns,
}: BrandSelectorProps) {
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ToplistEntry | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Fetch all brands on mount
  useEffect(() => {
    async function loadBrands() {
      setIsLoading(true);
      try {
        const result = await getBrands({ limit: 500 });
        if (result.success && result.data) {
          setAllBrands(result.data.brands);
        }
      } catch (error) {
        console.error('Failed to load brands:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadBrands();
  }, []);

  // Filter out brands already in the list
  const availableBrands = allBrands.filter(
    (brand) => !entries.some((e) => e.brandId === brand.brandId)
  );

  const handleSelectBrand = (brandId: string) => {
    const brand = allBrands.find((b) => b.brandId === brandId);
    if (brand) {
      onAddBrand(brand);
    }
  };

  const handleCreateBrand = () => {
    setIsEditorOpen(true);
  };

  const handleBrandCreated = (brand: Brand) => {
    setIsEditorOpen(false);
    // Add the new brand to our local list
    setAllBrands((prev) => [...prev, brand]);
    onAddBrand(brand);
  };

  const handleEditOverrides = (entry: ToplistEntry) => {
    setEditingEntry(entry);
  };

  const handleSaveOverrides = (overrides: ToplistEntry['attributeOverrides']) => {
    if (editingEntry) {
      onUpdateOverride(editingEntry.entryId, overrides);
      setEditingEntry(null);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newEntries = [...entries];
    const draggedItem = newEntries[draggedIndex];
    newEntries.splice(draggedIndex, 1);
    newEntries.splice(index, 0, draggedItem);

    onReorder(newEntries);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-6">
      {/* Brand Selection Dropdown */}
      <div className="space-y-2">
        <Label>Add Brand</Label>
        <div className="flex gap-2">
          <Select onValueChange={handleSelectBrand} disabled={isLoading}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={isLoading ? "Loading brands..." : "Select a brand to add..."} />
            </SelectTrigger>
            <SelectContent>
              {availableBrands.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  {allBrands.length === 0 ? "No brands available" : "All brands already added"}
                </div>
              ) : (
                availableBrands.map((brand) => (
                  <SelectItem key={brand.brandId} value={brand.brandId}>
                    {brand.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleCreateBrand}>
            <Plus className="h-4 w-4 mr-2" />
            New Brand
          </Button>
        </div>
      </div>

      {/* Brand List */}
      <div className="space-y-2">
        <Label>Brands in Toplist ({entries.length})</Label>
        {entries.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <p className="text-muted-foreground">
              Search for brands above or create new ones to add to your toplist.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <div
                key={entry.entryId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 border rounded-lg bg-card transition-opacity ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                <div className="cursor-grab text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {entry.rank}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{entry.brand?.name || 'Unknown Brand'}</p>
                  {entry.attributeOverrides && Object.keys(entry.attributeOverrides).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {Object.keys(entry.attributeOverrides).length} overrides
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditOverrides(entry)}
                    title="Edit overrides"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveBrand(entry.entryId)}
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brand Editor Modal */}
      <BrandEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        onSave={handleBrandCreated}
      />

      {/* Attribute Override Editor */}
      {editingEntry && (
        <AttributeOverrideEditor
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          entry={editingEntry}
          columns={columns}
          onSave={handleSaveOverrides}
        />
      )}
    </div>
  );
}
