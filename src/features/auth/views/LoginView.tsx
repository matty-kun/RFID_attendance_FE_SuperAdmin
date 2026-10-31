import { useRef, useState } from 'react';
import { AlertCircle, Eye, EyeOff, KeyRound, User, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '../../../components/common/Checkbox';
import { useLoginViewModel } from '../viewmodels';
import hawiPeekingImg from '../../../assets/illustrations/Hawi Peeking.png';
import hawiQuestionImg from '../../../assets/illustrations/Hawi Question.png';

export function LoginView() {
  const {
    identifier,
    setIdentifier,
    password,
    setPassword,
    isLoading,
    error,
    identifierError,
    passwordError,
    clearError,
    handleSubmit,
  } = useLoginViewModel();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const helpDialog = useRef<HTMLDialogElement>(null);

  return (
    <div className="min-h-screen w-full bg-white grid grid-cols-1 md:grid-cols-2 font-sans select-none overflow-x-hidden">
      {/* Left Hero Panel */}
      <div className="relative flex flex-col justify-between bg-[#EBE2F9] p-8 sm:p-12 md:p-14 lg:p-20 min-h-[440px] md:min-h-screen overflow-hidden">
        {/* Top Headline Content */}
        <div className="relative z-10 max-w-md">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#8B78A5]">
            Welcome to Presnt
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-black leading-[1.08] tracking-tight text-[#1B0B36]">
            Attendance in <span className="block text-[#8B2CCB]">Seconds.</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base font-semibold text-[#756883] leading-relaxed max-w-sm">
            Fast, effortless attendance tracking with just a tap.
          </p>
        </div>

        {/* Hawi Mascot Peeking from bottom right */}
        <div className="pointer-events-none absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 md:-bottom-8 md:-right-8 z-0">
          <img
            src={hawiPeekingImg}
            alt="Hawi mascot"
            className="h-[280px] sm:h-[380px] md:h-[460px] lg:h-[520px] w-auto object-contain drop-shadow-xl"
          />
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-col justify-between bg-white p-8 sm:p-12 md:p-14 lg:p-20 min-h-[520px] md:min-h-screen">
        {/* Top Logo */}
        <div className="text-center">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#7C27BD]">
            Presnt
          </span>
        </div>

        {/* Form Content */}
        <div className="my-auto py-8 max-w-[380px] mx-auto w-full">
          <div className="text-center mb-7">
            <h2 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#24133F]">
              <span className="text-[#8B2CCB]">Login</span> to your account
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm font-semibold text-[#756883]">
              welcome! Enter your details to login to your account
            </p>
          </div>

                    {sessionStorage.getItem('session_expired_notice') === 'true' && (
            <div
              role="status"
              className="mb-5 flex items-start gap-2.5 rounded-2xl border border-purple-200 bg-purple-50/80 px-4 py-3 text-xs text-[#7026B7]"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7026B7]" />
              <div className="leading-tight">
                <span className="font-extrabold block text-xs">Session expired for security.</span>
                <span className="block text-[11px] font-medium text-[#756883] mt-0.5">
                  Your unsaved drafts were preserved. Sign in to resume where you left off.
                </span>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-2xl border border-[#EF3340]/20 bg-[#FDE8EA] px-3.5 py-2.5 text-xs font-bold text-[#B91C2A]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Admin ID / Identifier */}
            <div>
              <label
                htmlFor="admin-identifier"
                className="mb-1.5 block text-xs font-bold text-[#24133F]"
              >
                Admin ID
              </label>
              <div
                className={`flex h-11 items-center gap-2.5 rounded-2xl border bg-white px-3.5 transition-all ${
                  identifierError
                    ? 'border-[#EF3340] focus-within:border-[#EF3340] focus-within:ring-2 focus-within:ring-[#EF3340]/20'
                    : 'border-[#D8B4ED] focus-within:border-[#7026B7] focus-within:ring-2 focus-within:ring-[#7026B7]/20'
                }`}
              >
                <User className="h-4 w-4 text-[#756883] shrink-0" />
                <input
                  id="admin-identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your ID number"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    clearError();
                  }}
                  disabled={isLoading}
                  className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold text-[#24133F] outline-none placeholder:font-normal placeholder:text-[#A59CAC]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-xs font-bold text-[#24133F]"
              >
                Password
              </label>
              <div
                className={`flex h-11 items-center gap-2.5 rounded-2xl border bg-white px-3.5 transition-all ${
                  passwordError
                    ? 'border-[#EF3340] focus-within:border-[#EF3340] focus-within:ring-2 focus-within:ring-[#EF3340]/20'
                    : 'border-[#D8B4ED] focus-within:border-[#7026B7] focus-within:ring-2 focus-within:ring-[#7026B7]/20'
                }`}
              >
                <KeyRound className="h-4 w-4 text-[#756883] shrink-0" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError();
                  }}
                  disabled={isLoading}
                  className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold text-[#24133F] outline-none placeholder:font-normal placeholder:text-[#A59CAC]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="text-[#756883] hover:text-[#7026B7] cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember me and account assistance */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                label="Remember me"
              />
              <button
                type="button"
                onClick={() => helpDialog.current?.showModal()}
                className="font-bold text-[#7026B7] hover:underline cursor-pointer"
              >
                Need help signing in?
              </button>
            </div>

            {/* Sign In 3D Tactile Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-3 flex h-11 w-full items-center justify-center rounded-2xl bg-[#7026B7] text-sm font-bold text-white shadow-[0_4px_0_0_#451475] transition-all hover:bg-[#621FA3] active:translate-y-[2px] active:shadow-[0_1px_0_0_#451475] disabled:opacity-60 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7026B7]"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

        </div>

        {/* Footer Copyright */}
        <div className="text-center pt-4">
          <p className="text-xs font-medium text-[#A59AAB]">
            © 2026 Presnt. All rights reserved.
          </p>
        </div>
      </div>

      {/* Help Dialog */}
      <dialog
        ref={helpDialog}
        aria-labelledby="password-help-title"
        className="fixed left-1/2 top-1/2 m-0 w-[min(400px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-[#E5E0EB] bg-white p-7 text-center text-[#24133F] backdrop:bg-[#1A0B2E]/40 backdrop:backdrop-blur-sm"
      >
        <img
          src={hawiQuestionImg}
          alt="Hawi question illustration"
          className="mx-auto mb-3 h-28 w-28 object-contain"
        />
        <h2 id="password-help-title" className="text-xl font-extrabold text-[#24133F]">
          Need help signing in?
        </h2>
        <p className="mt-2 text-xs text-[#756883] leading-relaxed">
          Contact your department’s IT Services if you’ve forgotten your password or need access to a Super Admin account.
        </p>
        <button
          type="button"
          onClick={() => helpDialog.current?.close()}
          className="mt-5 w-full rounded-2xl bg-[#7026B7] py-2.5 text-xs font-bold text-white shadow-[0_3px_0_0_#451475] hover:bg-[#621FA3] active:translate-y-[1px] active:shadow-none cursor-pointer"
        >
          Got It
        </button>
      </dialog>
    </div>
  );
}
