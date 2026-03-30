'use client';

import { useEffect, useState } from 'react';
import { useCategories } from '@/application/hooks/useCategories';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';

/**
 * InitializeCategories Component
 * 
 * Automatically seeds default categories on first load
 * if no categories exist for the current organization.
 * 
 * This is an invisible component that runs in the background.
 */
export function InitializeCategories() {
  const { currentOrgId } = useOrganization();
  const { user } = useAuth();

  // Don't render anything if no organization
  if (!currentOrgId || !user) {
    return null;
  }

  return <InitializeCategoriesInner orgId={currentOrgId} userId={user.id} />;
}

/**
 * Inner component that safely uses hooks with guaranteed orgId
 */
function InitializeCategoriesInner({ orgId, userId }: { orgId: string; userId: string }) {
  const [initialized, setInitialized] = useState(false);
  const { useAllCategories, seedCategories } = useCategories(orgId);
  const { data: categories, isLoading } = useAllCategories();

  useEffect(() => {
    // Skip if already initialized, loading, or data not loaded
    if (initialized || isLoading || !categories) {
      return;
    }

    // Only seed if no categories exist
    if (categories.length === 0) {
      console.log('[InitializeCategories] No categories found, initializing defaults...');
      seedCategories.mutate(userId);
      setInitialized(true);
    } else {
      console.log(`[InitializeCategories] Found ${categories.length} categories, skipping initialization`);
      setInitialized(true);
    }
  }, [categories, initialized, isLoading, seedCategories, userId]);

  return null;
}
