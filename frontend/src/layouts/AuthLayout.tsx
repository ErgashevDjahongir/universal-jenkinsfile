import { Outlet } from 'react-router-dom';

/** Login va boshqa autentifikatsiya sahifalari uchun markazlashgan layout. */
export function AuthLayout() {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-6">
      <Outlet />
    </div>
  );
}
