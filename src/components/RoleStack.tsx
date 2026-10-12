import { Redirect, Stack } from 'expo-router';

import type { Role } from '@/db/models';
import { useSession } from '@/store/session';
import { colors } from '@/theme/tokens';

/** Layout for a role's route folder: bounces to the role picker unless signed in as `role`. */
export function RoleStack({ role }: { role: Role }) {
  const current = useSession((s) => s.role);
  if (current !== role) return <Redirect href="/roles" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
