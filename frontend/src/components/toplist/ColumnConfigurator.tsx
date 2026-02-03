import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import type { ColumnDefinition } from '@/types/toplist';
import { COLUMN_TYPE_NAMES, COMMON_BRAND_ATTRIBUTES } from '@/types/toplist';

interface ColumnConfiguratorProps {
  columns: ColumnDefinition[];
  onChange: (columns: ColumnDefinition[]) => void;
}

export function ColumnConfigurator({ columns, onChange }: ColumnConfiguratorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAddColumn = () => {
    const newColumn: ColumnDefinition = {
      id: uuidv4(),
      label: 'New Column',
      type: 'text',
      brandAttribute: '',
    };
    onChange([...columns, newColumn]);
  };

  const handleUpdateColumn = (index: number, updates: Partial<ColumnDefinition>) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], ...updates };
    onChange(newColumns);
  };

  const handleDeleteColumn = (index: number) => {
    onChange(columns.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newColumns = [...columns];
    const draggedItem = newColumns[draggedIndex];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedItem);

    onChange(newColumns);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleQuickAddAttribute = (attr: typeof COMMON_BRAND_ATTRIBUTES[number]) => {
    // Check if already exists
    if (columns.some((c) => c.brandAttribute === attr.key)) {
      return;
    }

    const newColumn: ColumnDefinition = {
      id: uuidv4(),
      label: attr.label,
      type: attr.type as ColumnDefinition['type'],
      brandAttribute: attr.key,
    };
    onChange([...columns, newColumn]);
  };

  return (
    <div className="space-y-6">
      {/* Quick Add */}
      <div className="space-y-2">
        <Label>Quick Add Common Columns</Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_BRAND_ATTRIBUTES.filter(
            (attr) => !columns.some((c) => c.brandAttribute === attr.key)
          ).map((attr) => (
            <Button
              key={attr.key}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAddAttribute(attr)}
            >
              <Plus className="h-3 w-3 mr-1" />
              {attr.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Column List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Columns ({columns.length})</Label>
          <Button size="sm" variant="outline" onClick={handleAddColumn}>
            <Plus className="h-4 w-4 mr-1" />
            Add Column
          </Button>
        </div>

        {columns.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <p className="text-muted-foreground">
              No columns configured. Add columns using quick add above or click "Add Column".
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {columns.map((column, index) => (
              <div
                key={column.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`border rounded-lg p-4 bg-card space-y-3 transition-opacity ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="cursor-grab text-muted-foreground hover:text-foreground">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <Input
                      value={column.label}
                      onChange={(e) => handleUpdateColumn(index, { label: e.target.value })}
                      placeholder="Column Label"
                    />
                    <Select
                      value={column.type}
                      onValueChange={(value) => handleUpdateColumn(index, { type: value as ColumnDefinition['type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(COLUMN_TYPE_NAMES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={column.brandAttribute}
                      onValueChange={(value) => handleUpdateColumn(index, { brandAttribute: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select attribute" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_rank">Rank (#)</SelectItem>
                        <SelectItem value="name">Brand Name</SelectItem>
                        {COMMON_BRAND_ATTRIBUTES.map((attr) => (
                          <SelectItem key={attr.key} value={attr.key}>
                            {attr.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteColumn(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
