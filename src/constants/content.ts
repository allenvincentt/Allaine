import type { ImageSourcePropType } from "react-native";

export const SIGNATURE = "Allen";
export const RECIPIENT = "Ellaine";

export const SEAL_MONOGRAM = "A";

export const ENVELOPE = {
  greeting: `${RECIPIENT},`,
  body: [
    "There is something I have been carrying around for a while now, something a little too big for a text message, and far too important to say badly.",
    "So instead of saying it at the wrong moment, I built you a place to hear it properly. These are my thoughts and feelings out loud, and a list I have been quietly keeping.",
    "Take your time with it. It was made slowly, and it is entirely yours.",
  ],
  signOff: "Always,",
  cta: "Turn the page",
} as const;

export const HERO = {
  titleLead: "For",
  titleName: RECIPIENT,
  subtitle:
    "A small corner of the internet, built late at night, for the person who makes ordinary Tuesdays feel like something worth remembering.",
  cta: "I Love You",
  scrollHint: "scroll gently",

  mark: "Our Story",

  chapters: [
    { key: "letter", label: "My Feelings" },
    { key: "photos", label: "Our Experiences" },
    { key: "timeline", label: "Our Story" },
    { key: "reasons", label: "My Thoughts" },
    { key: "song", label: "My Offering" },
  ],

  note: {
    name: `${SIGNATURE}'s Syntax`,
    role: "To be revealed",
  },
} as const;

export type ChapterKey = (typeof HERO.chapters)[number]["key"];

export const LETTER = {
  eyebrow: "I don't know how to explain so here goes.",
  title: "The Dialog",
  body: [
    "It's hard to fully convey it not because I have run out of words, but because sometimes words feel too small for what I feel when I think of you. It is in the quiet moments, when nothing extraordinary is happening, that I realize how deeply you have become a part of me.",
    "I find you in the smallest things, in songs I suddenly understand differently, in sunsets that make me wish you were standing beside me, in the kind of rain that makes the whole world slow down, in the quiet before I fall asleep, when my mind wanders to you without being asked. Maybe that is what you have become to me, not just someone I love, but someone my heart has learned to look for.",
    "I don't want to love you only in the beautiful moments. Anyone can stay when everything is easy, when your smile comes naturally and the world is kind to you.",
    "I want to know you on the days when you don't feel beautiful, on the days when you are tired of pretending you're okay, on the days when you need silence instead of answers, on the days when you doubt yourself and forget all the wonderful things I see in you.",
  ],
  closing: "I want to be there then, too.",
  signOffLabel: "Yours, completely",
} as const;

export const PHOTOS_SECTION = {
  eyebrow: "Evidence, your honour",
  title: "Us for the past eight months",
} as const;

const PLACEHOLDER: ImageSourcePropType = require("@/assets/images/photo-01.jpg");

export type Photo = {
  id: string;
  month: string;
  caption: string;
  source: ImageSourcePropType;
};

/**
 * The line written under each month of the carousel.
 *
 * Matched to a frame by month rather than by position — see `CAPTIONS` in
 * `PhotoMarquee` — so a month with no entry here is shown without a line rather
 * than shifting everything after it. Add the entry when you file the frame.
 */
export const PHOTOS: Photo[] = [
  {
    id: "elle-photo-1",
    month: "January",
    caption: "",
    source: PLACEHOLDER,
  },
  {
    id: "elle-photo-2",
    month: "February",
    caption: "",
    source: PLACEHOLDER,
  },
  {
    id: "elle-photo-3",
    month: "March",
    caption: "",
    source: PLACEHOLDER,
  },
  {
    id: "elle-photo-4",
    month: "April",
    caption: "",
    source: PLACEHOLDER,
  },
  {
    id: "elle-photo-5",
    month: "May",
    caption: "",
    source: PLACEHOLDER,
  },
  {
    id: "elle-photo-6",
    month: "June",
    caption: "",
    source: PLACEHOLDER,
  },
  {
    id: "elle-photo-7",
    month: "July",
    caption: "",
    source: PLACEHOLDER,
  },
  {
    id: "elle-photo-8",
    month: "August",
    caption: "",
    source: PLACEHOLDER,
  },
];

export const TIMELINE_SECTION = {
  eyebrow: "A short history",
  title: "The days I keep re-reading",
} as const;

/**
 * One page of the journal.
 *
 * `caption` is the pencil line under the print and `note` the one written
 * across the bottom of the page afterwards — both are part of the diary
 * conceit, so give every entry one rather than leaving them off.
 */
export type TimelineEntry = {
  tag: string;
  title: string;
  body: string;
  photo: ImageSourcePropType;
  caption: string;
  note: string;
  highlight?: boolean;
};

/**
 * The photograph pinned to each page of the journal. One file per entry, named
 * after the day it belongs to — the `require` has to be a literal, so they are
 * spelled out here and handed to the entry rather than looked up by title.
 */
const TIMELINE_PHOTOS = {
  whoWouldveThought: require("@/assets/timeline/WhoWouldveThought.jpg"),
  yourBirthday: require("@/assets/timeline/YourBirthday.png"),
  dayOfTheHearts: require("@/assets/timeline/DayOfTheHearts.png"),
  familyOuting: require("@/assets/timeline/SInamaSaFamilyOuting.jpg"),
  today: require("@/assets/timeline/Today.jpg"),
} satisfies Record<string, ImageSourcePropType>;

export const TIMELINE: TimelineEntry[] = [
  {
    tag: "Sometime ago",
    title: "Who would've thought",
    body: "Look at us here, grinning like we invented happiness. Spoiler alert: we didn't. We were both faking it a bit, and the worst part is we both knew it. There was an awkwardness hanging over this moment that no filter could quite smooth out, a tension that said everything we weren't brave enough to voice. The plot twist? Just a few months later, I stopped trying and started actually feeling. And somehow, that feeling was directed entirely at you. Who knew that the person I was paired due to sungog would end up being the person who made me forget how to stop smiling? Life really does have a sense of irony. I went from forcing it to falling—deep, real, undeniable love.",
    photo: TIMELINE_PHOTOS.whoWouldveThought,
    caption: "Gi sungog",
    note: "This was soaper akward.",
  },
  {
    tag: "Day One",
    title: "Your Birthday",
    body: "Throughout the December break, my mind kept drifting back to one thing: how to make your birthday unforgettable. I spent so much time brainstorming ideas, sketching out plans, and imagining all the ways I could show you how much you mean to me. I was genuinely worried about getting it just right, but thankfully all that effort was worth it. Seeing you happy and knowing I could make your special day memorable means everything to me.",
    photo: TIMELINE_PHOTOS.yourBirthday,
    caption: "It's you day",
    note: "Your smile meant the world.",
  },
  {
    tag: "14th February",
    title: "Day of the Hearts",
    body: "Valentine's Day. Yeah, as cliché as its sounds, but honestly, it ended up being one of the most wonderful days we've had. There's something about a day dedicated to love that just makes everything feel more intentional, more real. We celebrated it the right way, filling each other's hearts with genuine affection. And you were absolutely beautiful that day I couldn't stop thinking about how lucky I am. Your beauty matched the warmth of everything we shared together.",
    photo: TIMELINE_PHOTOS.dayOfTheHearts,
    caption: "Mahal mahalan",
    note: "One of the best days.",
  },
  {
    tag: "Outside the City",
    title: "Sinama sa Family Outing",
    body: "I honestly didn't think I'd be invited to spend time with your family this early on. But when you asked me, it hit me in a way I wasn't prepared for. It wasn't just an invitation, it felt like a real sign of trust and it was a quiet reassurance that you see a future with me, that I matter to you and to the people closest to you, that I belong in your world, like you were saying \"You're important enough to include in the people I love most.\".",
    photo: TIMELINE_PHOTOS.familyOuting,
    caption: "Pa baby as usual",
    note: "Oh. There it is.",
  },
  {
    tag: "Today",
    title: "This page",
    body: "Despite how demanding our careers have become, we still make time for each other and I'm grateful for that every single day. I pray that this never changes. That our love continues to grow, that we never stop caring, that we always prioritize each other among others, and that no matter what life throws at us, we always prioritize what we have together and nurture it further. I really want to ask you something and I really do but I'm going to let my system talks to you through it all.",
    photo: TIMELINE_PHOTOS.today,
    caption: "us, most recently",
    note: "Keep going. Please keep going.",
    highlight: true,
  },
];

export const REASONS_SECTION = {
  eyebrow: "Tap a card · there are more",
  title: "Reasons, and there are many",
} as const;

export type Reason = {
  index: string;
  title: string;
  body: string;
  highlight?: boolean;
  /** Shown on the front of the card, and only while the pointer is on it. */
  image?: ImageSourcePropType;
};

export const REASONS: Reason[] = [
  {
    index: "01",
    title: "Your Laugh",
    body: "The real one. The loud one. The most beautiful in the entire universe.",
    image: require("@/assets/images/YourLaugh.jpg"),
  },
  {
    index: "02",
    title: "Your Kindness",
    body: "You are gentle with people who can do nothing for you. I think that says everything.",
    image: require("@/assets/images/YourKindness.jpg"),
  },
  {
    index: "03",
    title: "Your Work Ethic",
    body: "You work harder than anyone I know, and you did it all silently.",
    image: require("@/assets/images/YourWorkEthic.jpg"),
  },
  {
    index: "04",
    title: "Your Stubbornness",
    body: "You never listen to me once you've made up your mind.",
    image: require("@/assets/images/YourStubborness.jpg"),
  },
  {
    index: "05",
    title: "How You Love Me",
    body: "Your love is not loud but I hear it loudly whenever I need to. I have never once doubted it, and I never will.",
    image: require("@/assets/images/YourLove.jpg"),
  },
  {
    index: "06",
    title: "Maldita Ka",
    body: "Maldita kaayo ka! Kalit rag masuko or mang wakli. But I love you and I will keep loving you anyway.",
    image: require("@/assets/images/MalditaKa.jpg"),
  },
  {
    index: "07",
    title: "Beauty & Cuteness",
    body: "Genuinely indefensible you struck my heart my heart everytime I gaze at you.",
    image: require("@/assets/images/BeautyCuteness.jpg"),
  },
  {
    index: "08",
    title: "You",
    body: "Above it all, you're just you. I never fall for you because out of reasons, I fell for you because you're just you.",
    highlight: true,
    image: require("@/assets/images/You.jpg"),
  },
];

export const SONG = {
  /** The whole section, in one line. There is nothing else on it. */
  line: "The one song that always reminds me of you.",
  idle: "Press play for our song",
  playing: "Playing our song…",
  replay: "Tap to play again",
  ended: "That was for you",
} as const;

export const QUESTION = {
  eyebrow: "There is only one question left",
  title: `${RECIPIENT}, will you be my girlfriend?`,
  subtitle: "No pressure. There are only two buttons, and they both say yes.",
  yes: "Yes",
  alsoYes: "Absolutely!",
} as const;

export const ANSWER = {
  title: "She said yes.",
  body: "Then it is official, and I am going to be insufferable about it. Thank you for saying yes to me — I promise to keep earning it.",
  stampPrefix: "Officially yours since",
  again: "More confetti, please",
} as const;
