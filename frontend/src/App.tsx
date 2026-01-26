import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { ArticlesPage } from '@/pages/ArticlesPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
