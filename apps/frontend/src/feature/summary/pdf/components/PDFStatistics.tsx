import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { ActivityStatistics } from '@plum/shared-interfaces';

import { colors, styles } from '../styles';

const statisticsStyles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 800,
    color: colors.text,
  },
  interactionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interactionItem: {
    width: '48%',
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  interactionCount: {
    fontSize: 20,
    fontWeight: 800,
    color: colors.text,
    marginBottom: 4,
  },
  interactionLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.text,
  },
  rankingSection: {
    marginTop: 16,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rankNumber: {
    width: 24,
    fontSize: 12,
    fontWeight: 700,
    color: colors.primary,
  },
  rankName: {
    flex: 1,
    fontSize: 10,
    color: colors.text,
  },
  rankScore: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.text,
  },
});

interface PDFStatisticsProps {
  activityStatistics: ActivityStatistics;
}

export function PDFStatistics({ activityStatistics }: PDFStatisticsProps) {
  const { averageScore, ranks, interactions } = activityStatistics;
  const totalInteractions =
    interactions.gestureCount +
    interactions.chatCount +
    interactions.voteCount +
    interactions.answerCount;

  const interactionItems = [
    { type: '투표 참여', count: interactions.voteCount },
    { type: 'QnA 참여', count: interactions.answerCount },
    { type: '제스처 반응', count: interactions.gestureCount },
    { type: '채팅 메시지', count: interactions.chatCount },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>참여도 통계</Text>

      <View style={statisticsStyles.statsRow}>
        <View style={statisticsStyles.statCard}>
          <Text style={statisticsStyles.statLabel}>평균 참여도 점수</Text>
          <Text style={statisticsStyles.statValue}>{Math.round(averageScore)} 점</Text>
        </View>
        <View style={statisticsStyles.statCard}>
          <Text style={statisticsStyles.statLabel}>총 반응 수</Text>
          <Text style={statisticsStyles.statValue}>{totalInteractions} 회</Text>
        </View>
      </View>

      {ranks.length > 0 && (
        <View style={statisticsStyles.rankingSection}>
          <Text style={[styles.text, styles.bold, { marginBottom: 8 }]}>참여도 순위</Text>
          {ranks.map((rank) => (
            <View
              key={rank.participantId}
              style={statisticsStyles.rankItem}
            >
              <Text style={statisticsStyles.rankNumber}>{rank.rank}</Text>
              <Text style={statisticsStyles.rankName}>{rank.name}</Text>
              <Text style={statisticsStyles.rankScore}>{rank.score}점</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ marginTop: 16 }}>
        <Text style={[styles.text, styles.bold, { marginBottom: 8 }]}>인터렉션 유형별 분석</Text>
        <View style={statisticsStyles.interactionGrid}>
          {interactionItems.map((item, index) => (
            <View
              key={index}
              style={statisticsStyles.interactionItem}
            >
              <Text style={statisticsStyles.interactionCount}>{item.count}</Text>
              <Text style={statisticsStyles.interactionLabel}>{item.type}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
