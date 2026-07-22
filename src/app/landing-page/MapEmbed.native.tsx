import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { communityContact } from '@/constants/landing';

export function MapEmbed() {
  return (
    <View style={styles.frame}>
      <WebView
        source={{ uri: communityContact.mapUrl }}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: 300,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
  },
});
