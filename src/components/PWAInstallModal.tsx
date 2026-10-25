import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  X,
  Share2,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'install' | 'apk'>('install');

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0D1117]/85 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#151B23] border border-[#263040] rounded-lg max-w-lg w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#1C2430] border-b border-[#263040] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-[#10B981]/15 text-[#10B981]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#F8FAFC]">
                Install on Android &amp; Phone
              </h2>
              <p className="text-[11px] sm:text-xs text-[#94A3B8]">
                Progressive Web App · Standalone Full-Screen Experience
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#263040] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-[#263040] bg-[#0F141A] text-xs shrink-0">
          <button
            onClick={() => setActiveTab('install')}
            className={`flex-1 py-2.5 text-center font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'install'
                ? 'border-[#F59E0B] text-[#F8FAFC] bg-[#151B23]'
                : 'border-transparent text-[#94A3B8] hover:text-[#CBD5E1]'
            }`}
          >
            1. Install on Phone
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2.5 text-center font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'apk'
                ? 'border-[#F59E0B] text-[#F8FAFC] bg-[#151B23]'
                : 'border-transparent text-[#94A3B8] hover:text-[#CBD5E1]'
            }`}
          >
            2. Build Native APK
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs text-[#CBD5E1] overflow-y-auto flex-1">
          {activeTab === 'install' && (
            <>
              {isInstalled || installSuccess ? (
                <div className="p-4 rounded-md bg-[#10B981]/10 border border-[#10B981]/30 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
                  <div className="text-sm font-bold text-[#F8FAFC]">
                    App Already Installed on Phone!
                  </div>
                  <p className="text-xs text-[#CBD5E1]">
                    CloudCraft is installed on your device. You can launch it directly from your home screen or app drawer.
                  </p>
                </div>
              ) : (
                <>
                  {/* One-Click Direct Install Button (When browser provides beforeinstallprompt) */}
                  {isInstallable ? (
                    <div className="p-4 rounded-md bg-[#0F141A] border border-[#10B981]/40 text-center space-y-3">
                      <div className="text-sm font-bold text-[#F8FAFC] flex items-center justify-center gap-2">
                        <Zap className="w-4 h-4 text-[#F59E0B]" />
                        <span>Ready for 1-Tap Installation</span>
                      </div>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">
                        Chrome has verified this app. Tap below to install CloudCraft directly to your phone screen:
                      </p>
                      <button
                        onClick={handleInstallClick}
                        className="w-full py-3 px-4 rounded-md bg-[#10B981] hover:bg-[#059669] text-[#0F141A] font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
                      >
                        <Download className="w-4 h-4" />
                        <span>Install CloudCraft to Home Screen</span>
                      </button>
                    </div>
                  ) : (
                    /* Step-by-step instructions for Android Chrome / iOS Safari */
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-md bg-[#0F141A] border border-[#263040] space-y-2">
                        <div className="font-semibold text-[#F8FAFC] flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-[#10B981]" />
                          <span>On Android (Chrome / Brave / Edge / Samsung Internet):</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-1.5 text-[#94A3B8] pl-1 leading-relaxed">
                          <li>
                            Open this page in <strong>Google Chrome</strong> on your phone.
                          </li>
                          <li>
                            Tap the <strong>three dots menu (⋮)</strong> in the top-right corner.
                          </li>
                          <li>
                            Tap <strong>&ldquo;Add to Home screen&rdquo;</strong> or <strong>&ldquo;Install app&rdquo;</strong>.
                          </li>
                          <li>
                            Tap <strong>Install</strong>. Android will create an app icon in your app drawer and home screen.
                          </li>
                        </ol>
                      </div>

                      <div className="p-3.5 rounded-md bg-[#0F141A] border border-[#263040] space-y-2">
                        <div className="font-semibold text-[#F8FAFC] flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-[#38BDF8]" />
                          <span>On iPhone / iPad (Safari):</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-1.5 text-[#94A3B8] pl-1 leading-relaxed">
                          <li>Open this page in <strong>Safari</strong> on iOS.</li>
                          <li>Tap the <strong>Share</strong> button (box with an arrow pointing up) at the bottom.</li>
                          <li>Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* Highlights */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2.5 rounded bg-[#0F141A] border border-[#263040] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
                      <span>No browser address bar (Full Screen 3D)</span>
                    </div>
                    <div className="p-2.5 rounded bg-[#0F141A] border border-[#263040] flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#F59E0B] shrink-0" />
                      <span>Offline asset caching with Service Worker</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'apk' && (
            <div className="space-y-3">
              <p className="leading-relaxed">
                Because this app is a fully compliant <strong>Progressive Web App (PWA)</strong> with a complete Web App Manifest and Service Worker, you can generate an installable <strong>Android APK or AAB</strong> file for the <strong>Google Play Store</strong> in minutes using Google&apos;s official tool:
              </p>

              <div className="p-3.5 rounded-md bg-[#0F141A] border border-[#263040] space-y-2">
                <div className="flex items-center gap-2 font-semibold text-[#F8FAFC]">
                  <Terminal className="w-4 h-4 text-[#38BDF8]" />
                  <span>Google Bubblewrap (Trusted Web Activity - TWA)</span>
                </div>
                <p className="text-[#94A3B8] text-[11px] leading-relaxed">
                  Run these standard Google commands in your terminal to package this PWA into an Android APK:
                </p>
                <pre className="p-2.5 rounded bg-[#070A0E] text-[#38BDF8] font-mono text-[11px] overflow-x-auto select-all">
{`# 1. Install Google Bubblewrap CLI
npm install -g @bubblewrap/cli

# 2. Initialize Android Project from App URL
bubblewrap init --manifest="${window.location.origin}/manifest.webmanifest"

# 3. Build signed Android APK / AAB
bubblewrap build`}
                </pre>
              </div>

              <div className="p-3 rounded-md bg-[#0F141A] border border-[#263040] flex items-center justify-between text-[11px]">
                <span className="text-[#94A3B8]">
                  Alternative online builder: <strong>PWABuilder.com</strong> (by Microsoft &amp; Google)
                </span>
                <a
                  href="https://www.pwabuilder.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#38BDF8] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#0F141A] border-t border-[#263040] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-[#0F141A] font-semibold text-xs transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
