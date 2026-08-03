import type { ImageSourcePropType } from 'react-native';

/**
 * Every word of the letter lives here so the pages stay layout-only.
 * Swap SIGNATURE for your own name — it appears on the note and the letter.
 */
export const SIGNATURE = 'Your Name';
export const RECIPIENT = 'Elle';

/** The letter pressed into the wax. */
export const SEAL_MONOGRAM = 'A';

export const ENVELOPE = {
  greeting: `${RECIPIENT},`,
  body: [
    'There is something I have been carrying around for a while now — something a little too big for a text message, and far too important to say badly.',
    'So instead of saying it at the wrong moment, I built you a place to hear it properly. There are photographs in here, and a few of our best days, and a list I have been quietly keeping.',
    'Take your time with it. It was made slowly, and it is entirely yours.',
  ],
  signOff: 'Always,',
  cta: 'Turn the page',
} as const;

export const HERO = {
  badge: 'Made by hand · for one person only',
  titleLead: 'For',
  titleName: RECIPIENT,
  subtitle:
    'A small corner of the internet, built late at night, for the person who makes ordinary Tuesdays feel like something worth remembering.',
  cta: 'I Love You',
  scrollHint: 'scroll gently',
} as const;

export const LETTER = {
  eyebrow: 'The part I keep rehearsing',
  title: 'I have been trying to say this out loud for weeks.',
  body: [
    'I do not remember deciding to fall for you. It happened the way evenings do — slowly, and then all at once, and then it was dark out and we were still talking.',
    'It was the small things that gave you away. The way you listen with your whole face. The way you are gentle with people who can do nothing for you. The way you send me songs at midnight with no explanation, as if the song is the explanation.',
    'Somewhere along the way you stopped being the best part of my week and became the part I measure the week against. I like who I am when I am near you. Braver. Sillier. More honest.',
  ],
  closing:
    'So here it is, plainly: I would like to stop calling this whatever this is and start calling it us.',
  signOffLabel: 'Yours, completely',
} as const;

export const PHOTOS_SECTION = {
  eyebrow: 'Evidence, your honour',
  title: 'Us, in pictures',
} as const;

/**
 * The design has six slots. Only one photograph shipped with the project, so
 * every slot points at it for now — drop more files into
 * `src/assets/images` and give each entry its own `source`.
 */
const PLACEHOLDER: ImageSourcePropType = require('@/assets/images/photo-01.jpg');

export type Photo = { id: string; caption: string; source: ImageSourcePropType };

export const PHOTOS: Photo[] = [
  { id: 'elle-photo-1', caption: 'The first photo I ever took of you', source: PLACEHOLDER },
  { id: 'elle-photo-2', caption: 'You, laughing at something I said', source: PLACEHOLDER },
  { id: 'elle-photo-3', caption: 'That evening we did not want to end', source: PLACEHOLDER },
  { id: 'elle-photo-4', caption: 'Somewhere neither of us had been before', source: PLACEHOLDER },
  { id: 'elle-photo-5', caption: 'Proof that you make everything softer', source: PLACEHOLDER },
  { id: 'elle-photo-6', caption: 'My favourite one. Obviously.', source: PLACEHOLDER },
];

export const TIMELINE_SECTION = {
  eyebrow: 'A short history',
  title: 'The days I keep re-reading',
} as const;

export type TimelineEntry = {
  tag: string;
  title: string;
  body: string;
  highlight?: boolean;
};

export const TIMELINE: TimelineEntry[] = [
  {
    tag: 'Day one',
    title: 'The first hello',
    body: 'A conversation that was supposed to take ten minutes and somehow took the entire night. I remember walking home replaying it.',
  },
  {
    tag: 'A few weeks in',
    title: 'The long way home',
    body: 'We both knew the shorter route. Neither of us mentioned it. I have taken the long way ever since.',
  },
  {
    tag: 'That one rainy day',
    title: 'Two coffees, one umbrella',
    body: 'Everything went wrong that afternoon and it is still one of my favourite days. That is the whole point of you.',
  },
  {
    tag: 'The night I knew',
    title: 'You fell asleep mid-sentence',
    body: 'And I sat there thinking: oh. There it is. I would like a great many more of these.',
  },
  {
    tag: 'Today',
    title: 'This page',
    body: 'Which is, admittedly, an elaborate way of asking you a very simple question. Keep scrolling.',
    highlight: true,
  },
];

export const REASONS_SECTION = {
  eyebrow: 'Tap a card · there are more',
  title: 'Reasons, and there are many',
} as const;

export type Reason = { index: string; title: string; body: string; highlight?: boolean };

export const REASONS: Reason[] = [
  {
    index: '01',
    title: 'Your laugh',
    body: 'The real one. The loud one. The one you apologise for. Please never apologise for it.',
  },
  {
    index: '02',
    title: 'Your kindness',
    body: 'You are gentle with people who can do nothing for you. I think that says everything.',
  },
  {
    index: '03',
    title: 'Your mind',
    body: 'You notice things nobody else does, and you ask better questions than anyone I know.',
  },
  {
    index: '04',
    title: 'Your stubbornness',
    body: 'You have never once let me get away with a lazy opinion. I am better for it.',
  },
  {
    index: '05',
    title: 'Your midnight playlists',
    body: 'Sent with no explanation, because the song is the explanation. I have kept every one.',
  },
  {
    index: '06',
    title: 'How you say my name',
    body: 'Slightly differently to everyone else. I noticed the first week and never stopped noticing.',
  },
  {
    index: '07',
    title: 'Your terrible taste in films',
    body: 'Genuinely indefensible. I will keep watching them with you anyway. Every single one.',
  },
  {
    index: '08',
    title: 'Ordinary Tuesdays',
    body: 'You make them feel like occasions. That is the rarest thing a person can do.',
    highlight: true,
  },
];

export const SONG = {
  eyebrow: 'One song, before I ask you something',
  title: 'Press play. Listen close.',
  subtitle: 'This one is for you. The question comes right after.',
  idle: 'Press play for our song',
  playing: 'Playing our song…',
  replay: 'Tap to play again',
  ended: 'That was for you',
} as const;

export const QUESTION = {
  eyebrow: 'There is only one question left',
  title: `${RECIPIENT}, will you be my girlfriend?`,
  subtitle: 'No pressure. There are only two buttons, and they both say yes.',
  yes: 'Yes',
  alsoYes: 'Absolutely!',
} as const;

export const ANSWER = {
  title: 'She said yes.',
  body: 'Then it is official, and I am going to be insufferable about it. Thank you for saying yes to me — I promise to keep earning it.',
  stampPrefix: 'Officially yours since',
  again: 'More confetti, please',
} as const;

export const FOOTER = {
  label: `Made for ${RECIPIENT}`,
  tagline: 'and nobody else, ever',
} as const;
