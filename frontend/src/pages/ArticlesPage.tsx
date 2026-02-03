import { useState, useEffect, useCallback } from 'react';
import type { ArticleWithStatus, ListArticlesQuery } from '@/types/article';
import { getArticles, deleteArticle } from '@/services/api';
import { ArticlesDataTable } from '@/components/articles/ArticlesDataTable';
import { ArticleToolbar } from '@/components/articles/ArticleToolbar';
import { ArticlePagination } from '@/components/articles/ArticlePagination';
import { ArticleModal } from '@/components/article-modal/ArticleModal';
import { ArticleViewDialog } from '@/components/articles/ArticleViewDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function ArticlesPage() {
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
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

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
    fetchArticles();
  }, [fetchArticles]);

  const handleDelete = async (articleId: string) => {
    try {
      await deleteArticle(articleId);
      fetchArticles();
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

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Articles</h1>
          <p className="text-zinc-400">
            Manage your generated articles
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Article
        </Button>
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

      {/* Article Modal */}
      <ArticleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onArticleCreated={fetchArticles}
      />

      {/* Article View Dialog */}
      <ArticleViewDialog
        article={viewingArticle}
        open={!!viewingArticle}
        onOpenChange={(open) => !open && setViewingArticle(null)}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
