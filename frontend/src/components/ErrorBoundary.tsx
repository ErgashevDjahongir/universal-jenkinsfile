import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui';
import { uz } from '@/i18n/uz';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Global xato chegarasi: bir sahifa render paytida qulasa, butun ilova oqarib
 * ketmasin — o'rniga xato xabari ko'rsatiladi va boshqa bo'limlarga o'tish
 * mumkin bo'lib qoladi. AppLayout uni `key={location.pathname}` bilan o'raydi,
 * shu sababli boshqa marshrutga o'tilganda chegara qayta tiklanadi.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Diagnostika uchun — keyinchalik markazlashgan loggingга ulanishi mumkin.
    console.error('Sahifa render xatosi:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center">
            <h2 className="text-lg font-semibold text-red-800">{uz.common.crashTitle}</h2>
            <p className="mt-2 text-sm text-red-700">{uz.common.crashHint}</p>
            <div className="mt-5">
              <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
                {uz.common.reload}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
