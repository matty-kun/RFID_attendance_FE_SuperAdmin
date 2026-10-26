import { useRef, useState } from 'react';
import { AlertCircle, Eye, EyeOff, KeyRound, User } from 'lucide-react';
import { useLoginViewModel } from '../viewmodels';

export function LoginView() {
  const {
    identifier, setIdentifier, password, setPassword, isLoading, error, clearError, handleSubmit,
  } = useLoginViewModel();
  const [showPassword, setShowPassword] = useState(false);
  const helpDialog = useRef<HTMLDialogElement>(null);

  return <div className="flex min-h-screen flex-col bg-[#EAE1F8] font-sans">
    <header className="px-6 pt-8 text-center sm:pt-10">
      <p className="text-[34px] font-extrabold leading-tight tracking-tight text-[#4A1D75]">Presnt</p>
      <p className="mt-1 text-sm font-semibold text-[#756883]">Super Admin Portal</p>
    </header>

    <main className="flex flex-1 items-end justify-center pt-40 sm:items-center sm:px-6 sm:pb-10">
      <section aria-labelledby="login-title" className="relative w-full max-w-[440px] rounded-t-[28px] border border-[#E5E0EB] bg-white px-5 pb-8 pt-24 sm:rounded-[28px] sm:px-8 sm:pb-9">
        <img src="/illustrations/hawi-sitting.png" alt="Hawi mascot sitting above the sign-in form" className="pointer-events-none absolute -top-[175px] left-1/2 h-[220px] w-[220px] -translate-x-1/2 object-contain" />
        <div className="mb-6 text-center">
          <h1 id="login-title" className="text-2xl font-extrabold text-[#24133F]">Welcome back!</h1>
          <p className="mt-1 text-sm text-[#756883]">Sign in to manage Presnt.</p>
        </div>

        {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-[14px] border border-[#EF3340] bg-[#FDE8EA] px-3.5 py-2.5 text-[13px] font-semibold text-[#B91C2A]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
        </div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="super-admin-email" className="mb-1.5 block text-[13px] font-semibold text-[#24133F]">Super Admin Email</label>
            <div className="flex h-[50px] items-center gap-3 rounded-[14px] border-[1.2px] border-[#E5E0EB] bg-white px-4 focus-within:border-[#6D21A8]">
              <User className="h-[18px] w-[18px] shrink-0 text-[#756883]" />
              <input id="super-admin-email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Your registered email" value={identifier} onChange={(event) => { setIdentifier(event.target.value); clearError(); }} disabled={isLoading} required className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#24133F] outline-none placeholder:font-medium placeholder:text-[#A59CAC]" />
            </div>
          </div>

          <div>
            <label htmlFor="super-admin-password" className="mb-1.5 block text-[13px] font-semibold text-[#24133F]">Password</label>
            <div className="flex h-[50px] items-center gap-3 rounded-[14px] border-[1.2px] border-[#E5E0EB] bg-white px-4 focus-within:border-[#6D21A8]">
              <KeyRound className="h-[18px] w-[18px] shrink-0 text-[#756883]" />
              <input id="super-admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => { setPassword(event.target.value); clearError(); }} disabled={isLoading} required className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#24133F] outline-none placeholder:font-medium placeholder:text-[#A59CAC]" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="text-[#756883] hover:text-[#6D21A8] focus-visible:outline-2 focus-visible:outline-[#6D21A8]">
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="mt-2 flex h-[50px] w-full items-center justify-center rounded-[18px] bg-[#6C2BD9] text-[17px] font-extrabold text-white shadow-[0_6px_0_0_#431475] transition-all hover:bg-[#5F22C5] active:translate-y-1 active:shadow-[0_2px_0_0_#431475] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D21A8]">
            {isLoading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] font-semibold text-[#24133F]">Forgot Password?{' '}
          <button type="button" onClick={() => helpDialog.current?.showModal()} className="font-bold text-[#7C3AED] hover:underline focus-visible:outline-2 focus-visible:outline-[#6D21A8]">Click here</button>
        </p>
      </section>
    </main>

    <dialog ref={helpDialog} aria-labelledby="password-help-title" className="w-[min(340px,calc(100%-32px))] rounded-[24px] border border-[#E5E0EB] bg-white p-6 text-center text-[#24133F] backdrop:bg-[#24133F]/45">
      <img src="/illustrations/hawi-question.png" alt="" className="mx-auto mb-3 h-28 w-28 object-contain" />
      <h2 id="password-help-title" className="text-xl font-extrabold">Forgot Password?</h2>
      <p className="mt-2 text-sm text-[#756883]">Contact IT Services to reset your Super Admin password.</p>
      <button type="button" onClick={() => helpDialog.current?.close()} className="mt-5 w-full rounded-[14px] bg-[#6C2BD9] px-4 py-3 font-bold text-white shadow-[0_3px_0_0_#431475]">Got It</button>
    </dialog>
  </div>;
}
