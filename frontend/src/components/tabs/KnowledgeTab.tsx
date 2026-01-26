import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DEEP_RESEARCH_DEPTH_NAMES,
  RESEARCH_SOURCE_NAMES,
  type DeepResearchDepth,
  type ResearchSource,
} from '@/types/article';
import type { UseArticleFormReturn } from '@/hooks/useArticleForm';

interface KnowledgeTabProps {
  form: UseArticleFormReturn;
}

interface ToggleItemProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleItem({ label, description, checked, onCheckedChange, disabled }: ToggleItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="space-y-0.5">
        <Label className={`text-base ${disabled ? 'text-muted-foreground' : ''}`}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

export function KnowledgeTab({ form }: KnowledgeTabProps) {
  const { deepResearch } = form.formState;
  const isEnabled = deepResearch.enabled;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Deep Research</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Enable deep research to gather real-time information from the web,
          adding facts, statistics, and citations to your article.
        </p>
      </div>

      {/* Enable Deep Research */}
      <div className="flex items-center justify-between py-3 border-b">
        <div className="space-y-0.5">
          <Label className="text-base font-semibold">Enable Deep Research</Label>
          <p className="text-sm text-muted-foreground">
            Conduct web research to enhance article quality
          </p>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => form.setDeepResearch({ enabled: checked })}
        />
      </div>

      {/* Research Source */}
      <div className="space-y-2">
        <Label>Research Source</Label>
        <Select
          value={deepResearch.researchSource}
          onValueChange={(value) =>
            form.setDeepResearch({ researchSource: value as ResearchSource })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RESEARCH_SOURCE_NAMES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Internet: Search the web. Knowledge Base: Use your indexed data only. Both: Combine sources.
        </p>
      </div>

      {/* Research Depth */}
      <div className={`space-y-2 ${!isEnabled ? 'opacity-50' : ''}`}>
        <Label>Research Depth</Label>
        <Select
          value={deepResearch.depth}
          onValueChange={(value) =>
            form.setDeepResearch({ depth: value as DeepResearchDepth })
          }
          disabled={!isEnabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DEEP_RESEARCH_DEPTH_NAMES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Shallow: Quick overview. Standard: Balanced research. Deep: Comprehensive analysis.
        </p>
      </div>

      {/* Research Options */}
      <div className={`space-y-1 ${!isEnabled ? 'opacity-50' : ''}`}>
        <ToggleItem
          label="Topic-Level Research"
          description="Research the main topic before generating the outline"
          checked={deepResearch.topicLevelResearch}
          onCheckedChange={(checked) =>
            form.setDeepResearch({ topicLevelResearch: checked })
          }
          disabled={!isEnabled}
        />
        <ToggleItem
          label="Section-Level Research"
          description="Conduct additional research for each section"
          checked={deepResearch.sectionLevelResearch}
          onCheckedChange={(checked) =>
            form.setDeepResearch({ sectionLevelResearch: checked })
          }
          disabled={!isEnabled}
        />
        <ToggleItem
          label="Include Citations"
          description="Add numbered citations and a sources section"
          checked={deepResearch.includeCitations}
          onCheckedChange={(checked) =>
            form.setDeepResearch({ includeCitations: checked })
          }
          disabled={!isEnabled}
        />
      </div>
    </div>
  );
}
