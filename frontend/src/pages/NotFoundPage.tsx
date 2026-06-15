import { Link } from 'react-router-dom';
import { uz } from '@/i18n/uz';

export function NotFoundPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-center dark:bg-gray-900">
      <p className="text-5xl font-semibold text-gray-300 dark:text-gray-600">404</p>
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {uz.errors.notFoundTitle}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">{uz.errors.notFoundText}</p>
      <Link to="/" className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700">
        {uz.errors.backHome}
      </Link>
    </div>
  );
}
