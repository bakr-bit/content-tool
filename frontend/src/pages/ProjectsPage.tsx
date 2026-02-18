import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { ArticleModal } from '@/components/article-modal/ArticleModal';
import { Plus, FolderPlus, Loader2 } from 'lucide-react';
import { getProjects } from '@/services/api';
import type { ProjectWithCount } from '@/types/project';

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [articleModalOpen, setArticleModalOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProjects();
      if (result.success && result.data) {
        setProjects(result.data.projects);
      } else {
        setError(result.error?.message || 'Failed to fetch projects');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const hasProjects = projects.length > 0;

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sites</h1>
          <p className="text-zinc-400">
            Organize your content by site
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasProjects && (
            <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              New Site
            </Button>
          )}
          <Button onClick={() => setArticleModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Article
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : hasProjects ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.projectId} project={project} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-zinc-700 rounded-lg">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <FolderPlus className="w-8 h-8 text-zinc-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No sites yet</h2>
          <p className="text-zinc-400 text-center mb-6 max-w-md">
            Create your first site to start organizing your articles.
            Sites help you group related content together.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Site
          </Button>
        </div>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onProjectCreated={fetchProjects}
      />

      {/* Article Modal */}
      <ArticleModal
        open={articleModalOpen}
        onOpenChange={setArticleModalOpen}
        onArticleCreated={fetchProjects}
      />
    </div>
  );
}
