import { SpeakerCard } from './SpeakerCard';
import type { SpeakerLayoutProps } from './SpeakerGrid';

/**
 * List layout (`directory_layout="list"`) — a single stacked column. The other
 * A/B directory layout; shares {@link SpeakerCard} with the grid.
 */
export function SpeakerList({ speakers, topicLabel }: SpeakerLayoutProps) {
  return (
    <ul className="flex flex-col gap-3">
      {speakers.map((speaker) => (
        <li key={speaker.uid}>
          <SpeakerCard speaker={speaker} topicLabel={topicLabel} />
        </li>
      ))}
    </ul>
  );
}

export default SpeakerList;
