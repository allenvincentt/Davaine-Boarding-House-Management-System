import Head from 'expo-router/head';

import LandingPage from './landing-page/LandingPage';

export default function Index() {
  return (
    <>
      <Head>
        <link
          rel="icon"
          type="image/x-icon"
          href="/favicon.ico?v=davaine-20260723"
        />
      </Head>
      <LandingPage />
    </>
  );
}
