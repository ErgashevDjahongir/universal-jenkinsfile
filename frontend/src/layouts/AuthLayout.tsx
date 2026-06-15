import { Outlet } from 'react-router-dom';

/** Login va boshqa autentifikatsiya sahifalari uchun markazlashgan layout. */
export function AuthLayout() {
  return (
    <div className="flex min-h-full items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
      <Outlet />
    </div>
  );
}
