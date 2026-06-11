import { Link } from 'react-router-dom';
import { uz } from '@/i18n/uz';

export function NotFoundPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
      <p className="text-5xl font-semibold text-slate-300">404</p>
      <h1 className="text-xl font-semibold text-slate-900">{uz.errors.notFoundTitle}</h1>
      <p className="text-sm text-slate-500">{uz.errors.notFoundText}</p>
      <Link to="/" className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">
        {uz.errors.backHome}
      </Link>
    </div>
  );
}
