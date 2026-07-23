import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

type PlatformIcon = {
  ios: SFSymbol;
  android: AndroidSymbol;
  web: AndroidSymbol;
};

export const appIcons = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  rooms: { ios: 'building.2.fill', android: 'apartment', web: 'apartment' },
  money: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
  about: { ios: 'info.circle.fill', android: 'info', web: 'info' },
  wifi: { ios: 'wifi', android: 'wifi', web: 'wifi' },
  security: {
    ios: 'checkmark.shield.fill',
    android: 'verified_user',
    web: 'verified_user',
  },
  coffee: { ios: 'cup.and.saucer.fill', android: 'local_cafe', web: 'local_cafe' },
  noiseCancel: {
    ios: 'speaker.slash.fill',
    android: 'noise_control_off',
    web: 'noise_control_off',
  },
  gauge: { ios: 'gauge', android: 'speed', web: 'speed' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  electricity: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' },
  payment: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
  users: { ios: 'person.2.fill', android: 'group', web: 'group' },
  user: { ios: 'person.fill', android: 'person', web: 'person' },
  mapPin: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  phone: { ios: 'phone.fill', android: 'call', web: 'call' },
  email: { ios: 'envelope.fill', android: 'mail', web: 'mail' },
  child: {
    ios: 'figure.and.child.holdinghands',
    android: 'child_care',
    web: 'child_care',
  },
  arrowDown: { ios: 'arrow.down', android: 'arrow_downward', web: 'arrow_downward' },
  arrowRight: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  water: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  eye: { ios: 'eye.fill', android: 'visibility', web: 'visibility' },
  eyeOff: { ios: 'eye.slash.fill', android: 'visibility_off', web: 'visibility_off' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  lock: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  at: { ios: 'at', android: 'alternate_email', web: 'alternate_email' },
} satisfies Record<string, PlatformIcon>;

export type AppIconName = keyof typeof appIcons;
