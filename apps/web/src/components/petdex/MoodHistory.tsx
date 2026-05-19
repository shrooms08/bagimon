import type { Mood } from '@bagimon/shared';
import { Panel } from '../ui/Panel';
import styles from './MoodHistory.module.css';
import { dayCount, relativeTime } from '../../lib/format';
import type { PetdexMoodSegment } from '../../lib/types';

const SWATCH: Record<Mood, string> = {
  happy: '#e87a5e',
  thriving: '#e9a92a',
  hungry: '#c0673a',
  sick: '#8a5c84',
  dying: '#8a8270',
};

interface MoodHistoryProps {
  segments: PetdexMoodSegment[];
  bornAt: Date;
}

interface Computed {
  mood: Mood;
  widthPct: number;
  startedAt: Date;
  endedAt: Date;
  reason: string;
}

function computeSegments(segments: PetdexMoodSegment[], bornAt: Date, now: Date): Computed[] {
  // segments are most-recent-first. Reverse so we can walk forward in time.
  const ordered = [...segments].reverse();
  if (ordered.length === 0) return [];
  const totalMs = Math.max(1, now.getTime() - bornAt.getTime());
  const result: Computed[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const seg = ordered[i]!;
    const start = seg.startedAt;
    const next = ordered[i + 1];
    const end = next ? next.startedAt : now;
    const widthMs = Math.max(0, end.getTime() - start.getTime());
    result.push({
      mood: seg.mood,
      widthPct: (widthMs / totalMs) * 100,
      startedAt: start,
      endedAt: end,
      reason: seg.reason,
    });
  }
  return result;
}

export function MoodHistory({ segments, bornAt }: MoodHistoryProps) {
  const now = new Date();
  const computed = computeSegments(segments, bornAt, now);
  const ageLabel = `${dayCount(bornAt, now)}d ago`;
  return (
    <section aria-label="Mood history">
      <h2 className="section-title">MOOD HISTORY</h2>
      <Panel className={styles.wrap}>
        {computed.length === 0 ? (
          <p className={styles.empty}>No mood history yet.</p>
        ) : (
          <>
            <div className={styles.ribbon}>
              {computed.map((seg, idx) => (
                <div
                  key={idx}
                  className={styles.seg}
                  tabIndex={0}
                  style={{ width: `${seg.widthPct}%`, background: SWATCH[seg.mood] }}
                >
                  <div className={styles.tip}>
                    <strong>{seg.mood.toUpperCase()}</strong>
                    {relativeTime(seg.startedAt, now)}
                    <br />
                    {seg.reason}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.axis}>
              <span>{ageLabel}</span>
              <span>now</span>
            </div>
          </>
        )}
        <div className={styles.legend}>
          <span>
            <i className="swatch-happy" />
            happy
          </span>
          <span>
            <i className="swatch-thriving" />
            thriving
          </span>
          <span>
            <i className="swatch-hungry" />
            hungry
          </span>
          <span>
            <i className="swatch-sick" />
            sick
          </span>
          <span>
            <i className="swatch-dying" />
            dying
          </span>
        </div>
      </Panel>
    </section>
  );
}
