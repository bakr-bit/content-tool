import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { UseArticleFormReturn } from '@/hooks/useArticleForm';

interface FormattingTabProps {
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

export function FormattingTab({ form }: FormattingTabProps) {
  const { formatting } = form.formState;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Formatting Options</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Control which formatting elements to include in your article.
        </p>
      </div>

      <div className="space-y-1">
        <ToggleItem
          label="Bold Text"
          description="Enable bold text for emphasis on key points"
          checked={formatting.bold}
          onCheckedChange={(checked) => form.setFormatting({ bold: checked })}
        />
        <ToggleItem
          label="Italic Text"
          description="Enable italics for emphasis and terminology"
          checked={formatting.italics}
          onCheckedChange={(checked) => form.setFormatting({ italics: checked })}
        />
        <ToggleItem
          label="Tables"
          description="Include data tables where appropriate"
          checked={formatting.tables}
          onCheckedChange={(checked) => form.setFormatting({ tables: checked })}
        />
        <ToggleItem
          label="Block Quotes"
          description="Include quotes and callout boxes"
          checked={formatting.quotes}
          onCheckedChange={(checked) => form.setFormatting({ quotes: checked })}
        />
        <ToggleItem
          label="Bullet & Numbered Lists"
          description="Use lists to organize information"
          checked={formatting.lists}
          onCheckedChange={(checked) => form.setFormatting({ lists: checked })}
        />
      </div>
    </div>
  );
}
