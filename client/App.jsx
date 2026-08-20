import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import UploadPage from './pages/Upload';
import Dashboard from './pages/Dashboard';
import RagChatModal from './components/RagChatModal';
import { Bot, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [isRagChatOpen, setIsRagChatOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedDocForChat, setSelectedDocForChat] = useState(null);

  // Fetch documents for the RAG selector
  useEffect(() => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDocuments(data.data || []);
        }
      })
      .catch(err => console.warn('App docs fetch error:', err));
  }, [activePage, isRagChatOpen]);

  const openRagChat = (doc = null) => {
    if (doc) setSelectedDocForChat(doc);
    setIsRagChatOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] bg-gradient-to-br from-[#ECFEFF] via-[#F0F9FF] to-[#F5F3FF] text-slate-800 flex flex-col font-sans selection:bg-teal-200 selection:text-slate-900 relative overflow-x-hidden">
      
      {/* Ambient Soft Glow Blobs for Background Depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-[#99F6E4] opacity-25 blur-3xl"></div>
        <div className="absolute top-1/3 -right-20 w-[30rem] h-[30rem] rounded-full bg-[#BFDBFE] opacity-25 blur-3xl"></div>
        <div className="absolute -bottom-20 left-1/4 w-[28rem] h-[28rem] rounded-full bg-[#DDD6FE] opacity-20 blur-3xl"></div>
      </div>

      {/* Navigation Header */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        onOpenRagChat={() => openRagChat()}
      />

      {/* Main Page Container with Smooth Motion Transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {activePage === 'home' && <Home setActivePage={setActivePage} onOpenRagChat={openRagChat} />}
            {activePage === 'upload' && <UploadPage setActivePage={setActivePage} onOpenRagChat={openRagChat} />}
            {activePage === 'dashboard' && <Dashboard setActivePage={setActivePage} onOpenRagChat={openRagChat} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating RAG Assistant Trigger Button */}
      <motion.button
        id="floating-rag-btn"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => openRagChat()}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-xl bg-teal-400 hover:bg-teal-500 text-white text-xs font-medium shadow-md shadow-teal-500/15 flex items-center gap-2 border border-teal-300/60 group transition-all"
      >
        <div className="p-1 rounded-lg bg-white/20 group-hover:rotate-12 transition-transform">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <span>Ask RAG AI</span>
        <Sparkles className="w-3.5 h-3.5 text-white/80" />
      </motion.button>

      {/* RAG Chat Modal */}
      <RagChatModal
        isOpen={isRagChatOpen}
        onClose={() => setIsRagChatOpen(false)}
        document={selectedDocForChat}
        documents={documents}
      />

      {/* Modern 3-Column Footer */}
      <Footer setActivePage={setActivePage} onOpenRagChat={openRagChat} />

    </div>
  );
}

