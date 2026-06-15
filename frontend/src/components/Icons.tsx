import { HugeiconsIcon } from '@hugeicons/react';
import {
  ShoppingCart01Icon as CartIconData,
  Menu01Icon as MenuIconData,
  CrossIcon as XIconData,
  UserIcon as UserIconData,
  StarIcon as StarIconData,
  TruckIcon as TruckIconData,
  Shield01Icon as ShieldIconData,
  Package01Icon as PackageIconData,
  CallIcon as PhoneIconData,
  ArrowRight01Icon as ArrowRightIconData,
  ArrowLeft01Icon as ArrowLeftIconData,
  Search01Icon as SearchIconData,
  FilterIcon as FilterIconData,
  PlusSignIcon as PlusIconData,
  MinusSignIcon as MinusIconData,
  Delete01Icon as TrashIconData,
  ChevronRightIcon as ChevronRightIconData,
  CheckIcon as CheckIconData,
  HeartIcon as HeartIconData,
  ChevronUpIcon as ChevronUpIconData,
  EyeIcon as EyeIconData,
  EyeOffIcon as EyeOffIconData,
  MapPinIcon as MapPinIconData,
  Camera01Icon as CameraIconData,
  LockIcon as LockIconData,
  Sun01Icon as SunIconData,
  MoonIcon as MoonIconData,
  PencilIcon as PencilIconData,
  SlidersHorizontalIcon as SlidersIconData,
  Home01Icon as HomeIconData,
  GridIcon as GridIconData,
  ListViewIcon as ListIconData,
  ChevronLeftIcon as ChevronLeftIconData,
  ZoomInAreaIcon as ZoomInIconData,
  Share01Icon as ShareIconData,
  BellIcon as BellIconData,
  CircleCheckIcon as CheckCircleIconData,
  Clock01Icon as ClockIconData,
  CreditCardIcon as CreditCardIconData,
  BarChartIcon as ChartBarIconData,
  UserGroupIcon as UsersIconData,
  Tag01Icon as TagIconData,
  Mail01Icon as MailIconData,
  Link01Icon as LinkIconData,
  ChevronDownIcon as ChevronDownIconData,
  Logout01Icon as LogoutIconData,
} from '@hugeicons/core-free-icons';

type IconProps = { className?: string };

export function CartIcon({ className = "size-5" }: IconProps) {
  return <HugeiconsIcon icon={CartIconData} className={className} />;
}

export function MenuIcon({ className = "size-6" }: IconProps) {
  return <HugeiconsIcon icon={MenuIconData} className={className} />;
}

export function XIcon({ className = "size-5" }: IconProps) {
  return <HugeiconsIcon icon={XIconData} className={className} />;
}

export function UserIcon({ className = "size-5" }: IconProps) {
  return <HugeiconsIcon icon={UserIconData} className={className} />;
}

export function StarIcon({ className = "size-4", filled = false }: IconProps & { filled?: boolean }) {
  return <HugeiconsIcon icon={StarIconData} className={className} {...(filled ? { fill: "currentColor" } : {})} />;
}

export function TruckIcon({ className = "size-5" }: IconProps) {
  return <HugeiconsIcon icon={TruckIconData} className={className} />;
}

export function ShieldIcon({ className = "size-5" }: IconProps) {
  return <HugeiconsIcon icon={ShieldIconData} className={className} />;
}

export function PackageIcon({ className = "size-5" }: IconProps) {
  return <HugeiconsIcon icon={PackageIconData} className={className} />;
}

export function PhoneIcon({ className = "size-5" }: IconProps) {
  return <HugeiconsIcon icon={PhoneIconData} className={className} />;
}

export function ArrowRightIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={ArrowRightIconData} className={className} />;
}

export function ArrowLeftIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={ArrowLeftIconData} className={className} />;
}

export function SearchIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={SearchIconData} className={className} />;
}

export function FilterIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={FilterIconData} className={className} />;
}

export function PlusIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={PlusIconData} className={className} />;
}

export function MinusIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={MinusIconData} className={className} />;
}

export function TrashIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={TrashIconData} className={className} />;
}

export function ChevronRightIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={ChevronRightIconData} className={className} />;
}

export function CheckIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={CheckIconData} className={className} />;
}

export function HeartIcon({ className = "size-4", filled = false }: IconProps & { filled?: boolean }) {
  return <HugeiconsIcon icon={HeartIconData} className={className} {...(filled ? { fill: "currentColor" } : {})} />;
}

export function ChevronUpIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={ChevronUpIconData} className={className} />;
}

export function EyeIcon({ className = "size-5" }: IconProps) {
  return <HugeiconsIcon icon={EyeIconData} className={className} />;
}

export function EyeOffIcon({ className = "size-5" }: IconProps) {
  return <HugeiconsIcon icon={EyeOffIconData} className={className} />;
}

export function MapPinIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={MapPinIconData} className={className} />;
}

export function CameraIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={CameraIconData} className={className} />;
}

export function LockClosedIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={LockIconData} className={className} />;
}

export function SunIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={SunIconData} className={className} />;
}

export function MoonIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={MoonIconData} className={className} />;
}

export function PencilIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={PencilIconData} className={className} />;
}

export function SlidersIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={SlidersIconData} className={className} />;
}

export function HomeIcon({ className = "size-5" }: IconProps) {
  return <HugeiconsIcon icon={HomeIconData} className={className} />;
}

export function GridIcon({ className = "size-5" }: IconProps) {
  return <HugeiconsIcon icon={GridIconData} className={className} />;
}

export function ListIcon({ className = "size-5" }: IconProps) {
  return <HugeiconsIcon icon={ListIconData} className={className} />;
}

export function ChevronLeftIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={ChevronLeftIconData} className={className} />;
}

export function ZoomInIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={ZoomInIconData} className={className} />;
}

export function ShareIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={ShareIconData} className={className} />;
}

export function BellIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={BellIconData} className={className} />;
}

export function CheckCircleIcon({ className = "size-5" }: IconProps) {
  return <HugeiconsIcon icon={CheckCircleIconData} className={className} />;
}

export function ClockIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={ClockIconData} className={className} />;
}

export function CreditCardIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={CreditCardIconData} className={className} />;
}

export function ChartBarIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={ChartBarIconData} className={className} />;
}

export function UsersIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={UsersIconData} className={className} />;
}

export function TagIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={TagIconData} className={className} />;
}

export function MailIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={MailIconData} className={className} />;
}

export function LinkIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={LinkIconData} className={className} />;
}

export function ChevronDownIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={ChevronDownIconData} className={className} />;
}

export function LogoutIcon({ className = "size-4" }: IconProps) {
  return <HugeiconsIcon icon={LogoutIconData} className={className} />;
}
