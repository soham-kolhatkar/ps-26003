import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { displayName, getPatient } from '@/db/repos/patients';
import { useDbQuery } from '@/db/useDbQuery';
import { GameShell } from '@/games/GameShell';
import { getGame } from '@/games/registry';
import { useSession } from '@/store/session';

export default function GameScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const patientId = useSession((s) => s.patientId) ?? '';
  const { data: patient } = useDbQuery((db) => getPatient(db, patientId), [patientId]);
  const game = getGame(id);

  if (!game) {
    return (
      <Screen>
        <AppText variant="large">{t('game.notFound')}</AppText>
        <BigButton label={t('game.home')} onPress={() => router.back()} />
      </Screen>
    );
  }
  if (!patient) return <Screen>{null}</Screen>;

  return <GameShell game={game} patientId={patient.id} patientName={displayName(patient)} />;
}
