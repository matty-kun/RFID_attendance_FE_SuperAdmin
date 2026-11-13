import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
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
        <div className="relative mx-auto mb-3 flex justify-center">
          <div className="absolute h-32 w-32 rounded-full bg-purple-100/60 blur-xl pointer-events-none" />
          <img
            src={hawiLockedImg}
            alt="Hawi Security Lock"
            className="relative z-10 h-32 w-auto object-contain drop-shadow-md select-none"
          />
        </div>

        {/* Title */}
        <h2 id="session-expired-title" className="text-2xl font-black tracking-tight text-[#24133F]">
          Session Expired
        </h2>

        {/* Explanation */}
        <p className="mt-1.5 text-xs font-semibold text-[#756883] leading-relaxed">
          Your active session has timed out for account security.
        </p>

        {/* Work Saved Guarantee Box (Centered) */}
        <div className="mt-5 flex flex-col items-center justify-center rounded-2xl bg-[#E7F8EE] border border-[#B3E8C4] px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#087A3A]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#087A3A]" />
            <span>Your form inputs and page state have been safely saved.</span>
          </div>
          <p className="text-[11px] font-medium text-[#16883F] mt-0.5 text-center">
            You will return right where you left off after signing in.
          </p>
        </div>

        {/* Tactile Action Button */}
        <div className="mt-6">
          <Button
            type="button"
            size="lg"
            variant="primary"
            onClick={handleSignInAgain}
            className="w-full justify-center text-sm font-extrabold"
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Sign In to Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredModal;
