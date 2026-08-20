import React from 'react';
import { Scale } from 'lucide-react';

export default function Footer({ setActivePage }) {
  return (
    <footer className="bg-gradient-to-r from-[#F0FDFA] via-[#EFF6FF] to-[#F5F3FF] border-t border-slate-200 py-10 px-6 mt-16 text-sm text-slate-600 shadow-[0_-2px_20px_rgba(0,0,0,0.03)] relative z-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 3 Columns Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Column 1: LexAI */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-400 text-white flex items-center justify-center shadow-xs">
                <Scale className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-900">LexAI</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed max-w-xs">
              AI-powered legal intelligence
            </p>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-3">
            <h4 className="text-slate-900 font-semibold text-sm">Product</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <button
                  id="footer-link-dashboard"
                  onClick={() => setActivePage('dashboard')}
                  className="hover:text-teal-500 transition-colors text-left"
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  id="footer-link-risk-analysis"
                  onClick={() => setActivePage('dashboard')}
                  className="hover:text-teal-500 transition-colors text-left"
                >
                  Risk Analysis
                </button>
              </li>
              <li>
                <button
                  id="footer-link-compare"
                  onClick={() => setActivePage('dashboard')}
                  className="hover:text-teal-500 transition-colors text-left"
                >
                  Compare
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div className="space-y-3">
            <h4 className="text-slate-900 font-semibold text-sm">Company</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <button
                  id="footer-link-about"
                  onClick={() => setActivePage('home')}
                  className="hover:text-teal-500 transition-colors text-left"
                >
                  About
                </button>
              </li>
              <li>
                <span className="cursor-pointer hover:text-teal-500 transition-colors">
                  Privacy
                </span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-teal-500 transition-colors">
                  Terms
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Line */}
        <div className="pt-6 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 LexAI</p>
        </div>
      </div>
    </footer>
  );
}

