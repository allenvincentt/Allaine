import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { appIcons, type AppIconName } from '@/constants/icons';

type AppIconProps = Omit<SymbolViewProps, 'name'> & {
  name: AppIconName;
};

export function AppIcon({ name, ...props }: AppIconProps) {
  return <SymbolView name={appIcons[name]} {...props} />;
}
