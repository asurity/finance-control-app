'use client';

import { useEffect, useState } from 'react';
import { useCategories } from '@/application/hooks/useCategories';
import { useOrganization } from '@/hooks/useOrganization';

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
  const { categories, seedCategories, isLoading } = useCategories();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Skip if no organization, already initialized, currently loading, or data not loaded
    if (!currentOrgId || initialized || isLoading || !categories) {
      return;
    }

    // Only seed if no categories exist
    if (categories.length === 0) {
      console.log('[InitializeCategories] No categories found, initializing defaults...');
      seedCategories.mutate();
      setInitialized(true);
    } else {
      console.log(`[InitializeCategories] Found ${categories.length} categories, skipping initialization`);
      setInitialized(true);
    }
  }, [currentOrgId, categories, initialized, isLoading, seedCategories]);

  // Invisible component
  return null;
}
