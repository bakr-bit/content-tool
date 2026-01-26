import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight } from 'lucide-react';

interface ModalFooterProps {
  onCancel: () => void;
  onNext: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
  isLastTab: boolean;
  isResultTab: boolean;
}

export function ModalFooter({
  onCancel,
  onNext,
  onGenerate,
  isGenerating,
  canGenerate,
  isLastTab,
  isResultTab,
}: ModalFooterProps) {
  return (
    <div className="flex items-center justify-end border-t p-4 bg-muted/30">
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isGenerating}
        >
          {isResultTab ? 'Close' : 'Cancel'}
        </Button>
        {!isResultTab && (
          isLastTab ? (
            <Button
              onClick={onGenerate}
              disabled={!canGenerate || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Article'
              )}
            </Button>
          ) : (
            <Button onClick={onNext}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )
        )}
      </div>
    </div>
  );
}
