import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ARTICLE_SIZE_NAMES, type ArticleSizePreset } from '@/types/article';
import type { UseArticleFormReturn } from '@/hooks/useArticleForm';

interface StructureTabProps {
  form: UseArticleFormReturn;
}

interface ToggleItemProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function ToggleItem({ label, description, checked, onCheckedChange }: ToggleItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="space-y-0.5">
        <Label className="text-base">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function StructureTab({ form }: StructureTabProps) {
  const { structure, articleSize } = form.formState;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Article Structure</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure the structure and sections of your article.
        </p>
      </div>

      {/* Article Size */}
      <div className="space-y-2">
        <Label>Article Length</Label>
        <Select
          value={articleSize.preset}
          onValueChange={(value) =>
            form.setArticleSize({ preset: value as ArticleSizePreset })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ARTICLE_SIZE_NAMES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Determines the overall length and depth of your article.
        </p>
      </div>

      {/* Structure Toggles */}
      <div className="space-y-1 mt-6">
        <ToggleItem
          label="Key Takeaways"
          description="Add a summary box at the beginning of the article"
          checked={structure.keyTakeaways}
          onCheckedChange={(checked) => form.setStructure({ keyTakeaways: checked })}
        />
        <ToggleItem
          label="Table of Contents"
          description="Include a navigable table of contents"
          checked={structure.tableOfContents}
          onCheckedChange={(checked) => form.setStructure({ tableOfContents: checked })}
        />
        <ToggleItem
          label="Conclusion"
          description="Add a conclusion section at the end"
          checked={structure.conclusion}
          onCheckedChange={(checked) => form.setStructure({ conclusion: checked })}
        />
        <ToggleItem
          label="FAQs Section"
          description="Include frequently asked questions"
          checked={structure.faqs}
          onCheckedChange={(checked) => form.setStructure({ faqs: checked })}
        />
      </div>
    </div>
  );
}
