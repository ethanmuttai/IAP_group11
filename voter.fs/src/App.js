import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Candidates from './pages/Candidates'; 
import CandidateDetail from './pages/CandidateDetail';
import Compare from './pages/Compare';

function App() {
  return (
    <BrowserRouter>
      <Routes>
       
        <Route path="/" element={<Layout />}>
          
          <Route index element={<Home />} />
          
          
          <Route path="candidates" element={<Candidates />} /> 
          
          
          <Route path="candidates/:id" element={<CandidateDetail />} />
          
          
          <Route path="compare" element={<Compare />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;