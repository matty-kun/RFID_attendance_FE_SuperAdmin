import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import hawiLockedImg from '../../assets/illustrations/Hawi Locked.png';
import { Button } from './Button';

export const SessionExpiredModal: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [returnPath, setReturnPath] = useState('');

  useEffect(() => {
    const handleSessionExpired = (e: Event) => {
      const customEvent = e as CustomEvent<{ returnUrl?: string }>;
      const target = customEvent.detail?.returnUrl || window.location.pathname + window.location.search;
      setReturnPath(target);
      setIsOpen(true);
    };

    window.addEventListener('presnt:session-expired', handleSessionExpired);
    return () => window.removeEventListener('presnt:session-expired', handleSessionExpired);
  }, []);

  const handleSignInAgain = () => {
    setIsOpen(false);
    sessionStorage.setItem('session_expired_notice', 'true');
    if (returnPath && returnPath !== '/login') {
      sessionStorage.setItem('auth_return_url', returnPath);
    }
    navigate('/login', { replace: true });
  };

  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#170D29]/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-[#E5E0EB] bg-white p-7 text-center shadow-2xl animate-in zoom-in-95 duration-200 text-[#24133F]">
        {/* Soft background glow & Hawi Mascot */}
        <div className="relative mx-auto mb-4 flex justify-center">
          <div className="absolute h-32 w-32 rounded-full bg-purple-100/60 blur-xl pointer-events-none" />
          <img
            src={hawiLockedImg}
            alt="Hawi Security Lock"
            className="relative z-10 h-32 w-auto object-contain drop-shadow-md select-none"
          />
        </div>

        {/* Security Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 border border-purple-200 text-[#7026B7] text-[11px] font-extrabold uppercase tracking-wider mb-2.5">
          <Lock className="h-3 w-3" />
          <span>Security Timeout</span>
        </div>

        {/* Title */}
        <h2 id="session-expired-title" className="text-2xl font-black tracking-tight text-[#24133F]">
          Session Expired
        </h2>

        {/* Explanation */}
        <p className="mt-2 text-xs font-semibold text-[#756883] leading-relaxed">
          Your active session has timed out for account security.
        </p>

        {/* Work Saved Guarantee Box */}
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-[#E7F8EE] border border-[#B3E8C4] p-3 text-left">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#087A3A]" />
          <div className="text-[11px] font-bold text-[#087A3A] leading-tight">
            Your form inputs and page state have been safely saved.
            <span className="block font-medium text-[#16883F] mt-0.5">
              You will return right where you left off after signing in.
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6">
          <Button
            type="button"
            size="lg"
            onClick={handleSignInAgain}
            className="w-full justify-center text-sm font-extrabold shadow-lg shadow-purple-900/10"
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Sign In to Continue
          </Button>
        </div>
      </div>
    </div>
  );
};
