import { Link } from 'react-router-dom';
import { uz } from '@/i18n/uz';

export function ForbiddenPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-center">
      <p className="text-5xl font-semibold text-gray-300">403</p>
      <h1 className="text-xl font-semibold text-gray-900">{uz.errors.forbiddenTitle}</h1>
      <p className="text-sm text-gray-500">{uz.errors.forbiddenText}</p>
      <Link to="/" className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700">
        {uz.errors.backHome}
      </Link>
    </div>
  );
}
