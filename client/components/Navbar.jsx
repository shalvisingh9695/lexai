import React, { useState } from 'react';
import { Scale, Upload, LayoutDashboard, Home, Bot, Menu, X, Sparkles, ShieldAlert, GitCompare } from 'lucide-react';

export default function Navbar({ activePage, setActivePage, onOpenRagChat }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload Document', icon: Upload },
    { id: 'risk', label: 'Risk Analysis', icon: ShieldAlert },
    { id: 'compare', label: 'Compare Documents', icon: GitCompare },
  ];

  const handleNavigate = (pageId) => {
    if (pageId === 'risk' || pageId === 'compare') {
      setActivePage('dashboard');
    } else {
      setActivePage(pageId);
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 px-4 lg:px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 border-t-2 border-teal-300 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo - Left Side */}
        <button 
          onClick={() => handleNavigate('home')}
          className="flex items-center gap-3 group focus:outline-none text-left"
          id="nav-logo-btn"
        >
          <div className="w-9 h-9 rounded-lg bg-teal-400 text-white flex items-center justify-center shadow-xs group-hover:bg-teal-500 transition-colors">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900">
                LexAI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 -mt-0.5 font-normal">Legal Document Intelligence</p>
          </div>
        </button>

        {/* Right Action & Sidebar Toggle Button */}
        <div className="flex items-center gap-3">
          <button
            id="nav-rag-chat-quick-btn"
            onClick={onOpenRagChat}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-all shadow-xs"
          >
            <Bot className="w-3.5 h-3.5 text-teal-500" />
            <span>RAG AI</span>
          </button>

          <div className="relative">
            <button
              id="nav-toggle-menu-btn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-9 h-9 rounded-lg bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all border border-slate-200 flex items-center justify-center shadow-xs"
              aria-label="Toggle Navigation Menu"
              title="Menu"
            >
              {isMenuOpen ? (
                <X className="w-4 h-4 text-slate-700" />
              ) : (
                <Menu className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Sidebar / Navigation Drawer */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 p-2 shadow-lg animate-fadeIn z-50 space-y-1">
                <div className="px-3 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-teal-500" />
                    <span>Main Navigation</span>
                  </p>
                  <button 
                    onClick={() => handleNavigate('home')}
                    className="text-[10px] font-medium text-teal-600 hover:underline"
                  >
                    Home
                  </button>
                </div>

                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`menu-${item.id}-btn`}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all ${
                        isActive
                          ? 'bg-teal-50 text-teal-600 font-medium border border-teal-200'
                          : 'text-slate-700 hover:text-blue-500 hover:bg-slate-50 transition'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-teal-500' : 'text-blue-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                <div className="pt-1 border-t border-slate-100 mt-1">
                  <button
                    id="menu-rag-chat-btn"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenRagChat();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-white bg-teal-400 hover:bg-teal-500 transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-white" />
                      <span>RAG Assistant</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white font-mono">
                      AI
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}

