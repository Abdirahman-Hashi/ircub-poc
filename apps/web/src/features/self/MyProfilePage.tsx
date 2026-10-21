import { Alert, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import { getMyProfile } from '../../api/self.api';
import { ApiError } from '../../lib/api-error';
import { ProfileView } from '../payers/PayerProfilePage';

import type { ReactElement } from 'react';

/** Customer portal: the payer linked to the signed-in user, read-only until phase 4 adds paying. */
export function MyProfilePage(): ReactElement {
  const profile = useQuery({ queryKey: QUERY_KEYS.myProfile, queryFn: getMyProfile, retry: false });
  if (profile.isPending) {
    return <Text c="dimmed">Loading…</Text>;
  }
  if (profile.isError) {
    return (
      <Alert color="orange">
        {profile.error instanceof ApiError ? profile.error.message : 'Could not load your profile.'}
      </Alert>
    );
  }
  return <ProfileView profile={profile.data} canRegister={false} />;
}
