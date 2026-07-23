import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { communityContact } from '@/constants/landing';

export function MapEmbed() {
  return (
    <View style={styles.frame}>
      {createElement('iframe', {
        title: 'Davaine Boarding House location',
        src: communityContact.mapUrl,
        style: { border: 0, width: '100%', height: '100%' },
        allowFullScreen: true,
        loading: 'lazy',
        referrerPolicy: 'no-referrer-when-downgrade',
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: 300,
    overflow: 'hidden',
  },
});
