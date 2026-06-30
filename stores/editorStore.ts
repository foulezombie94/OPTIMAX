import { create } from 'zustand';

export interface Asset {
  id: string;
  file: File;
  url: string;
  type: 'video' | 'audio' | 'image';
  duration: number;
  name: string;
}

export interface ClipTransform {
  scale: number;
  posX: number;
  posY: number;
  opacity: number;
  brightness: number;
  contrast: number;
  saturation: number;
}

export type EffectType = 'blur' | 'grayscale' | 'sepia' | 'invert' | 'vhs';

export interface Effect {
  id: string;
  type: EffectType;
  intensity: number; // 0.0 to 1.0
}

export interface TextData {
  content: string;
  color: string;
  fontSize: number;
}

export interface Keyframe {
  id: string;
  time: number; // timeline time
  opacity?: number;
}

export interface Clip {
  id: string;
  type: 'media' | 'text';
  trackId: string;
  assetId: string | null; // null for text clips
  // Timeline position (in seconds)
  start: number;
  end: number;
  // Asset trim position (in seconds)
  trimIn: number;
  trimOut: number;
  // Properties
  transform: ClipTransform;
  volume: number;
  effects: Effect[];
  textData?: TextData;
  transitionIn?: number;
  transitionOut?: number;
  keyframes?: Keyframe[];
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio';
  hidden: boolean;
  muted: boolean;
}

interface EditorState {
  assets: Asset[];
  tracks: Track[];
  clips: Clip[];
  playhead: number;
  selectedClipId: string | null;
  duration: number; // Total timeline duration
  
  // Actions
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  addTrack: (track: Track) => void;
  addClip: (clip: Clip) => void;
  addTextClip: () => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  splitClip: (id: string, splitTime: number) => void;
  moveClip: (id: string, deltaStart: number, newTrackId?: string) => void;
  updateClipTransform: (id: string, updates: Partial<ClipTransform>) => void;
  updateTextData: (id: string, updates: Partial<TextData>) => void;
  addEffectToClip: (clipId: string, effectType: EffectType) => void;
  updateEffect: (clipId: string, effectId: string, intensity: number) => void;
  removeEffect: (clipId: string, effectId: string) => void;
  updateTransitions: (id: string, updates: { transitionIn?: number, transitionOut?: number }) => void;
  addKeyframe: (clipId: string, time: number, properties: Partial<Keyframe>) => void;
  removeKeyframe: (clipId: string, keyframeId: string) => void;
  setPlayhead: (time: number) => void;
  setSelectedClip: (id: string | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  assets: [],
  tracks: [
    { id: 'v2', name: 'V2', type: 'video', hidden: false, muted: false },
    { id: 'v1', name: 'V1', type: 'video', hidden: false, muted: false },
    { id: 'a1', name: 'A1', type: 'audio', hidden: false, muted: false },
  ],
  clips: [],
  playhead: 0,
  selectedClipId: null,
  duration: 60, // Default 1 min timeline

  addAsset: (asset) => set((state) => ({ assets: [...state.assets, asset] })),
  removeAsset: (id) => set((state) => ({ 
    assets: state.assets.filter(a => a.id !== id),
    clips: state.clips.filter(c => c.assetId !== id) 
  })),
  
  addTrack: (track) => set((state) => ({ tracks: [...state.tracks, track] })),
  
  addClip: (clip) => set((state) => {
    const newClips = [...state.clips, clip];
    const newDuration = Math.max(state.duration, clip.end + 10);
    return { clips: newClips, duration: newDuration, selectedClipId: clip.id };
  }),

  addTextClip: () => set((state) => {
    const track = state.tracks.find(t => t.type === 'video');
    if (!track) return state;

    const clip: Clip = {
      id: Math.random().toString(36).substring(7),
      type: 'text',
      trackId: track.id,
      assetId: null,
      start: state.playhead,
      end: state.playhead + 5,
      trimIn: 0,
      trimOut: 5,
      volume: 1,
      transform: { scale: 1, posX: 0, posY: 0, opacity: 1, brightness: 1, contrast: 1, saturation: 1 },
      effects: [],
      textData: { content: 'NOUVEAU TITRE', color: '#ffffff', fontSize: 48 }
    };
    
    const newClips = [...state.clips, clip];
    const newDuration = Math.max(state.duration, clip.end + 5);
    return { clips: newClips, duration: newDuration, selectedClipId: clip.id };
  }),
  
  updateClip: (id, updates) => set((state) => ({
    clips: state.clips.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
  
  removeClip: (id) => set((state) => ({
    clips: state.clips.filter(c => c.id !== id),
    selectedClipId: state.selectedClipId === id ? null : state.selectedClipId
  })),

  splitClip: (id, splitTime) => set((state) => {
    const clip = state.clips.find(c => c.id === id);
    if (!clip || splitTime <= clip.start || splitTime >= clip.end) return state;

    const offsetInClip = splitTime - clip.start;
    const splitTrim = clip.trimIn + offsetInClip;

    const leftClip: Clip = { ...clip, end: splitTime, trimOut: splitTrim };
    const rightClip: Clip = { 
      ...clip, 
      id: Math.random().toString(36).substring(7),
      start: splitTime,
      trimIn: splitTrim,
      // clone arrays/objects to break references
      transform: { ...clip.transform },
      effects: clip.effects.map(e => ({ ...e, id: Math.random().toString(36).substring(7) })),
      textData: clip.textData ? { ...clip.textData } : undefined
    };

    return {
      clips: [...state.clips.filter(c => c.id !== id), leftClip, rightClip],
      selectedClipId: rightClip.id
    };
  }),

  moveClip: (id, deltaStart, newTrackId) => set((state) => {
    return {
      clips: state.clips.map(c => {
        if (c.id === id) {
          const duration = c.end - c.start;
          const start = Math.max(0, c.start + deltaStart);
          return {
            ...c,
            start,
            end: start + duration,
            trackId: newTrackId || c.trackId
          };
        }
        return c;
      })
    };
  }),
  
  updateClipTransform: (id, updates) => set((state) => ({
    clips: state.clips.map(c => c.id === id ? { ...c, transform: { ...c.transform, ...updates } } : c)
  })),

  updateTextData: (id, updates) => set((state) => ({
    clips: state.clips.map(c => c.id === id ? { ...c, textData: { ...c.textData!, ...updates } } : c)
  })),

  addEffectToClip: (clipId, effectType) => set((state) => ({
    clips: state.clips.map(c => {
      if (c.id === clipId) {
        const newEffect: Effect = { id: Math.random().toString(36).substring(7), type: effectType, intensity: 1.0 };
        return { ...c, effects: [...c.effects, newEffect] };
      }
      return c;
    })
  })),

  updateEffect: (clipId, effectId, intensity) => set((state) => ({
    clips: state.clips.map(c => {
      if (c.id === clipId) {
        return { ...c, effects: c.effects.map(e => e.id === effectId ? { ...e, intensity } : e) };
      }
      return c;
    })
  })),

  removeEffect: (clipId, effectId) => set((state) => ({
    clips: state.clips.map(c => {
      if (c.id === clipId) {
        return { ...c, effects: c.effects.filter(e => e.id !== effectId) };
      }
      return c;
    })
  })),

  updateTransitions: (id, updates) => set((state) => ({
    clips: state.clips.map(c => c.id === id ? { ...c, ...updates } : c)
  })),

  addKeyframe: (clipId, time, properties) => set((state) => ({
    clips: state.clips.map(c => {
      if (c.id === clipId) {
        const kfs = c.keyframes || [];
        const newKf: Keyframe = { id: Math.random().toString(36).substring(7), time, ...properties };
        // Sort keyframes by time automatically
        return { ...c, keyframes: [...kfs, newKf].sort((a, b) => a.time - b.time) };
      }
      return c;
    })
  })),

  removeKeyframe: (clipId, keyframeId) => set((state) => ({
    clips: state.clips.map(c => {
      if (c.id === clipId && c.keyframes) {
        return { ...c, keyframes: c.keyframes.filter(k => k.id !== keyframeId) };
      }
      return c;
    })
  })),
  
  setPlayhead: (time) => set({ playhead: Math.max(0, time) }),
  setSelectedClip: (id) => set({ selectedClipId: id }),
}));
