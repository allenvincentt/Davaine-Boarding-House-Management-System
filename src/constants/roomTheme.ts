import { DefaultTheme } from '@/constants/defaultTheme';
import type { RoomBuilding } from '@/models/roomModel';

export type BuildingTone = {
  color: string;
  background: string;
  border: string;
};

export const buildingTones: Record<RoomBuilding, BuildingTone> = {
  A: {
    color: DefaultTheme.colors.primary,
    background: DefaultTheme.colors.softOlive,
    border: 'rgba(138, 153, 0, 0.30)',
  },
  B: {
    color: '#2F73B8',
    background: '#E4EFFA',
    border: 'rgba(47, 115, 184, 0.28)',
  },
};

export function buildingToneOf(building: RoomBuilding): BuildingTone {
  return buildingTones[building];
}
