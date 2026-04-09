export type UnlockType = 'light' | 'hard';
export type ServiceType = 'FRP' | 'MDM' | 'SIM' | 'BOOTLOADER' | 'Mi Account' | 'iCloud' | 'Passcode' | 'FLASH' | 'UPDATE' | 'RESCUE' | 'SLOT' | 'FACTORY' | 'IMEI' | 'NVRAM' | 'NETWORK' | 'READ_CODE' | 'UNBRICK' | 'PIN' | 'HUAWEI_ID';
export type UserRole = 'Admin' | 'Technician' | 'Support' | 'User' | 'Developer';

export interface User {
  id: number;
  username: string;
  tokens: number;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
}

export interface Device {
  id: number;
  brand: string;
  model: string;
  chipset: string;
  imageUrl: string;
  category: 'trending' | 'most-unlocked' | 'coming-soon' | 'feature-phones';
  prices: any; // JSON string or object of { [key in ServiceType]?: number }
  unlockCommand: string; // JSON string of { [key in ServiceType]?: { adb?: string[], fastboot?: string[], etc } }
  constraints: string; // JSON string of constraints
  createdAt: string;
}

export interface PhoneModel {
  id: string;
  brand: string;
  name: string;
  image: string;
  category: 'trending' | 'most-unlocked' | 'coming-soon' | 'feature-phones';
  prices: {
    [key in ServiceType]?: number;
  };
  unlockTypes: UnlockType[];
}

export type UnlockStepAnimation = 'plug' | 'button' | 'wait' | 'success';

export type AppStep = 'selection' | 'payment' | 'tutorial' | 'unlocking';
export type ModuleType = 'feature-phones' | 'iphone' | 'android' | 'huawei';

export interface UnlockStep {
  id: number;
  title: string;
  description: string;
  animationType: 'plug' | 'button' | 'wait' | 'success';
}
