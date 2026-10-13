import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { AuthErrorText } from '@/components/AuthErrorText';
import { BigButton } from '@/components/BigButton';
import { ChipGroup } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { CloudError } from '@/cloud/errors';
import { createPatient } from '@/cloud/people';
import { FAMILY_RELATIONS, type ConditionStage } from '@/db/models';
import { newId } from '@/db/ids';
import { LANGUAGE_CODES, LANGUAGES, type LanguageCode } from '@/i18n';
import { useAccount } from '@/store/account';
import { useSettings } from '@/store/settings';
import { refreshPeople } from '@/sync/refresh';

const GENDERS = ['female', 'male', 'other'] as const;
const STAGES = ['mild', 'moderate', 'severe'] as const;
export const MIN_AGE = 30;
export const MAX_AGE = 120;

/**
 * New patient (cloud): a caregiver adds a family member, or an ASHA worker
 * registers a patient from her village. The creator becomes the manager.
 */
export function PatientForm() {
  const { t } = useTranslation();
  const role = useAccount((s) => s.profile?.role);
  const appLanguage = useSettings((s) => s.language);
  const [name, setName] = useState('');
  const [preferred, setPreferred] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<(typeof GENDERS)[number] | null>(null);
  const [language, setLanguage] = useState<LanguageCode | null>(appLanguage);
  const [stage, setStage] = useState<ConditionStage | null>(null);
  const [relation, setRelation] = useState<string | null>(null);
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState(useAccount.getState().profile?.district ?? '');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CloudError | null>(null);
  const isCaregiver = role === 'caregiver';

  const save = async () => {
    if (!name.trim()) {
      setError(new CloudError('nameMissing'));
      return;
    }
    const years = age ? Number.parseInt(age, 10) : null;
    // Same rule as the database (002: patients_age_check).
    if (years != null && (years < MIN_AGE || years > MAX_AGE)) {
      setError(new CloudError('ageRange'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createPatient({
        id: newId(),
        name: name.trim(),
        preferred_name: preferred.trim(),
        age: years,
        gender,
        language: language ?? appLanguage,
        condition_stage: stage,
        village,
        district,
        notes,
        avatar: gender === 'male' ? '👴' : '👵',
        relation: isCaregiver ? (relation ?? undefined) : undefined,
      });
      await refreshPeople();
      router.back();
    } catch (e) {
      setError(e instanceof CloudError ? e : new CloudError('generic'));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BigButton kind="ghost" icon="⬅️" label={t('common.back')} onPress={() => router.back()} />
      <AppText variant="title">{t(isCaregiver ? 'people.addFamilyTitle' : 'people.registerTitle')}</AppText>
      <TextField label={t('people.form.name')} value={name} onChangeText={setName} testID="patient-name" />
      <TextField
        label={t('people.form.preferred')}
        placeholder={t('people.form.preferredHint')}
        value={preferred}
        onChangeText={setPreferred}
        testID="patient-preferred"
      />
      <TextField
        label={t('people.form.age')}
        value={age}
        onChangeText={(v) => setAge(v.replace(/\D/g, '').slice(0, 3))}
        keyboardType="number-pad"
        testID="patient-age"
      />
      <ChipGroup
        label={t('people.form.gender')}
        options={GENDERS}
        value={gender}
        onChange={setGender}
        labelFor={(g) => t(`people.gender.${g}`)}
      />
      <ChipGroup
        label={t('people.form.language')}
        options={LANGUAGE_CODES}
        value={language}
        onChange={setLanguage}
        labelFor={(l) => LANGUAGES[l].label}
      />
      <ChipGroup
        label={t('people.form.stage')}
        options={STAGES}
        value={stage}
        onChange={setStage}
        labelFor={(s) => t(`stage.${s}`)}
      />
      {isCaregiver ? (
        <ChipGroup
          label={t('people.form.relation')}
          options={FAMILY_RELATIONS}
          value={relation}
          onChange={setRelation}
          labelFor={(r) => t(`relation.${r}`)}
        />
      ) : null}
      <TextField label={t('people.form.village')} value={village} onChangeText={setVillage} testID="patient-village" />
      <TextField label={t('auth.district')} value={district} onChangeText={setDistrict} testID="patient-district" />
      <TextField
        label={t('people.form.notes')}
        placeholder={t('people.form.notesHint')}
        value={notes}
        onChangeText={setNotes}
        multiline
        testID="patient-notes"
      />
      <AuthErrorText error={error} phoneRole="" />
      <BigButton
        size="large"
        icon="💾"
        label={busy ? t('common.loading') : t('people.form.save')}
        disabled={busy}
        onPress={save}
      />
    </Screen>
  );
}
