import type { AppIconName } from './icons';

export type LandingSection = 'home' | 'rooms' | 'billing' | 'about';

export const landingNavigation: { label: string; section: LandingSection }[] = [
  { label: 'Home', section: 'home' },
  { label: 'Rooms', section: 'rooms' },
  { label: 'Billing', section: 'billing' },
  { label: 'About', section: 'about' },
];

export const amenities: { icon: AppIconName; label: string }[] = [
  { icon: 'wifi', label: 'Strong Internet Connectivity' },
  { icon: 'security', label: '24/7 Security' },
  { icon: 'coffee', label: 'Lounge Area' },
  { icon: 'noiseCancel', label: 'Night Noise Curfew' },
];

export const billingSteps: { icon: AppIconName; title: string; detail: string }[] = [
  { icon: 'gauge', title: 'Room Meter', detail: 'Electric tracking per room.' },
  { icon: 'clock', title: 'Meter Reading', detail: 'Meter reading on the 25th of every month.' },
  { icon: 'electricity', title: 'Bill Computation', detail: 'Accumulated bill.' },
  { icon: 'payment', title: 'Payment Due', detail: '15th day of the month.' },
];

export const waterPolicies: { icon: AppIconName; label: string; caption: string }[] = [
  {
    icon: 'users',
    label: 'Occupancy Check',
    caption: 'Resident count is verified before every billing cycle.',
  },
  {
    icon: 'user',
    label: 'Per Adult Head Billing',
    caption: 'Water costs are divided fairly among adult residents.',
  },
  {
    icon: 'child',
    label: "Kid's Bill is Half",
    caption: 'Children are billed at half of the standard adult share.',
  },
];

export const communityContact = {
  address: '2G92+H9H, De Guzman St, Toril, Davao City, Davao del Sur',
  addressShort: 'De Guzman St, Toril, Davao City',
  telephone: '082-226-8281',
  email: 'elainemusni08@gmail.com',
  social: 'facebook.com',
  mapUrl:
    'https://maps.google.com/maps?q=2G92%2BH9H%2C%20De%20Guzman%20St%2C%20Toril%2C%20Davao%20City%2C%20Davao%20del%20Sur&z=16&output=embed',
};
