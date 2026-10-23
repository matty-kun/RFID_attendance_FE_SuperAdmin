import React from 'react';
import { useLoginViewModel } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { ShieldCheck, Lock, User } from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    identifier,
    setIdentifier,
    password,
    setPassword,
    isLoading,
    error,
    handleSubmit,
  } = useLoginViewModel();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-brand-900/50 mb-4 border border-brand-400/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Super Admin Portal</h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Campus RFID Attendance Management System
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Admin Identifier or Email"
            type="text"
            placeholder="superadmin or email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 mt-2 text-sm uppercase tracking-wider font-extrabold"
            isLoading={isLoading}
          >
            Authenticate & Enter
          </Button>
        </form>

      </div>
    </div>
  );
};
