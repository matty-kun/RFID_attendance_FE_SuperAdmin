import { useEffect, useState } from 'react';

export function ApiErrorBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onError = (event: Event) => setMessage((event as CustomEvent<string>).detail);
    const onSuccess = () => setMessage(null);
    window.addEventListener('api-error', onError);
    window.addEventListener('api-success', onSuccess);
    return () => {
      window.removeEventListener('api-error', onError);
      window.removeEventListener('api-success', onSuccess);
    };
  }, []);

  if (!message) return null;

  return (
    <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <span>{message}</span>
      <button type="button" onClick={() => setMessage(null)} className="shrink-0 font-semibold underline">
        Dismiss
      </button>
    </div>
  );
}
