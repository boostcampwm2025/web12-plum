import { StyleSheet } from '@react-pdf/renderer';

export const colors = {
  primary: '#7C3AED',
  text: '#FFFFFF',
  subtext: '#A1A1AA',
  background: '#18181B',
  cardBackground: '#27272A',
  border: '#3F3F46',
};

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'NanumSquareRound',
    backgroundColor: colors.background,
    color: colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 12,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 10,
    color: colors.text,
  },
  subtext: {
    fontSize: 10,
    color: colors.subtext,
  },
  bold: {
    fontWeight: 700,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 12,
  },
  pageHeader: {
    marginBottom: 16,
  },
});
