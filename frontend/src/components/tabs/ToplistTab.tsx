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
import { Plus, GripVertical, Pencil, Trash2, Table2, FolderOpen, Save, Loader2, Library } from 'lucide-react';
import { ToplistBuilder } from '@/components/toplist/ToplistBuilder';
import { ToplistPreview } from '@/components/toplist/ToplistPreview';
import { getLibraryToplists, saveToLibrary, loadFromLibrary, getToplist } from '@/services/toplist-api';
import type { UseArticleFormReturn } from '@/hooks/useArticleForm';
import type { ArticleToplist, ToplistHeadingLevel, Toplist } from '@/types/toplist';

interface ToplistTabProps {
  form: UseArticleFormReturn;
}

export function ToplistTab({ form }: ToplistTabProps) {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingToplist, setEditingToplist] = useState<ArticleToplist | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Library state
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryToplists, setLibraryToplists] = useState<Toplist[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [savingToplistId, setSavingToplistId] = useState<string | null>(null);
  const [loadingToplistId, setLoadingToplistId] = useState<string | null>(null);

  const toplists = form.formState.toplists || [];

  // Fetch library toplists when dialog opens
  useEffect(() => {
    if (isLibraryOpen) {
      setIsLoadingLibrary(true);
      getLibraryToplists()
        .then((result) => {
          if (result.success && result.data) {
            setLibraryToplists(result.data.toplists);
          }
        })
        .finally(() => setIsLoadingLibrary(false));
    }
  }, [isLibraryOpen]);

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
      form.updateToplist(toplist);
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

  const handleSaveToLibrary = async (toplistId: string) => {
    setSavingToplistId(toplistId);
    try {
      const result = await saveToLibrary(toplistId);
      if (result.success) {
        // Refresh library if dialog is open
        if (isLibraryOpen) {
          const libraryResult = await getLibraryToplists();
          if (libraryResult.success && libraryResult.data) {
            setLibraryToplists(libraryResult.data.toplists);
          }
        }
      }
    } finally {
      setSavingToplistId(null);
    }
  };

  const handleLoadFromLibrary = async (libraryToplistId: string) => {
    setLoadingToplistId(libraryToplistId);
    try {
      // Load the full toplist with entries
      const fullToplistResult = await getToplist(libraryToplistId);
      if (!fullToplistResult.success || !fullToplistResult.data) {
        return;
      }

      // Load it as a new toplist (creates a copy)
      const result = await loadFromLibrary(libraryToplistId, {
        position: toplists.length,
      });

      if (result.success && result.data) {
        // Fetch the full toplist with entries
        const loadedResult = await getToplist(result.data.toplistId);
        if (loadedResult.success && loadedResult.data) {
          const newToplist: ArticleToplist = {
            ...loadedResult.data,
            entries: loadedResult.data.entries || fullToplistResult.data.entries || [],
            includeInArticle: true,
            heading: loadedResult.data.name,
            headingLevel: 'h2',
          };
          form.addToplist(newToplist);
          setIsLibraryOpen(false);
        }
      }
    } finally {
      setLoadingToplistId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Toplists</h2>
          <p className="text-sm text-muted-foreground">
            Create comparison tables for your article.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsLibraryOpen(true)}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Load from Library
          </Button>
          <Button onClick={handleAddToplist}>
            <Plus className="h-4 w-4 mr-2" />
            Add Toplist
          </Button>
        </div>
      </div>

      {toplists.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <Table2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No toplists yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a new toplist or load one from your library.
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" onClick={() => setIsLibraryOpen(true)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Load from Library
            </Button>
            <Button onClick={handleAddToplist}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Toplist
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
                      onClick={() => handleSaveToLibrary(toplist.toplistId)}
                      disabled={savingToplistId === toplist.toplistId}
                      title="Save to library for reuse"
                    >
                      {savingToplistId === toplist.toplistId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
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

      {/* Library Dialog */}
      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Toplist Library
            </DialogTitle>
            <DialogDescription>
              Select a saved toplist to load into your article. A copy will be created.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {isLoadingLibrary ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : libraryToplists.length === 0 ? (
              <div className="text-center py-12">
                <Library className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No saved toplists</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create a toplist and click the save icon to add it to your library.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {libraryToplists.map((toplist) => (
                  <div
                    key={toplist.toplistId}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{toplist.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {toplist.columns.length} columns
                          {toplist.createdAt && (
                            <> &middot; Created {new Date(toplist.createdAt).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLoadFromLibrary(toplist.toplistId)}
                        disabled={loadingToplistId === toplist.toplistId}
                      >
                        {loadingToplistId === toplist.toplistId ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Load
                      </Button>
                    </div>
                    {toplist.columns.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {toplist.columns.slice(0, 6).map((col) => (
                          <span
                            key={col.id}
                            className="text-xs bg-muted px-2 py-0.5 rounded"
                          >
                            {col.label}
                          </span>
                        ))}
                        {toplist.columns.length > 6 && (
                          <span className="text-xs text-muted-foreground">
                            +{toplist.columns.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
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
