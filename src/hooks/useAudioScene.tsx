import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const BACKGROUND_MUSIC = require('@/assets/musics/BackgroundMusic.mp3');
const JOG_MUSIC = require('@/assets/musics/JogWheelMusic.mp3');

const MUSIC_VOLUME = 0.7;

type AudioScene = {
  musicOn: boolean;
  toggleMusic: () => void;
  startMusic: () => void;

  songPlaying: boolean;
  /** True once the song has been started at least once. */
  songTouched: boolean;
  songEnded: boolean;
  toggleSong: () => void;
};

const AudioSceneContext = createContext<AudioScene | null>(null);

/**
 * Holds both tracks for the life of the app so the background music keeps
 * playing across the envelope → landing transition, exactly as the single-page
 * original does.
 */
export function AudioSceneProvider({ children }: { children: ReactNode }) {
  const music = useAudioPlayer(BACKGROUND_MUSIC);
  const song = useAudioPlayer(JOG_MUSIC);
  const songStatus = useAudioPlayerStatus(song);

  const [musicOn, setMusicOn] = useState(false);
  const [songTouched, setSongTouched] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Set when the song displaced the background music, so it can be put back. */
  const resumeMusic = useRef(false);
  /** Previous value of the song's playing flag, to catch the edge where it stops. */
  const wasSongPlaying = useRef(false);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    music.loop = true;
    music.volume = 0;
  }, [music]);

  useEffect(
    () => () => {
      if (fadeTimer.current) {
        clearInterval(fadeTimer.current);
      }
    },
    [],
  );

  const fade = useCallback((to: number, ms: number, done?: () => void) => {
    if (fadeTimer.current) {
      clearInterval(fadeTimer.current);
    }

    const from = music.volume ?? 0;
    const startedAt = Date.now();

    fadeTimer.current = setInterval(() => {
      const k = Math.min(1, (Date.now() - startedAt) / ms);
      music.volume = from + (to - from) * k;
      if (k >= 1) {
        if (fadeTimer.current) {
          clearInterval(fadeTimer.current);
          fadeTimer.current = null;
        }
        done?.();
      }
    }, 30);
  }, [music]);

  const setMusic = useCallback(
    (on: boolean) => {
      setMusicOn(on);
      if (on) {
        music.volume = 0;
        music.play();
        fade(MUSIC_VOLUME, 900);
      } else {
        fade(0, 700, () => music.pause());
      }
    },
    [music, fade],
  );

  const toggleMusic = useCallback(() => {
    // Reaching for the music control is a decision about the music, and it
    // outranks any handback the song still owes it.
    resumeMusic.current = false;
    setMusic(!musicOn);
  }, [setMusic, musicOn]);
  const startMusic = useCallback(() => {
    if (!musicOn) {
      setMusic(true);
    }
  }, [musicOn, setMusic]);

  const toggleSong = useCallback(() => {
    if (song.playing) {
      song.pause();
      return;
    }
    setSongTouched(true);
    if (songStatus.didJustFinish || song.currentTime >= Math.max(0, song.duration - 0.05)) {
      song.seekTo(0);
    }
    // The song is the thing being listened to now, so the background music
    // steps aside instead of playing underneath it. `setMusic` fades rather
    // than cutting, so the handover is a dip and not a gap.
    if (musicOn) {
      resumeMusic.current = true;
      setMusic(false);
    }
    song.play();
  }, [song, songStatus.didJustFinish, musicOn, setMusic]);

  /**
   * Hand the stage back when the song gives it up — however it does. Paused from
   * the wheel and simply running out both land here, which is why this watches
   * the flag rather than living inside the press handler.
   *
   * Edge-triggered on purpose: the status flag turns true a moment *after*
   * `play()`, so a level test could see "not playing" while the music was
   * already ducking and undo it on the spot.
   */
  useEffect(() => {
    const stopped = wasSongPlaying.current && !songStatus.playing;
    wasSongPlaying.current = songStatus.playing;

    if (!stopped || !resumeMusic.current) {
      return;
    }
    resumeMusic.current = false;
    setMusic(true);
  }, [songStatus.playing, setMusic]);

  const value = useMemo<AudioScene>(
    () => ({
      musicOn,
      toggleMusic,
      startMusic,
      songPlaying: songStatus.playing,
      songTouched,
      songEnded: songStatus.didJustFinish,
      toggleSong,
    }),
    [musicOn, toggleMusic, startMusic, songStatus.playing, songStatus.didJustFinish, songTouched, toggleSong],
  );

  return <AudioSceneContext.Provider value={value}>{children}</AudioSceneContext.Provider>;
}

export function useAudioScene(): AudioScene {
  const scene = useContext(AudioSceneContext);
  if (!scene) {
    throw new Error('useAudioScene must be used inside <AudioSceneProvider>');
  }
  return scene;
}
