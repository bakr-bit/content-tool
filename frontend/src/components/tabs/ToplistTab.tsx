import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, GripVertical, Pencil, Trash2, Table2, FolderOpen, Loader2, Library, ExternalLink } from 'lucide-react';
import { ToplistBuilder } from '@/components/toplist/ToplistBuilder';
import { ToplistPreview } from '@/components/toplist/ToplistPreview';
import { getToplists, getToplist } from '@/services/toplist-api';
import type { UseArticleFormReturn } from '@/hooks/useArticleForm';
import type { ArticleToplist, ToplistHeadingLevel, Toplist, ToplistEntry, ColumnDefinition } from '@/types/toplist';

interface ToplistTabProps {
  form: UseArticleFormReturn;
}

// Default columns for toplists loaded from API
const DEFAULT_COLUMNS: ColumnDefinition[] = [
  { id: 'rank', label: '#', type: 'number', brandAttribute: '_rank' },
  { id: 'name', label: 'Name', type: 'text', brandAttribute: 'name' },
  { id: 'bonus', label: 'Bonus', type: 'text', brandAttribute: 'bonus' },
  { id: 'rating', label: 'Rating', type: 'rating', brandAttribute: 'rating' },
];

export function ToplistTab({ form }: ToplistTabProps) {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingToplist, setEditingToplist] = useState<ArticleToplist | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Library state (now fetches from project's toplists in API)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [projectToplists, setProjectToplists] = useState<Toplist[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [loadingToplistSlug, setLoadingToplistSlug] = useState<string | null>(null);

  const toplists = form.formState.toplists || [];
  const projectId = form.formState.projectId;

  // Fetch project toplists when dialog opens
  useEffect(() => {
    if (isLibraryOpen && projectId) {
      setIsLoadingLibrary(true);
      getToplists(projectId)
        .then((result) => {
          if (result.success && result.data) {
            setProjectToplists(result.data.toplists);
          }
        })
        .finally(() => setIsLoadingLibrary(false));
    }
  }, [isLibraryOpen, projectId]);

  const handleAddToplist = () => {
    setEditingToplist(null);
    setIsBuilderOpen(true);
  };

  const handleEditToplist = (toplist: ArticleToplist) => {
    setEditingToplist(toplist);
    setIsBuilderOpen(true);
  };

  const handleDeleteToplist = (toplistId: string) => {
    form.removeToplist(toplistId);
  };

  const handleSaveToplist = (toplist: ArticleToplist) => {
    if (editingToplist) {
      // Preserve article integration settings, defaulting if not set
      form.updateToplist({
        ...toplist,
        includeInArticle: toplist.includeInArticle ?? editingToplist.includeInArticle ?? true,
        heading: toplist.heading ?? editingToplist.heading ?? toplist.name,
        headingLevel: toplist.headingLevel ?? editingToplist.headingLevel ?? 'h2',
      });
    } else {
      // New toplists are included by default with default heading
      form.addToplist({
        ...toplist,
        includeInArticle: true,
        heading: toplist.name,
        headingLevel: 'h2',
      });
    }
    setIsBuilderOpen(false);
    setEditingToplist(null);
  };

  const handleToggleInclude = (toplistId: string, include: boolean) => {
    const toplist = toplists.find((t) => t.toplistId === toplistId);
    if (toplist) {
      form.updateToplist({ ...toplist, includeInArticle: include });
    }
  };

  const handleHeadingChange = (toplistId: string, heading: string) => {
    const toplist = toplists.find((t) => t.toplistId === toplistId);
    if (toplist) {
      form.updateToplist({ ...toplist, heading });
    }
  };

  const handleHeadingLevelChange = (toplistId: string, headingLevel: ToplistHeadingLevel) => {
    const toplist = toplists.find((t) => t.toplistId === toplistId);
    if (toplist) {
      form.updateToplist({ ...toplist, headingLevel });
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newToplists = [...toplists];
    const draggedItem = newToplists[draggedIndex];
    newToplists.splice(draggedIndex, 1);
    newToplists.splice(index, 0, draggedItem);

    // Update positions
    const reordered = newToplists.map((t, i) => ({ ...t, position: i }));
    form.setToplists(reordered);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleLoadFromApi = async (toplist: Toplist) => {
    if (!projectId) return;

    setLoadingToplistSlug(toplist.slug);
    try {
      // Fetch the full toplist with resolved items
      const result = await getToplist(projectId, toplist.slug);

      if (result.success && result.data) {
        const resolved = result.data;

        // Convert API items to ToplistEntry format
        const entries: ToplistEntry[] = resolved.items.map((item, index) => ({
          entryId: `${toplist.slug}-${item.brandId}-${index}`,
          toplistId: toplist.id,
          brandId: item.brandId,
          rank: index + 1,
          createdAt: new Date().toISOString(),
          brand: {
            brandId: item.brandId,
            name: item.name,
            defaultLogo: item.logo,
            defaultBonus: item.bonus,
            defaultAffiliateUrl: item.affiliateUrl,
            defaultRating: item.rating,
            terms: item.terms,
            license: item.license,
            description: item.description,
            pros: item.pros,
            cons: item.cons,
          },
          attributeOverrides: {
            bonus: item.bonus || undefined,
            rating: item.rating || undefined,
            affiliateUrl: item.affiliateUrl || undefined,
            reviewUrl: item.reviewUrl || undefined,
            cta: item.cta || undefined,
          },
        }));

        // Create ArticleToplist from API data
        const newToplist: ArticleToplist = {
          toplistId: toplist.id,
          name: resolved.title || toplist.slug,
          columns: DEFAULT_COLUMNS,
          position: toplists.length,
          createdAt: toplist.createdAt || new Date().toISOString(),
          updatedAt: resolved.updatedAt,
          entries,
          includeInArticle: true,
          heading: resolved.title || toplist.slug,
          headingLevel: 'h2',
        };

        form.addToplist(newToplist);
        setIsLibraryOpen(false);
      }
    } finally {
      setLoadingToplistSlug(null);
    }
  };

  const handleOpenToplistManager = () => {
    // Open toplist manager in new tab - with site context if available
    const baseUrl = 'https://toplist-cms.vercel.app/dashboard';
    const url = projectId ? `${baseUrl}/sites/${projectId}` : baseUrl;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Toplists</h2>
          <p className="text-sm text-muted-foreground">
            Add comparison tables to your article from the Toplist API.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenToplistManager}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage Toplists
          </Button>
          {projectId && (
            <Button variant="outline" onClick={() => setIsLibraryOpen(true)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Load from API
            </Button>
          )}
          <Button onClick={handleAddToplist}>
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </div>
      </div>

      {!projectId && (
        <div className="bg-muted/50 border rounded-lg p-4 text-sm text-muted-foreground">
          <strong>Note:</strong> Select a project in the Details tab to load toplists from the API.
        </div>
      )}

      {toplists.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <Table2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No toplists yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {projectId
              ? 'Load a toplist from the API or create a new one.'
              : 'Select a project first, then load toplists from the API.'}
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" onClick={handleOpenToplistManager}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Toplists
            </Button>
            {projectId && (
              <Button variant="outline" onClick={() => setIsLibraryOpen(true)}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Load from API
              </Button>
            )}
            <Button onClick={handleAddToplist}>
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {toplists.map((toplist, index) => (
            <div
              key={toplist.toplistId}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`border rounded-lg p-4 bg-card transition-opacity ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="cursor-grab text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{toplist.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {toplist.entries?.length || 0} brands &middot;{' '}
                    {toplist.columns.length} columns
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`include-${toplist.toplistId}`}
                      checked={toplist.includeInArticle ?? false}
                      onCheckedChange={(checked) => handleToggleInclude(toplist.toplistId, checked)}
                    />
                    <Label
                      htmlFor={`include-${toplist.toplistId}`}
                      className={`text-sm cursor-pointer ${toplist.includeInArticle ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {toplist.includeInArticle ? 'Included' : 'Excluded'}
                    </Label>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditToplist(toplist)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteToplist(toplist.toplistId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Heading configuration - only shown when included */}
              {toplist.includeInArticle && (
                <div className="flex items-center gap-3 mb-3 pl-8">
                  <div className="flex-1">
                    <Label htmlFor={`heading-${toplist.toplistId}`} className="text-xs text-muted-foreground mb-1 block">
                      Section Heading
                    </Label>
                    <Input
                      id={`heading-${toplist.toplistId}`}
                      value={toplist.heading || toplist.name}
                      onChange={(e) => handleHeadingChange(toplist.toplistId, e.target.value)}
                      placeholder="Enter section heading..."
                      className="h-8"
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Level
                    </Label>
                    <Select
                      value={toplist.headingLevel || 'h2'}
                      onValueChange={(value) => handleHeadingLevelChange(toplist.toplistId, value as ToplistHeadingLevel)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="h2">H2</SelectItem>
                        <SelectItem value="h3">H3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {toplist.entries && toplist.entries.length > 0 && (
                <ToplistPreview toplist={toplist} compact />
              )}
            </div>
          ))}
        </div>
      )}

      <ToplistBuilder
        open={isBuilderOpen}
        onOpenChange={setIsBuilderOpen}
        toplist={editingToplist}
        onSave={handleSaveToplist}
      />

      {/* Load from API Dialog */}
      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Load Toplist from API
            </DialogTitle>
            <DialogDescription>
              Select a toplist from your project to add to this article.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {isLoadingLibrary ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : projectToplists.length === 0 ? (
              <div className="text-center py-12">
                <Library className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No toplists found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create toplists in the Toplist Manager first.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setIsLibraryOpen(false);
                    handleOpenToplistManager();
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Toplist Manager
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {projectToplists.map((toplist) => (
                  <div
                    key={toplist.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{toplist.title || toplist.slug}</h4>
                        <p className="text-sm text-muted-foreground">
                          Slug: {toplist.slug}
                          {toplist.itemCount !== undefined && (
                            <> &middot; {toplist.itemCount} items</>
                          )}
                          {toplist.updatedAt && (
                            <> &middot; Updated {new Date(toplist.updatedAt).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLoadFromApi(toplist)}
                        disabled={loadingToplistSlug === toplist.slug}
                      >
                        {loadingToplistSlug === toplist.slug ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Load
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
