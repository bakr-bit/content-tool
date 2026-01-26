import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ArticlesPage } from '@/pages/ArticlesPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ArticlesPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
