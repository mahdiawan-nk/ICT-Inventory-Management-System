import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import { User, ReviewSession, InventoryItem } from './types';
import { ToastProvider, useToast } from './components/Toast';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { InventoryListPage } from './pages/InventoryListPage';
import { InventoryDetailPage } from './pages/InventoryDetailPage';
import { InventoryFormPage } from './pages/InventoryFormPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { LocationsPage } from './pages/LocationsPage';
import { VendorsPage } from './pages/VendorsPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { MovementsPage } from './pages/MovementsPage';
import { LoansPage } from './pages/LoansPage';
import { DisposalsPage } from './pages/DisposalsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AccessCodesPage } from './pages/AccessCodesPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { BackupPage } from './pages/BackupPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReviewPortalPage } from './pages/ReviewPortalPage';
import { LoginPage } from './pages/LoginPage';

function MainApp() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [reviewSession, setReviewSession] = useState<ReviewSession | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // View state
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [showReviewPortal, setShowReviewPortal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Inventory sub-navigation
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState<InventoryItem | null>(null);

  useEffect(() => {
    checkInitialAuth();
  }, []);

  const checkInitialAuth = async () => {
    try {
      setCheckingAuth(true);
      // Check staff token first
      if (api.getStaffToken()) {
        const res = await api.getMe();
        if (res.success && res.data) {
          setCurrentUser(res.data);
          setReviewSession(null);
          return;
        }
      }

      // Check review token
      if (api.getReviewToken()) {
        const revRes = await api.getReviewMe();
        if (revRes.success && revRes.data) {
          setReviewSession(revRes.data);
          setCurrentUser(null);
          return;
        }
      }
    } catch {
      api.setStaffToken(null);
      api.setReviewToken(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleStaffLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setSelectedAssetId(null);
    setIsCreatingAsset(false);
    setEditingAsset(null);
  };

  const handleReviewLogout = async () => {
    await api.reviewLogout();
    setReviewSession(null);
    setSelectedAssetId(null);
    setIsCreatingAsset(false);
    setEditingAsset(null);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3" />
        <span className="text-sm font-semibold tracking-wide">Menghubungkan ke UPT ICT Politeknik Kampar...</span>
      </div>
    );
  }

  // Not authenticated screen (toggle between Staff Login and Reviewer Portal)
  if (!currentUser && !reviewSession) {
    if (showReviewPortal) {
      return (
        <ReviewPortalPage
          onSuccessReviewLogin={(session) => {
            setReviewSession(session);
            setCurrentTab('dashboard');
          }}
          onSwitchToStaffLogin={() => setShowReviewPortal(false)}
        />
      );
    }
    return (
      <LoginPage
        onSuccessLogin={(user) => {
          setCurrentUser(user);
          setCurrentTab('dashboard');
        }}
        onSwitchToReviewer={() => setShowReviewPortal(true)}
      />
    );
  }

  // Render the appropriate main tab content
  const renderContent = () => {
    // Inventory sub-screens: Create/Edit or Detail
    if (currentTab === 'inventory') {
      if (isCreatingAsset || editingAsset) {
        return (
          <InventoryFormPage
            initialData={editingAsset}
            onBack={() => {
              setIsCreatingAsset(false);
              setEditingAsset(null);
            }}
            onSuccess={() => {
              setIsCreatingAsset(false);
              setEditingAsset(null);
            }}
          />
        );
      }
      if (selectedAssetId) {
        return (
          <InventoryDetailPage
            assetId={selectedAssetId}
            currentUser={currentUser}
            reviewSession={reviewSession}
            onBack={() => setSelectedAssetId(null)}
            onEdit={(asset) => {
              setSelectedAssetId(null);
              setEditingAsset(asset);
            }}
            onOpenMutationModal={() => {
              setSelectedAssetId(null);
              setCurrentTab('movements');
            }}
            onOpenLoanModal={() => {
              setSelectedAssetId(null);
              setCurrentTab('loans');
            }}
            onOpenMaintenanceModal={() => {
              setSelectedAssetId(null);
              setCurrentTab('maintenance');
            }}
            onOpenDisposalModal={() => {
              setSelectedAssetId(null);
              setCurrentTab('disposals');
            }}
          />
        );
      }
      return (
        <InventoryListPage
          currentUser={currentUser}
          reviewSession={reviewSession}
          onSelectAsset={(id) => setSelectedAssetId(id)}
          onOpenCreateModal={() => {
            setEditingAsset(null);
            setIsCreatingAsset(true);
          }}
          onEditAsset={(asset) => {
            setSelectedAssetId(null);
            setEditingAsset(asset);
          }}
        />
      );
    }

    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardPage
            currentUser={currentUser}
            reviewSession={reviewSession}
            onNavigateToTab={(tab) => {
              setSelectedAssetId(null);
              setIsCreatingAsset(false);
              setEditingAsset(null);
              setCurrentTab(tab);
            }}
          />
        );
      case 'categories':
        return <CategoriesPage currentUser={currentUser} />;
      case 'locations':
        return <LocationsPage currentUser={currentUser} />;
      case 'vendors':
        return <VendorsPage currentUser={currentUser} />;
      case 'maintenance':
        return <MaintenancePage currentUser={currentUser} />;
      case 'movements':
        return <MovementsPage currentUser={currentUser} />;
      case 'loans':
        return <LoansPage currentUser={currentUser} />;
      case 'disposals':
        return <DisposalsPage currentUser={currentUser} />;
      case 'reports':
        return <ReportsPage currentUser={currentUser} reviewSession={reviewSession} />;
      case 'access_codes':
        return <AccessCodesPage currentUser={currentUser} />;
      case 'users':
        return <UsersPage currentUser={currentUser} />;
      case 'audit_logs':
        return <AuditLogsPage />;
      case 'backup':
        return <BackupPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <div>Halaman tidak ditemukan</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        reviewSession={reviewSession}
        onLogout={currentUser ? handleStaffLogout : handleReviewLogout}
        onOpenReviewPortal={() => setShowReviewPortal(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setSelectedAssetId(null);
            setIsCreatingAsset(false);
            setEditingAsset(null);
            setCurrentTab(tab);
          }}
          currentUser={currentUser}
          reviewSession={reviewSession}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
