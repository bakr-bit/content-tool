import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { ArticleWithStatus, ListArticlesQuery } from '@/types/article';
import type { ProjectWithCount } from '@/types/project';
import { getProject, getArticles, deleteArticle, updateProject, deleteProject } from '@/services/api';
import { ArticlesDataTable } from '@/components/articles/ArticlesDataTable';
import { ArticleToolbar } from '@/components/articles/ArticleToolbar';
import { ArticlePagination } from '@/components/articles/ArticlePagination';
import { ArticleModal } from '@/components/article-modal/ArticleModal';
import { ArticleViewDialog } from '@/components/articles/ArticleViewDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, ChevronLeft, Pencil, Trash2, Loader2, ChevronDown, X, Languages, Users, Upload, Mic } from 'lucide-react';
import { TONE_NAMES, POV_NAMES, FORMALITY_NAMES } from '@/types/article';
import type { ToneOfVoice, PointOfView, Formality } from '@/types/article';
import { Flag } from '@/components/ui/flag';
import { ImportArchitectureDialog } from '@/components/content-plan/ImportArchitectureDialog';
import { ContentPlanTable } from '@/components/content-plan/ContentPlanTable';
import { ContentPlanPageDialog } from '@/components/content-plan/ContentPlanPageDialog';
import { useContentPlan } from '@/hooks/useContentPlan';
import type { ContentPlanPage as ContentPlanPageType } from '@/types/content-plan';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectWithCount | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [articles, setArticles] = useState<ArticleWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingArticle, setViewingArticle] = useState<ArticleWithStatus | null>(null);
  const [query, setQuery] = useState<ListArticlesQuery>({
    page: 1,
    limit: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
    projectId: projectId,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGeo, setEditGeo] = useState('');
  const [editLanguage, setEditLanguage] = useState('');
  const [editAuthorInput, setEditAuthorInput] = useState('');
  const [editAuthors, setEditAuthors] = useState<string[]>([]);
  const [editTone, setEditTone] = useState<string>('');
  const [editPointOfView, setEditPointOfView] = useState<string>('');
  const [editFormality, setEditFormality] = useState<string>('');
  const [editCustomTonePrompt, setEditCustomTonePrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Content plan
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<ContentPlanPageType | null>(null);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const contentPlan = useContentPlan(projectId);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;

    setProjectLoading(true);
    setProjectError(null);
    try {
      const result = await getProject(projectId);
      if (result.success && result.data) {
        setProject(result.data);
      } else {
        setProjectError(result.error?.message || 'Failed to fetch site');
      }
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Failed to fetch site');
    } finally {
      setProjectLoading(false);
    }
  }, [projectId]);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getArticles(query);
      setArticles(result.articles);
      setPagination({
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (projectId) {
      setQuery((prev) => ({ ...prev, projectId }));
    }
  }, [projectId]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleDelete = async (articleId: string) => {
    try {
      await deleteArticle(articleId);
      fetchArticles();
      fetchProject(); // Update article count
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete article');
    }
  };

  const handleUpdate = (updatedArticle: ArticleWithStatus) => {
    setArticles((prev) =>
      prev.map((article) =>
        article.articleId === updatedArticle.articleId ? updatedArticle : article
      )
    );
  };

  const handleSearch = (keyword: string) => {
    setQuery((prev) => ({ ...prev, keyword: keyword || undefined, page: 1 }));
  };

  const handleStatusFilter = (status: string | undefined) => {
    setQuery((prev) => ({
      ...prev,
      status: status as ListArticlesQuery['status'],
      page: 1,
    }));
  };

  const handleSort = (sortBy: ListArticlesQuery['sortBy'], sortOrder: ListArticlesQuery['sortOrder']) => {
    setQuery((prev) => ({ ...prev, sortBy, sortOrder }));
  };

  const handlePageChange = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  const handleEditOpen = () => {
    if (project) {
      setEditName(project.name);
      setEditDescription(project.description || '');
      setEditGeo(project.geo || '');
      setEditLanguage(project.language || '');
      setEditAuthors(project.authors || []);
      setEditTone(project.tone || '');
      setEditPointOfView(project.pointOfView || '');
      setEditFormality(project.formality || '');
      setEditCustomTonePrompt(project.customTonePrompt || '');
      setShowAdvanced(
        !!(project.geo || project.language || project.authors?.length || project.tone || project.pointOfView || project.formality)
      );
      setEditDialogOpen(true);
    }
  };

  const handleAddEditAuthor = () => {
    const trimmed = editAuthorInput.trim();
    if (trimmed && !editAuthors.includes(trimmed)) {
      setEditAuthors([...editAuthors, trimmed]);
      setEditAuthorInput('');
    }
  };

  const handleRemoveEditAuthor = (author: string) => {
    setEditAuthors(editAuthors.filter((a) => a !== author));
  };

  const handleEditAuthorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEditAuthor();
    }
  };

  const handleEditSave = async () => {
    if (!projectId || !editName.trim()) return;

    setIsUpdating(true);
    try {
      const result = await updateProject(projectId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        geo: editGeo.trim() || undefined,
        language: editLanguage.trim() || undefined,
        authors: editAuthors.length > 0 ? editAuthors : undefined,
        tone: editTone || undefined,
        pointOfView: editPointOfView || undefined,
        formality: editFormality || undefined,
        customTonePrompt: editCustomTonePrompt.trim() || undefined,
      });

      if (result.success && result.data) {
        setProject(result.data);
        setEditDialogOpen(false);
      } else {
        setProjectError(result.error?.message || 'Failed to update site');
      }
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Failed to update site');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!projectId) return;

    setIsDeleting(true);
    try {
      const result = await deleteProject(projectId);

      if (result.success) {
        navigate('/');
      } else {
        setProjectError(result.error?.message || 'Failed to delete site');
        setDeleteDialogOpen(false);
      }
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Failed to delete site');
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (projectLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6">
          <ChevronLeft className="h-4 w-4" />
          Back to Sites
        </Link>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {projectError || 'Site not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Sites
          </Link>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          {project.description && (
            <p className="text-zinc-400">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import Architecture
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Article
          </Button>
        </div>
      </div>

      {/* Project Details */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                <span>
                  {project.articleCount} {project.articleCount === 1 ? 'article' : 'articles'}
                </span>
                {project.geo && (
                  <span className="flex items-center gap-1">
                    <Flag country={project.geo} size="sm" />
                    {project.geo}
                  </span>
                )}
                {project.language && (
                  <span className="flex items-center gap-1">
                    <Languages className="h-3.5 w-3.5" />
                    {project.language}
                  </span>
                )}
                {project.authors && project.authors.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {project.authors.join(', ')}
                  </span>
                )}
                {(project.tone || project.pointOfView || project.formality) && (
                  <span className="flex items-center gap-1">
                    <Mic className="h-3.5 w-3.5" />
                    {[
                      project.tone && TONE_NAMES[project.tone as ToneOfVoice],
                      project.pointOfView && POV_NAMES[project.pointOfView as PointOfView],
                      project.formality && project.formality !== 'automatic' && FORMALITY_NAMES[project.formality as Formality],
                    ].filter(Boolean).join(' / ')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleEditOpen}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={project.articleCount > 0}
                title={project.articleCount > 0 ? 'Remove all articles before deleting' : undefined}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Content Plan Section */}
        {contentPlan.pages.length > 0 && (
          <div className="mb-6 space-y-2">
            <h2 className="text-lg font-semibold text-white">Content Plan</h2>
            {contentPlan.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {contentPlan.error}
              </div>
            )}
            <ContentPlanTable
              pages={contentPlan.pages}
              stats={contentPlan.stats}
              batchRunning={!!contentPlan.batchStatus?.running}
              projectGeo={project.geo}
              projectLanguage={project.language}
              onGenerateSingle={contentPlan.generateSingle}
              onGenerateBatch={contentPlan.generateBatch}
              onCancelBatch={contentPlan.cancelBatch}
              onUpdatePage={contentPlan.updatePage}
              onDeletePage={contentPlan.deletePage}
              onClearAll={contentPlan.clearPages}
              onPageClick={(page) => {
                setSelectedPage(page);
                setPageDialogOpen(true);
              }}
            />
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <ArticleToolbar
            onSearch={handleSearch}
            onStatusFilter={handleStatusFilter}
            currentStatus={query.status}
          />

          <ArticlesDataTable
            articles={articles}
            loading={loading}
            sortBy={query.sortBy}
            sortOrder={query.sortOrder}
            onSort={handleSort}
            onDelete={handleDelete}
            onView={setViewingArticle}
          />

          {pagination.totalPages > 1 && (
            <ArticlePagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={handlePageChange}
            />
          )}
        </div>

      {/* Import Architecture Dialog */}
      <ImportArchitectureDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={contentPlan.importPages}
      />

      {/* Content Plan Page Dialog */}
      <ContentPlanPageDialog
        page={selectedPage}
        open={pageDialogOpen}
        onOpenChange={setPageDialogOpen}
        onUpdated={() => {
          contentPlan.refreshPages();
          fetchArticles();
        }}
      />

      {/* Article Modal - pre-fill projectId */}
      <ArticleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onArticleCreated={() => {
          fetchArticles();
          fetchProject();
        }}
        defaultProjectId={projectId}
      />

      {/* Article View Dialog */}
      <ArticleViewDialog
        article={viewingArticle}
        open={!!viewingArticle}
        onOpenChange={(open) => !open && setViewingArticle(null)}
        onUpdate={handleUpdate}
      />

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Site</DialogTitle>
            <DialogDescription>
              Update the site settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={isUpdating}
                rows={3}
              />
            </div>

            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  Additional Settings
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-geo">GEO</Label>
                    <Input
                      id="edit-geo"
                      placeholder="e.g., US, UK, DE"
                      value={editGeo}
                      onChange={(e) => setEditGeo(e.target.value)}
                      disabled={isUpdating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-language">Language</Label>
                    <Input
                      id="edit-language"
                      placeholder="e.g., English, German"
                      value={editLanguage}
                      onChange={(e) => setEditLanguage(e.target.value)}
                      disabled={isUpdating}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Authors</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add author name"
                      value={editAuthorInput}
                      onChange={(e) => setEditAuthorInput(e.target.value)}
                      onKeyDown={handleEditAuthorKeyDown}
                      disabled={isUpdating}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddEditAuthor}
                      disabled={isUpdating || !editAuthorInput.trim()}
                    >
                      Add
                    </Button>
                  </div>
                  {editAuthors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {editAuthors.map((author) => (
                        <Badge key={author} variant="secondary" className="gap-1">
                          {author}
                          <button
                            type="button"
                            onClick={() => handleRemoveEditAuthor(author)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Voice Settings */}
                <div className="space-y-3 pt-2 border-t border-zinc-800">
                  <Label className="text-sm font-medium">Voice Settings</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Tone</Label>
                      <Select value={editTone} onValueChange={setEditTone}>
                        <SelectTrigger>
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TONE_NAMES).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Point of View</Label>
                      <Select value={editPointOfView} onValueChange={setEditPointOfView}>
                        <SelectTrigger>
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(POV_NAMES).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Formality</Label>
                      <Select value={editFormality} onValueChange={setEditFormality}>
                        <SelectTrigger>
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(FORMALITY_NAMES).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {editTone === 'custom' && (
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-400">Custom Tone Prompt</Label>
                      <Textarea
                        placeholder="Describe the custom tone..."
                        value={editCustomTonePrompt}
                        onChange={(e) => setEditCustomTonePrompt(e.target.value)}
                        disabled={isUpdating}
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={isUpdating || !editName.trim()}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
