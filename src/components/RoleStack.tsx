import { Redirect, Stack } from 'expo-router';

import type { Role } from '@/db/models';
import { useDevice } from '@/store/device';
import { useSession } from '@/store/session';
import { colors } from '@/theme/tokens';

/** Layout for a role's route folder: bounces out unless signed in as `role`. */
export function RoleStack({ role }: { role: Role }) {
  const current = useSession((s) => s.role);
  const mode = useDevice((s) => s.mode);
  // Demo: back to the role picker. Cloud: the start screen re-opens this phone's role.
  if (current !== role) return <Redirect href={mode === 'demo' ? '/roles' : '/'} />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
