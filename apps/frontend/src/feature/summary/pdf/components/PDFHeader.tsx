import { StyleSheet, Text, View } from '@react-pdf/renderer';

import { colors } from '../styles';

const headerStyles = StyleSheet.create({
  container: {
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  compactContainer: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: colors.text,
    marginBottom: 8,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.text,
  },
  date: {
    fontSize: 12,
    color: colors.subtext,
  },
  compactDate: {
    fontSize: 10,
    color: colors.subtext,
  },
});

interface PDFHeaderProps {
  roomTitle: string;
  date: string;
  compact?: boolean;
}

export function PDFHeader({ roomTitle, date, compact = false }: PDFHeaderProps) {
  if (compact) {
    return (
      <View style={headerStyles.compactContainer}>
        <Text style={headerStyles.compactTitle}>{roomTitle}</Text>
        <Text style={headerStyles.compactDate}>{date}</Text>
      </View>
    );
  }

  return (
    <View style={headerStyles.container}>
      <Text style={headerStyles.title}>{roomTitle}</Text>
      <Text style={headerStyles.date}>{date}</Text>
    </View>
  );
}
