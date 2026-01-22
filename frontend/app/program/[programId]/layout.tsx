'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Home, 
  FolderKanban, 
  ClipboardList, 
  Calendar, 
  BarChart3, 
  FileText,
  LogOut,
  User
} from 'lucide-react';
import { getProgramRoleTabs } from '@/lib/permissions';

interface ProgramData {
  id: number;
  name: string;
  organization?: {
    name: string;
  };
}

export default function ProgramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const programId = params?.programId as string;
  const [program, setProgram] = useState<ProgramData | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(true);

  // Fetch program data
  useEffect(() => {
    if (!programId) return;

    const fetchProgram = async () => {
      try {
        const response = await fetch(`/api/programs/${programId}`);
        if (response.ok) {
          const data = await response.json();
          setProgram(data);
        }
      } catch (error) {
        console.error('Failed to load program:', error);
      } finally {
        setLoadingProgram(false);
      }
    };

    fetchProgram();
  }, [programId]);

  // Redirect if user not authorized
  useEffect(() => {
    if (isLoading) return;

    if (!currentUser) {
      router.push('/login');
      return;
    }

    // Verify user has access to this program
    // Super Admin and Admin can access any program
    const isGlobalAdmin = currentUser.role === 'super-admin' || currentUser.role === 'admin';
    const isProgramRole = ['program-admin', 'program-manager', 'program-moderator'].includes(currentUser.role);
    
    if (isProgramRole && currentUser.programId?.toString() !== programId) {
      console.warn('Access denied: User program ID does not match', {
        userProgramId: currentUser.programId,
        requestedProgramId: programId,
        role: currentUser.role
      });
      router.push('/unauthorized');
      return;
    }
  }, [currentUser, isLoading, programId, router]);

  if (isLoading || loadingProgram) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!currentUser) return null;

  const visibleTabs = getProgramRoleTabs(currentUser.role);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: `/program/${programId}/dashboard` },
    { id: 'programs', label: 'Program', icon: FolderKanban, href: `/program/${programId}/programs` },
    { id: 'questionnaires', label: 'Questionnaires', icon: ClipboardList, href: `/program/${programId}/questionnaires` },
    { id: 'events', label: 'Events', icon: Calendar, href: `/program/${programId}/events` },
    { id: 'reports', label: 'Reports', icon: BarChart3, href: `/program/${programId}/reports` },
    { id: 'evaluation', label: 'Evaluation', icon: FileText, href: `/program/${programId}/evaluation` },
  ].filter(item => visibleTabs.includes(item.id));

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="text-xs text-gray-500 mb-1">Program</div>
          <h1 className="text-lg font-bold text-gray-900 truncate" title={program?.name}>
            {program?.name || 'Loading...'}
          </h1>
          {program?.organization && (
            <div className="text-xs text-gray-500 mt-1 truncate" title={program.organization.name}>
              {program.organization.name}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = typeof window !== 'undefined' && window.location.pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={20} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</div>
              <div className="text-xs text-gray-500 truncate">{currentUser.role}</div>
            </div>
          </div>
          <button
            onClick={() => {
              fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                router.push('/login');
              });
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
