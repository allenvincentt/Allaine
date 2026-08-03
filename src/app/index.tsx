import { Redirect } from 'expo-router';

/** The letter is the front door; everything else is behind it. */
export default function Index() {
  return <Redirect href="/EnvelopePage" />;
}
