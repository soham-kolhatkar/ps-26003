import type { IconProps } from 'phosphor-react-native';
import { AlarmIcon } from 'phosphor-react-native/src/icons/Alarm';
import { ArrowCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowCounterClockwise';
import { ArrowDownIcon } from 'phosphor-react-native/src/icons/ArrowDown';
import { ArrowLeftIcon } from 'phosphor-react-native/src/icons/ArrowLeft';
import { ArrowRightIcon } from 'phosphor-react-native/src/icons/ArrowRight';
import { ArrowsClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { ArrowUpIcon } from 'phosphor-react-native/src/icons/ArrowUp';
import { BackspaceIcon } from 'phosphor-react-native/src/icons/Backspace';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { CalendarBlankIcon } from 'phosphor-react-native/src/icons/CalendarBlank';
import { CameraIcon } from 'phosphor-react-native/src/icons/Camera';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { CaretUpIcon } from 'phosphor-react-native/src/icons/CaretUp';
import { ChartBarIcon } from 'phosphor-react-native/src/icons/ChartBar';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { CheckSquareIcon } from 'phosphor-react-native/src/icons/CheckSquare';
import { CircleIcon } from 'phosphor-react-native/src/icons/Circle';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { CloudIcon } from 'phosphor-react-native/src/icons/Cloud';
import { CloudCheckIcon } from 'phosphor-react-native/src/icons/CloudCheck';
import { CloudSlashIcon } from 'phosphor-react-native/src/icons/CloudSlash';
import { DeviceMobileIcon } from 'phosphor-react-native/src/icons/DeviceMobile';
import { DoorOpenIcon } from 'phosphor-react-native/src/icons/DoorOpen';
import { ExportIcon } from 'phosphor-react-native/src/icons/Export';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { FilmSlateIcon } from 'phosphor-react-native/src/icons/FilmSlate';
import { FloppyDiskIcon } from 'phosphor-react-native/src/icons/FloppyDisk';
import { GameControllerIcon } from 'phosphor-react-native/src/icons/GameController';
import { GearIcon } from 'phosphor-react-native/src/icons/Gear';
import { HandshakeIcon } from 'phosphor-react-native/src/icons/Handshake';
import { HourglassMediumIcon } from 'phosphor-react-native/src/icons/HourglassMedium';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { ImageIcon } from 'phosphor-react-native/src/icons/Image';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { KeyIcon } from 'phosphor-react-native/src/icons/Key';
import { LightbulbIcon } from 'phosphor-react-native/src/icons/Lightbulb';
import { LinkIcon } from 'phosphor-react-native/src/icons/Link';
import { LockIcon } from 'phosphor-react-native/src/icons/Lock';
import { LockOpenIcon } from 'phosphor-react-native/src/icons/LockOpen';
import { MinusIcon } from 'phosphor-react-native/src/icons/Minus';
import { NotePencilIcon } from 'phosphor-react-native/src/icons/NotePencil';
import { PhoneIcon } from 'phosphor-react-native/src/icons/Phone';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { PlugIcon } from 'phosphor-react-native/src/icons/Plug';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { SignOutIcon } from 'phosphor-react-native/src/icons/SignOut';
import { SkipForwardIcon } from 'phosphor-react-native/src/icons/SkipForward';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { SpeakerHighIcon } from 'phosphor-react-native/src/icons/SpeakerHigh';
import { SquareIcon } from 'phosphor-react-native/src/icons/Square';
import { SquaresFourIcon } from 'phosphor-react-native/src/icons/SquaresFour';
import { StarIcon } from 'phosphor-react-native/src/icons/Star';
import { StethoscopeIcon } from 'phosphor-react-native/src/icons/Stethoscope';
import { TableIcon } from 'phosphor-react-native/src/icons/Table';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import { TrendUpIcon } from 'phosphor-react-native/src/icons/TrendUp';
import { TriangleIcon } from 'phosphor-react-native/src/icons/Triangle';
import { UserPlusIcon } from 'phosphor-react-native/src/icons/UserPlus';
import { UsersIcon } from 'phosphor-react-native/src/icons/Users';
import { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import type { ComponentType } from 'react';
import { View } from 'react-native';

import { colors } from '@/theme/tokens';

/**
 * Phosphor icons (MIT), one deep import each (the package index pulls in all
 * 1,500 icons). Always shown next to a text label; never the only cue (D50).
 */
const ICONS = {
  alarm: AlarmIcon,
  'arrow-down': ArrowDownIcon,
  'arrow-left': ArrowLeftIcon,
  'arrow-right': ArrowRightIcon,
  'arrow-up': ArrowUpIcon,
  backspace: BackspaceIcon,
  bell: BellIcon,
  calendar: CalendarBlankIcon,
  camera: CameraIcon,
  'caret-down': CaretDownIcon,
  'caret-left': CaretLeftIcon,
  'caret-right': CaretRightIcon,
  'caret-up': CaretUpIcon,
  chart: ChartBarIcon,
  check: CheckIcon,
  'check-circle': CheckCircleIcon,
  'check-square': CheckSquareIcon,
  circle: CircleIcon,
  clock: ClockIcon,
  cloud: CloudIcon,
  'cloud-check': CloudCheckIcon,
  'cloud-off': CloudSlashIcon,
  door: DoorOpenIcon,
  eye: EyeIcon,
  film: FilmSlateIcon,
  game: GameControllerIcon,
  gear: GearIcon,
  grid: SquaresFourIcon,
  handshake: HandshakeIcon,
  hourglass: HourglassMediumIcon,
  house: HouseIcon,
  image: ImageIcon,
  info: InfoIcon,
  key: KeyIcon,
  lightbulb: LightbulbIcon,
  link: LinkIcon,
  lock: LockIcon,
  'lock-open': LockOpenIcon,
  minus: MinusIcon,
  note: NotePencilIcon,
  phone: PhoneIcon,
  'phone-device': DeviceMobileIcon,
  play: PlayIcon,
  plug: PlugIcon,
  plus: PlusIcon,
  redo: ArrowsClockwiseIcon,
  reset: ArrowCounterClockwiseIcon,
  save: FloppyDiskIcon,
  share: ExportIcon,
  'sign-out': SignOutIcon,
  skip: SkipForwardIcon,
  sparkle: SparkleIcon,
  speaker: SpeakerHighIcon,
  square: SquareIcon,
  star: StarIcon,
  stethoscope: StethoscopeIcon,
  table: TableIcon,
  trash: TrashIcon,
  trend: TrendUpIcon,
  triangle: TriangleIcon,
  'user-plus': UserPlusIcon,
  users: UsersIcon,
  warning: WarningIcon,
  x: XIcon,
} satisfies Record<string, ComponentType<IconProps>>;

export type IconName = keyof typeof ICONS;

export type AppIconProps = {
  name: IconName;
  size?: number;
  color?: string;
  /** `fill` for patient screens and status marks, `bold` for staff controls. */
  weight?: IconProps['weight'];
};

export function Icon({ name, size = 24, color = colors.text, weight = 'bold' }: AppIconProps) {
  const Glyph = ICONS[name];
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <Glyph size={size} color={color} weight={weight} />
    </View>
  );
}
