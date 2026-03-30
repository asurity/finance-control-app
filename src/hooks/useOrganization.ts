import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import type { OrganizationType } from '@/types/firestore';

const ORGANIZATION_EVENT = 'organization-changed';

interface OrganizationSummary {
  id: string;
  name: string;
  type: OrganizationType;
  ownerId: string;
  createdAt: Date;
  role?: string;
}

function getStorageKey(userId: string) {
  return `finance-control-current-org:${userId}`;
}

/**
 * Hook to get and manage current organization context.
 */
export function useOrganization() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistCurrentOrgId = useCallback(
    (orgId: string | null) => {
      if (!user) return;

      const storageKey = getStorageKey(user.id);

      if (typeof window !== 'undefined') {
        if (orgId) {
          window.localStorage.setItem(storageKey, orgId);
        } else {
          window.localStorage.removeItem(storageKey);
        }

        window.dispatchEvent(
          new CustomEvent(ORGANIZATION_EVENT, {
            detail: { userId: user.id, orgId },
          })
        );
      }

      setCurrentOrgId(orgId);
    },
    [user]
  );

  const refreshOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrgId(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const membershipsRef = collection(db, 'organizationMembers');
      const membershipsQuery = query(membershipsRef, where('userId', '==', user.id));
      const membershipsSnapshot = await getDocs(membershipsQuery);

      const membershipRows = membershipsSnapshot.docs.map((membershipDoc) => membershipDoc.data());

      const orgDocs = await Promise.all(
        membershipRows.map(async (membership) => {
          const orgId = membership.organizationId;
          const orgSnapshot = await getDoc(doc(db, 'organizations', orgId));

          if (!orgSnapshot.exists()) {
            return null;
          }

          const orgData = orgSnapshot.data();

          return {
            id: orgSnapshot.id,
            name: orgData.name,
            type: orgData.type,
            ownerId: orgData.ownerId,
            createdAt: orgData.createdAt?.toDate?.() || new Date(),
            role: membership.role,
          } as OrganizationSummary;
        })
      );

      const nextOrganizations = orgDocs
        .filter((organization): organization is OrganizationSummary => Boolean(organization))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));

      setOrganizations(nextOrganizations);

      const storageKey = getStorageKey(user.id);
      const storedOrgId =
        typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;

      const fallbackOrgId =
        nextOrganizations.find((organization) => organization.id === `${user.id}-personal`)?.id ||
        nextOrganizations[0]?.id ||
        null;

      const selectedOrgId = nextOrganizations.some((organization) => organization.id === storedOrgId)
        ? storedOrgId
        : fallbackOrgId;

      if (selectedOrgId !== currentOrgId) {
        setCurrentOrgId(selectedOrgId);
      }

      if (typeof window !== 'undefined') {
        if (selectedOrgId) {
          window.localStorage.setItem(storageKey, selectedOrgId);
        } else {
          window.localStorage.removeItem(storageKey);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentOrgId, user]);

  useEffect(() => {
    refreshOrganizations();
  }, [refreshOrganizations]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      return;
    }

    const syncCurrentOrganization = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId?: string; orgId?: string | null }>;
      if (customEvent.detail?.userId && customEvent.detail.userId !== user.id) {
        return;
      }

      const nextOrgId = window.localStorage.getItem(getStorageKey(user.id));
      setCurrentOrgId(nextOrgId);
    };

    window.addEventListener(ORGANIZATION_EVENT, syncCurrentOrganization as EventListener);
    window.addEventListener('storage', syncCurrentOrganization as EventListener);

    return () => {
      window.removeEventListener(ORGANIZATION_EVENT, syncCurrentOrganization as EventListener);
      window.removeEventListener('storage', syncCurrentOrganization as EventListener);
    };
  }, [user]);

  const createOrganization = useCallback(
    async (name: string, type: OrganizationType) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('El nombre de la organización es obligatorio');
      }

      const orgRef = doc(collection(db, 'organizations'));
      const memberRef = doc(db, 'organizationMembers', `${orgRef.id}_${user.id}`);
      const batch = writeBatch(db);
      const now = Timestamp.now();

      batch.set(orgRef, {
        name: trimmedName,
        type,
        ownerId: user.id,
        createdAt: now,
      });

      batch.set(memberRef, {
        organizationId: orgRef.id,
        userId: user.id,
        role: 'OWNER',
        joinedAt: now,
      });

      await batch.commit();
      await refreshOrganizations();
      persistCurrentOrgId(orgRef.id);

      return orgRef.id;
    },
    [persistCurrentOrgId, refreshOrganizations, user]
  );

  const currentOrganization = useMemo(
    () => organizations.find((organization) => organization.id === currentOrgId) || null,
    [currentOrgId, organizations]
  );

  return {
    organizations,
    currentOrgId,
    currentOrganization,
    setCurrentOrgId: persistCurrentOrgId,
    createOrganization,
    refreshOrganizations,
    isLoading,
  };
}
