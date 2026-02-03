import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { ArticleModal } from '@/components/article-modal/ArticleModal';
import { Plus, FileText, FolderPlus, Loader2, LogOut } from 'lucide-react';
import { getProjects } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { ProjectWithCount } from '@/types/project';

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const { logout } = useAuth();

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
            <div className="flex items-center gap-2">
              {hasProjects && (
                <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              )}
              <Button onClick={() => setArticleModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Article
              </Button>
              <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-muted-foreground">
              Organize your content into projects
            </p>
          </div>
          <Link to="/articles" className="text-sm text-muted-foreground hover:text-foreground">
            View All Articles
          </Link>
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
          <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed rounded-lg">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FolderPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first project to start organizing your articles.
              Projects help you group related content together.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Project
            </Button>
          </div>
        )}
      </main>

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
