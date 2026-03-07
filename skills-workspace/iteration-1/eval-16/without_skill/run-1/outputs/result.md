# Custom Hook for Fetching User Profile Data with TanStack Query

## Overview

This document provides a custom React hook (`useUserProfile`) built on TanStack Query (React Query) for fetching user profile data. The hook handles caching, loading states, error handling, and stale-time configuration out of the box.

## Prerequisites

```bash
npm install @tanstack/react-query
```

Ensure your app is wrapped with `QueryClientProvider`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

## Implementation

### Types

```ts
// types/user.ts

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileError {
  status: number;
  message: string;
}
```

### API Function

```ts
// api/userProfile.ts

import type { UserProfile } from '../types/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/profile`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw {
      status: response.status,
      message: errorBody.message ?? `Failed to fetch profile (HTTP ${response.status})`,
    };
  }

  return response.json();
}

export async function fetchCurrentUserProfile(): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/users/me/profile`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw {
      status: response.status,
      message: errorBody.message ?? `Failed to fetch profile (HTTP ${response.status})`,
    };
  }

  return response.json();
}
```

### Custom Hook

```ts
// hooks/useUserProfile.ts

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { fetchUserProfile, fetchCurrentUserProfile } from '../api/userProfile';
import type { UserProfile, UserProfileError } from '../types/user';

/** Query key factory for user profile queries */
export const userProfileKeys = {
  all: ['userProfile'] as const,
  detail: (userId: string) => ['userProfile', userId] as const,
  me: () => ['userProfile', 'me'] as const,
};

interface UseUserProfileOptions {
  /** User ID to fetch. Omit to fetch the current authenticated user. */
  userId?: string;
  /** Whether the query should execute. Defaults to true. */
  enabled?: boolean;
  /** Time in milliseconds that data is considered fresh. Defaults to 5 minutes. */
  staleTime?: number;
  /** Additional TanStack Query options */
  queryOptions?: Partial<UseQueryOptions<UserProfile, UserProfileError>>;
}

/**
 * Custom hook for fetching user profile data using TanStack Query.
 *
 * Features:
 * - Automatic caching with configurable stale time
 * - Fetch by user ID or fetch the current authenticated user
 * - Structured error handling
 * - Query key factory for easy cache invalidation
 * - Prefetching support via returned helper
 *
 * @example
 * // Fetch current user's profile
 * const { profile, isLoading, error } = useUserProfile();
 *
 * @example
 * // Fetch a specific user's profile
 * const { profile, isLoading, error } = useUserProfile({ userId: '123' });
 *
 * @example
 * // Conditionally fetch when userId is available
 * const { profile } = useUserProfile({ userId, enabled: !!userId });
 */
export function useUserProfile(options: UseUserProfileOptions = {}) {
  const {
    userId,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    queryOptions,
  } = options;

  const queryClient = useQueryClient();

  const query = useQuery<UserProfile, UserProfileError>({
    queryKey: userId ? userProfileKeys.detail(userId) : userProfileKeys.me(),
    queryFn: () => (userId ? fetchUserProfile(userId) : fetchCurrentUserProfile()),
    enabled,
    staleTime,
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    retry: (failureCount, error) => {
      // Don't retry on 401/403/404
      if (error.status === 401 || error.status === 403 || error.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
    ...queryOptions,
  });

  /** Invalidate this profile's cache entry, triggering a refetch if the query is active */
  const invalidate = () => {
    const key = userId ? userProfileKeys.detail(userId) : userProfileKeys.me();
    return queryClient.invalidateQueries({ queryKey: key });
  };

  /** Prefetch another user's profile into the cache */
  const prefetchProfile = (prefetchUserId: string) => {
    return queryClient.prefetchQuery({
      queryKey: userProfileKeys.detail(prefetchUserId),
      queryFn: () => fetchUserProfile(prefetchUserId),
      staleTime,
    });
  };

  /** Optimistically update the cached profile data */
  const setProfileData = (updater: UserProfile | ((old: UserProfile | undefined) => UserProfile)) => {
    const key = userId ? userProfileKeys.detail(userId) : userProfileKeys.me();
    queryClient.setQueryData<UserProfile>(key, updater);
  };

  return {
    /** The fetched user profile data, or undefined if not yet loaded */
    profile: query.data,
    /** Whether the initial fetch is in progress */
    isLoading: query.isLoading,
    /** Whether a background refetch is in progress */
    isFetching: query.isFetching,
    /** The error object if the query failed */
    error: query.error,
    /** Whether the query has encountered an error */
    isError: query.isError,
    /** Whether data has been successfully fetched at least once */
    isSuccess: query.isSuccess,
    /** Manually trigger a refetch */
    refetch: query.refetch,
    /** Invalidate the cache for this profile */
    invalidate,
    /** Prefetch another user's profile */
    prefetchProfile,
    /** Optimistically set profile data in the cache */
    setProfileData,
  };
}
```

## Usage Examples

### Basic: Display Current User Profile

```tsx
import { useUserProfile } from '../hooks/useUserProfile';

function ProfilePage() {
  const { profile, isLoading, error } = useUserProfile();

  if (isLoading) return <ProfileSkeleton />;
  if (error) return <ErrorMessage message={error.message} />;
  if (!profile) return null;

  return (
    <div>
      <img src={profile.avatarUrl ?? '/default-avatar.png'} alt={profile.displayName} />
      <h1>{profile.displayName}</h1>
      <p>{profile.bio}</p>
      <span>{profile.email}</span>
    </div>
  );
}
```

### Fetch Another User's Profile

```tsx
function UserCard({ userId }: { userId: string }) {
  const { profile, isLoading } = useUserProfile({ userId });

  if (isLoading) return <Spinner />;
  if (!profile) return null;

  return (
    <div>
      <strong>{profile.displayName}</strong>
      <p>{profile.bio}</p>
    </div>
  );
}
```

### Prefetch on Hover

```tsx
function UserLink({ userId, name }: { userId: string; name: string }) {
  const { prefetchProfile } = useUserProfile();

  return (
    <a
      href={`/users/${userId}`}
      onMouseEnter={() => prefetchProfile(userId)}
    >
      {name}
    </a>
  );
}
```

### Optimistic Update After Editing

```tsx
function EditProfileForm() {
  const { profile, setProfileData, invalidate } = useUserProfile();

  const handleSave = async (formData: Partial<UserProfile>) => {
    // Optimistically update the UI
    if (profile) {
      setProfileData({ ...profile, ...formData });
    }

    try {
      await updateProfileApi(formData);
      // Invalidate to refetch the canonical data from the server
      await invalidate();
    } catch {
      // Revert by invalidating (will refetch the original data)
      await invalidate();
    }
  };

  // ... form JSX
}
```

## Key Design Decisions

1. **Query key factory pattern** -- `userProfileKeys` provides a centralized, consistent way to reference cache entries. This makes invalidation and cache manipulation reliable across the app.

2. **Smart retry logic** -- The hook skips retries for 401, 403, and 404 errors since those are unlikely to resolve on retry, while still retrying transient server errors up to 3 times.

3. **Separate `fetchCurrentUserProfile`** -- Using a dedicated `/users/me/profile` endpoint for the authenticated user avoids requiring the caller to know their own user ID.

4. **5-minute stale time** -- Profile data changes infrequently, so a 5-minute stale time reduces unnecessary network requests while keeping data reasonably current.

5. **Returned helpers** -- `invalidate`, `prefetchProfile`, and `setProfileData` are exposed directly so consumers don't need to interact with the query client themselves.
