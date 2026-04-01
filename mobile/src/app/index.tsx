import { Redirect } from 'expo-router';

import { useSession } from '@/utils/session';

export default function IndexScreen() {
  const { session } = useSession();
  return <Redirect href={session.refreshToken ? '/games' : '/login'} />;
}
