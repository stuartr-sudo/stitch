import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import VideoAdvertCreator from './pages/VideoAdvertCreator';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VideoAdvertCreator />} />
      </Routes>
      <Toaster position="bottom-right" />
    </BrowserRouter>
  );
}

export default App;
