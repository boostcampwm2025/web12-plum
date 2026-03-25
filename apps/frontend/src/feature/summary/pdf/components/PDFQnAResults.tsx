import type { Qna } from '@plum/shared-interfaces';
import { StyleSheet, Text, View } from '@react-pdf/renderer';

import { colors, styles } from '../styles';

const qnaStyles = StyleSheet.create({
  qnaCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  qnaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  qnaTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.text,
    flex: 1,
  },
  qnaParticipants: {
    fontSize: 10,
    color: colors.subtext,
  },
  answerContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  answerItem: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 12,
  },
  answerName: {
    width: 80,
    fontSize: 10,
    fontWeight: 700,
    color: colors.primary,
  },
  answerText: {
    flex: 1,
    fontSize: 10,
    color: colors.subtext,
  },
  emptyText: {
    fontSize: 10,
    color: colors.subtext,
    textAlign: 'center',
    padding: 16,
  },
});

interface PDFQnAResultsProps {
  qnas: Qna[];
}

export function PDFQnAResults({ qnas }: PDFQnAResultsProps) {
  if (qnas.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>QnA 결과</Text>
        <View style={qnaStyles.qnaCard}>
          <Text style={qnaStyles.emptyText}>등록된 QnA가 없습니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.section}
      wrap
    >
      <Text style={styles.sectionTitle}>QnA 결과</Text>

      {qnas.map((qna) => (
        <View
          key={qna.id}
          style={qnaStyles.qnaCard}
          wrap={false}
          minPresenceAhead={100}
        >
          <View style={qnaStyles.qnaHeader}>
            <Text style={qnaStyles.qnaTitle}>{qna.title}</Text>
            <Text style={qnaStyles.qnaParticipants}>{qna.answers.length}명 참여</Text>
          </View>

          {qna.answers.length > 0 ? (
            <View style={qnaStyles.answerContainer}>
              {qna.answers.map((answer) => (
                <View
                  key={answer.participantId}
                  style={qnaStyles.answerItem}
                >
                  <Text style={qnaStyles.answerName}>{answer.participantName}</Text>
                  <Text style={qnaStyles.answerText}>{answer.text}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={qnaStyles.emptyText}>등록된 답변이 없습니다.</Text>
          )}
        </View>
      ))}
    </View>
  );
}
