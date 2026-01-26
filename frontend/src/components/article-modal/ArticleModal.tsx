import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sidebar, type TabId } from './Sidebar';
import { ModalFooter } from './ModalFooter';
import { DetailsTab } from '@/components/tabs/DetailsTab';
import { ContentTab } from '@/components/tabs/ContentTab';
import { FormattingTab } from '@/components/tabs/FormattingTab';
import { StructureTab } from '@/components/tabs/StructureTab';
import { OutlineTab } from '@/components/tabs/OutlineTab';
import { KnowledgeTab } from '@/components/tabs/KnowledgeTab';
import { ResultTab } from '@/components/tabs/ResultTab';
import { useArticleForm } from '@/hooks/useArticleForm';
import { startFullWorkflow, pollWorkflowUntilComplete, updateOutline } from '@/services/api';
import type { Article, WorkflowState } from '@/types/article';

interface ArticleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArticleCreated?: () => void;
  defaultProjectId?: string;
}

const TAB_ORDER: TabId[] = ['details', 'structure', 'outline', 'content', 'knowledge', 'formatting'];

export function ArticleModal({ open, onOpenChange, onArticleCreated, defaultProjectId }: ArticleModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [article, setArticle] = useState<Article | null>(null);
  const form = useArticleForm();

  // Reset to details tab when modal opens and set default project
  useEffect(() => {
    if (open) {
      setActiveTab('details');
      setArticle(null);
      setGenerationStatus('');
      if (defaultProjectId) {
        form.setProjectId(defaultProjectId);
      }
    }
  }, [open, defaultProjectId, form.setProjectId]);

  const currentTabIndex = TAB_ORDER.indexOf(activeTab);
  const isLastTab = currentTabIndex === TAB_ORDER.length - 1;
  const isResultTab = activeTab === 'result';

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleNext = () => {
    if (currentTabIndex < TAB_ORDER.length - 1) {
      setActiveTab(TAB_ORDER[currentTabIndex + 1]);
    }
  };

  const handleGenerate = async () => {
    if (!form.formState.focusKeyword.trim()) {
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('Starting generation...');

    try {
      const request = form.buildRequest();

      // Sync outline to backend if it exists (to save componentType edits)
      if (form.formState.outline?.outlineId && form.formState.outline.sections) {
        setGenerationStatus('Syncing outline...');
        const syncResult = await updateOutline(form.formState.outline.outlineId, {
          sections: form.formState.outline.sections,
          metadata: form.formState.outline.metadata,
        });
        if (!syncResult.success) {
          console.warn('Failed to sync outline, continuing with generation');
        }
      }

      const result = await startFullWorkflow(request);

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Failed to start workflow');
      }

      const workflow = await pollWorkflowUntilComplete(
        result.data.workflowId,
        (status: WorkflowState) => {
          const statusMessages: Record<string, string> = {
            pending: 'Starting...',
            researching: 'Researching topic...',
            outlining: 'Creating outline...',
            writing: 'Writing article...',
            editing: 'Editing content...',
            completed: 'Complete!',
            failed: 'Failed',
          };
          setGenerationStatus(statusMessages[status.status] || status.status);
        }
      );

      if (workflow.article) {
        setArticle(workflow.article);
        setActiveTab('result');
        onArticleCreated?.();
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setGenerationStatus(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return <DetailsTab form={form} />;
      case 'outline':
        return <OutlineTab form={form} />;
      case 'content':
        return <ContentTab form={form} />;
      case 'knowledge':
        return <KnowledgeTab form={form} />;
      case 'formatting':
        return <FormattingTab form={form} />;
      case 'structure':
        return <StructureTab form={form} />;
      case 'result':
        return <ResultTab article={article} />;
      default:
        return null;
    }
  };

  const canGenerate = form.formState.focusKeyword.trim().length > 0;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 flex flex-col">
          <DialogTitle className="sr-only">SEO Article Details</DialogTitle>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h1 className="text-xl font-semibold">SEO Article Details</h1>
              {isGenerating && (
                <p className="text-sm text-muted-foreground mt-1">
                  {generationStatus}
                </p>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              hasResult={article !== null}
            />
            <ScrollArea className="flex-1">
              {renderTabContent()}
            </ScrollArea>
          </div>

          {/* Footer */}
          <ModalFooter
            onCancel={handleCancel}
            onNext={handleNext}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            canGenerate={canGenerate}
            isLastTab={isLastTab}
            isResultTab={isResultTab}
          />
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
