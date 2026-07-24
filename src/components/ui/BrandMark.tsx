import { Image } from 'expo-image';

type BrandMarkProps = {
  size: number;
};

export function BrandMark({ size }: BrandMarkProps) {
  return (
    <Image
      accessible={false}
      source={require('../../../assets/images/davaine-mark.svg')}
      contentFit="contain"
      style={{ width: size, height: size }}
    />
  );
}
