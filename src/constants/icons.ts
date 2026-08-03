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
  dashboard: { ios: 'square.grid.2x2.fill', android: 'dashboard', web: 'dashboard' },
  document: { ios: 'doc.text.fill', android: 'description', web: 'description' },
  feedback: { ios: 'bubble.left.fill', android: 'forum', web: 'forum' },
  chart: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
  directory: {
    ios: 'person.text.rectangle.fill',
    android: 'badge',
    web: 'badge',
  },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  bell: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  trendUp: { ios: 'arrow.up.right', android: 'trending_up', web: 'trending_up' },
  trendDown: { ios: 'arrow.down.right', android: 'trending_down', web: 'trending_down' },
  signOut: {
    ios: 'rectangle.portrait.and.arrow.right',
    android: 'logout',
    web: 'logout',
  },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  fingerprint: { ios: 'touchid', android: 'fingerprint', web: 'fingerprint' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  userPlus: { ios: 'person.badge.plus', android: 'person_add', web: 'person_add' },
  more: { ios: 'ellipsis', android: 'more_vert', web: 'more_vert' },
  edit: { ios: 'square.and.pencil', android: 'edit', web: 'edit' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  power: { ios: 'power', android: 'power_settings_new', web: 'power_settings_new' },
  key: { ios: 'key.fill', android: 'key', web: 'key' },
  userMinus: { ios: 'person.badge.minus', android: 'person_remove', web: 'person_remove' },
  inbox: { ios: 'tray', android: 'inbox', web: 'inbox' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  link: { ios: 'link', android: 'link', web: 'link' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  doorOpen: { ios: 'door.left.hand.open', android: 'meeting_room', web: 'meeting_room' },
} satisfies Record<string, PlatformIcon>;

export type AppIconName = keyof typeof appIcons;
