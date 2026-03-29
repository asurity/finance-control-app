import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { InitializeCategories } from '@/components/InitializeCategories';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <InitializeCategories />
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <EmailVerificationBanner />
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
