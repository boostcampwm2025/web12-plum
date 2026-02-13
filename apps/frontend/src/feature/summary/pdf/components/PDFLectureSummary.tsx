import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Timelines } from '@plum/shared-interfaces';

import { colors, styles } from '../styles';

const summaryStyles = StyleSheet.create({
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 9,
    color: colors.text,
    fontWeight: 700,
  },
  summaryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 10,
    color: colors.subtext,
    lineHeight: 1.6,
  },
  timelineCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timelineTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.primary,
    flex: 1,
  },
  timelineTime: {
    fontSize: 10,
    color: colors.text,
  },
  timelineContent: {
    fontSize: 10,
    color: colors.subtext,
    lineHeight: 1.5,
  },
  emptyText: {
    fontSize: 10,
    color: colors.subtext,
    textAlign: 'center',
    padding: 16,
  },
});

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

interface PDFLectureSummaryProps {
  summary: string;
  timelines: Timelines[];
  tags: string[];
}

export function PDFLectureSummary({ summary, timelines, tags }: PDFLectureSummaryProps) {
  return (
    <View
      style={styles.section}
      wrap
    >
      <Text style={styles.sectionTitle}>강의 요약</Text>

      {tags.length > 0 && (
        <View style={summaryStyles.tagsContainer}>
          {tags.map((tag, index) => (
            <View
              key={index}
              style={summaryStyles.tag}
            >
              <Text style={summaryStyles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {summary && (
        <View style={summaryStyles.summaryCard}>
          <Text style={summaryStyles.summaryText}>{summary}</Text>
        </View>
      )}

      {timelines.length > 0 ? (
        <View
          style={{ marginTop: 16 }}
          wrap
        >
          <Text style={[styles.text, styles.bold, { marginBottom: 12 }]}>시간대별 요약</Text>
          {timelines.map((timeline, index) => (
            <View
              key={index}
              style={summaryStyles.timelineCard}
              wrap={false}
              minPresenceAhead={100}
            >
              <View style={summaryStyles.timelineHeader}>
                <Text style={summaryStyles.timelineTitle}>
                  {formatTime(timeline.startedAt)} ~ {formatTime(timeline.endedAt)}
                </Text>
              </View>
              <Text style={summaryStyles.timelineContent}>{timeline.content}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={summaryStyles.summaryCard}>
          <Text style={summaryStyles.emptyText}>강의 요약이 없습니다.</Text>
        </View>
      )}
    </View>
  );
}
