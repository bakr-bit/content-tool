import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { ArticleWithStatus, ListArticlesQuery } from '@/types/article';
import type { ProjectWithCount } from '@/types/project';
import type { ToplistTemplate } from '@/types/toplist';
import { getProject, getArticles, deleteArticle, updateProject, deleteProject } from '@/services/api';
import { getTemplates } from '@/services/toplist-api';
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
import { Plus, FileText, ChevronLeft, Pencil, Trash2, Loader2, ChevronDown, X, Globe, Languages, Users } from 'lucide-react';

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
  const [editSelectedTemplateIds, setEditSelectedTemplateIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<ToplistTemplate[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load templates on mount
  useEffect(() => {
    getTemplates().then((result) => {
      if (result.success && result.data) {
        setTemplates(result.data.templates);
      }
    });
  }, []);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;

    setProjectLoading(true);
    setProjectError(null);
    try {
      const result = await getProject(projectId);
      if (result.success && result.data) {
        setProject(result.data);
      } else {
        setProjectError(result.error?.message || 'Failed to fetch project');
      }
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Failed to fetch project');
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
      setEditSelectedTemplateIds(project.defaultToplistIds || []);
      setShowAdvanced(
        !!(project.geo || project.language || project.authors?.length || project.defaultToplistIds?.length)
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

  const toggleEditTemplate = (templateId: string) => {
    if (editSelectedTemplateIds.includes(templateId)) {
      setEditSelectedTemplateIds(editSelectedTemplateIds.filter((id) => id !== templateId));
    } else {
      setEditSelectedTemplateIds([...editSelectedTemplateIds, templateId]);
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
        defaultToplistIds: editSelectedTemplateIds.length > 0 ? editSelectedTemplateIds : undefined,
      });

      if (result.success && result.data) {
        setProject(result.data);
        setEditDialogOpen(false);
      } else {
        setProjectError(result.error?.message || 'Failed to update project');
      }
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Failed to update project');
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
        setProjectError(result.error?.message || 'Failed to delete project');
        setDeleteDialogOpen(false);
      }
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Failed to delete project');
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
              Back to Projects
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-6 py-8">
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            {projectError || 'Project not found'}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold">Content Tool</span>
            </div>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Article
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        {/* Project Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              {project.description && (
                <p className="text-muted-foreground">{project.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {project.articleCount} {project.articleCount === 1 ? 'article' : 'articles'}
                </span>
                {project.geo && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
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
              </div>
              {project.defaultToplistIds && project.defaultToplistIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {project.defaultToplistIds.map((id) => {
                    const template = templates.find((t) => t.templateId === id);
                    return (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {template?.name || id}
                      </Badge>
                    );
                  })}
                </div>
              )}
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
      </main>

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
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the project settings.
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

                <div className="space-y-2">
                  <Label>Default Toplist Templates</Label>
                  <p className="text-xs text-muted-foreground">
                    Select templates to use by default when creating toplists
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {templates.map((template) => (
                      <Badge
                        key={template.templateId}
                        variant={editSelectedTemplateIds.includes(template.templateId) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleEditTemplate(template.templateId)}
                      >
                        {template.name}
                      </Badge>
                    ))}
                  </div>
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
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
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
