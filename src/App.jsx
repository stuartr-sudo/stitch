import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import VideoAdvertCreator from './pages/VideoAdvertCreator';
import SetupKeys from './pages/SetupKeys';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VideoAdvertCreator />} />
        <Route path="/setup" element={<SetupKeys />} />
      </Routes>
      <Toaster position="bottom-right" />
    </BrowserRouter>
  );
}

export default App;
