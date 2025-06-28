export interface User {
  id: string;
  email: string;
  fullName: string | null;
  userType: 'dumper' | 'collector' | 'admin';
  phone: string | null;
  address: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Collector {
  id: string;
  profileId: string;
  specializations: string[];
  serviceRadius: number;
  isAvailable: boolean;
  currentLocation: {
    lat: number;
    lng: number;
  } | null;
  rating: number | null;
  totalCollections: number;
  createdAt: string;
  updatedAt: string;
}

export interface WasteRequest {
  id: string;
  dumperId: string;
  collectorId: string | null;
  wasteType: string;
  description: string | null;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled';
  scheduledTime: string | null;
  estimatedAmount: string | null;
  price: number | null;
  photos: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  lat: number;
  lng: number;
}

export const WASTE_TYPES = [
  'Household',
  'Electronic',
  'Organic',
  'Recyclable',
  'Hazardous',
  'Construction',
  'Garden',
  'Furniture'
] as const;

export type WasteType = typeof WASTE_TYPES[number];

export interface VerificationState {
  emailSent: boolean;
  phoneSent: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  isVerifying: boolean;
  error: string | null;
}