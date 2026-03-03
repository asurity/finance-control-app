// useOrganization hook - Get current organization context
// This should be replaced with actual organization context when multi-org is implemented

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to get the current organization ID
 * TODO: Replace with actual multi-organization context
 */
export function useOrganization() {
  const { user } = useAuth();
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // For now, use user's personal organization (userId-personal)
      // This will be replaced with actual organization selection logic
      setCurrentOrgId(`${user.id}-personal`);
    } else {
      setCurrentOrgId(null);
    }
  }, [user]);

  return {
    currentOrgId,
    setCurrentOrgId,
  };
}
