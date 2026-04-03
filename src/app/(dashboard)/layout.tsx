import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { InitializeCategories } from '@/components/InitializeCategories';
import { GlobalTransactionFAB } from '@/components/layout/GlobalTransactionFAB';
import { VoiceButton } from '@/components/voice/VoiceButton';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 text-sm sm:text-base">
            <EmailVerificationBanner />
            {children}
          </main>
        </div>
      </div>

      {/* Global Floating Action Button */}
      <GlobalTransactionFAB />

      {/* Voice Agent Button - Solo móvil (en desktop está en Header) */}
      <VoiceButton variant="mobile" />
    </ProtectedRoute>
  );
}
