import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Poll } from '@plum/shared-interfaces';

import { colors, styles } from '../styles';
import { calculatePercentage } from '../../utils';

const pollStyles = StyleSheet.create({
  pollCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pollTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.text,
    flex: 1,
  },
  pollParticipants: {
    fontSize: 10,
    color: colors.subtext,
  },
  optionContainer: {
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  optionText: {
    fontSize: 10,
    color: colors.subtext,
    flex: 1,
  },
  optionResult: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.text,
  },
  optionCount: {
    color: colors.primary,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  emptyText: {
    fontSize: 10,
    color: colors.subtext,
    textAlign: 'center',
    padding: 16,
  },
});

interface PDFPollResultsProps {
  polls: Poll[];
}

export function PDFPollResults({ polls }: PDFPollResultsProps) {
  if (polls.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>투표 결과</Text>
        <View style={pollStyles.pollCard}>
          <Text style={pollStyles.emptyText}>등록된 투표가 없습니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.section}
      wrap
    >
      <Text style={styles.sectionTitle}>투표 결과</Text>

      {polls.map((poll) => {
        const totalVotes = poll.options.reduce((acc, option) => acc + option.count, 0);

        return (
          <View
            key={poll.id}
            style={pollStyles.pollCard}
            wrap={false}
            minPresenceAhead={100}
          >
            <View style={pollStyles.pollHeader}>
              <Text style={pollStyles.pollTitle}>{poll.title}</Text>
              <Text style={pollStyles.pollParticipants}>{totalVotes}명 참여</Text>
            </View>

            {poll.options.map((option, index) => {
              const percentage = calculatePercentage(option.count, totalVotes);
              return (
                <View
                  key={option.id}
                  style={pollStyles.optionContainer}
                >
                  <View style={pollStyles.optionRow}>
                    <Text style={pollStyles.optionText}>
                      {index + 1}. {option.value}
                    </Text>
                    <Text style={pollStyles.optionResult}>
                      {percentage}% <Text style={pollStyles.optionCount}>({option.count}명)</Text>
                    </Text>
                  </View>
                  <View style={pollStyles.progressBarBackground}>
                    <View style={[pollStyles.progressBarFill, { width: `${percentage}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
