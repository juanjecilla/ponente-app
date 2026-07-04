import { SpeakerCard } from './SpeakerCard';
import type { Speaker } from '../../types';

export interface SpeakerLayoutProps {
  speakers: Speaker[];
  /** Resolves a topic slug to a localized label (from `useTags`). */
  topicLabel: (slug: string) => string;
}

/**
 * Grid layout (`directory_layout="grid"`, the default) — responsive card
 * columns. One of the two A/B directory layouts.
 */
export function SpeakerGrid({ speakers, topicLabel }: SpeakerLayoutProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {speakers.map((speaker) => (
        <li key={speaker.uid}>
          <SpeakerCard speaker={speaker} topicLabel={topicLabel} />
        </li>
      ))}
    </ul>
  );
}

export default SpeakerGrid;
