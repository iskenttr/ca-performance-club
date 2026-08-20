import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TopBar } from '../../components/AppFrame';
import { ChatThread } from '../../components/ChatThread';
import { AppText, Avatar, Card, EmptyState, Page, TextField } from '../../components/ui';
import { colors, radius, spacing, typography } from '../../constants';
import { useApp } from '../../context/AppContext';
import { TRAINER_ID, Trainer } from '../../types/domain';
import { formatShortDate, formatTime, isSameDay } from '../../utils/date';

export const TrainerMessagesScreen = ({ onProfile, initialStudentId }: { onProfile: () => void; initialStudentId?: string }) => {
  const { data, user, students } = useApp();
  const trainer = user as Trainer;
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId ?? null);
  const [query, setQuery] = useState('');
  const selectedStudent = students.find((item) => item.id === selectedStudentId);

  const conversations = useMemo(() => students.map((student) => {
    const messages = data?.messages.filter((item) => item.studentId === student.id).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()) ?? [];
    return {
      student,
      lastMessage: messages[0],
      unread: messages.filter((item) => item.senderId !== TRAINER_ID && !item.readAt).length,
    };
  }).filter((item) => item.lastMessage).sort((a, b) => new Date(b.lastMessage!.sentAt).getTime() - new Date(a.lastMessage!.sentAt).getTime()), [data?.messages, students]);

  if (selectedStudentId && selectedStudent) {
    return (
      <View style={styles.root}>
        <TopBar eyebrow="Öğrenci mesajı" title={selectedStudent.fullName} onBack={() => setSelectedStudentId(null)} />
        <ChatThread studentId={selectedStudentId} />
      </View>
    );
  }

  const filtered = conversations.filter((item) => item.student.fullName.toLocaleLowerCase('tr-TR').includes(query.trim().toLocaleLowerCase('tr-TR')));

  return (
    <View style={styles.root}>
      <TopBar eyebrow="Birebir iletişim" title="Mesajlar" name={trainer.fullName} onProfile={onProfile} />
      <Page>
        <TextField value={query} onChangeText={setQuery} placeholder="Sohbet ara" icon="magnify" />
        <View style={styles.inboxSummary}>
          <View style={styles.inboxIcon}><MaterialCommunityIcons name="message-badge-outline" size={24} color={colors.primary} /></View>
          <View style={styles.flex}><AppText style={typography.bodyMedium}>{conversations.reduce((sum, item) => sum + item.unread, 0)} okunmamış mesaj</AppText><AppText style={styles.muted}>Öğrenci mesajları yalnızca seninle paylaşılır.</AppText></View>
        </View>
        <View style={styles.list}>
          {filtered.length ? filtered.map(({ student, lastMessage, unread }) => (
            <Pressable key={student.id} onPress={() => setSelectedStudentId(student.id)} style={({ pressed }) => [styles.conversation, pressed && styles.pressed]}>
              <View style={styles.avatarWrap}>
                <Avatar name={student.fullName} size={55} accent={unread > 0} />
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.flex}>
                <View style={styles.conversationTop}>
                  <AppText style={[typography.bodyMedium, unread > 0 && styles.unreadName]}>{student.fullName}</AppText>
                  <AppText style={[styles.time, unread > 0 && styles.timeUnread]}>{isSameDay(lastMessage!.sentAt, new Date().toISOString()) ? formatTime(lastMessage!.sentAt) : formatShortDate(lastMessage!.sentAt)}</AppText>
                </View>
                <View style={styles.previewRow}>
                  <AppText style={[styles.preview, unread > 0 && styles.previewUnread]} numberOfLines={2}>{lastMessage!.senderId === TRAINER_ID ? 'Sen: ' : ''}{lastMessage!.text}</AppText>
                  {unread ? <View style={styles.unreadBadge}><AppText style={styles.unreadBadgeText}>{unread}</AppText></View> : <MaterialCommunityIcons name="chevron-right" size={20} color={colors.border} />}
                </View>
              </View>
            </Pressable>
          )) : <Card><EmptyState icon="message-text-outline" title="Sohbet bulunamadı" description={query ? 'Arama kelimesini değiştir.' : 'Öğrenciler mesaj gönderdiğinde konuşmalar burada görünür.'} /></Card>}
        </View>
      </Page>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  muted: { ...typography.caption, color: colors.inkSoft },
  inboxSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: spacing.md },
  inboxIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  list: { gap: spacing.sm },
  conversation: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg },
  avatarWrap: { position: 'relative' },
  onlineDot: { position: 'absolute', right: 1, bottom: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: colors.success, borderWidth: 3, borderColor: colors.surface },
  conversationTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  unreadName: { fontWeight: '800' },
  time: { ...typography.caption, color: colors.inkSoft },
  timeUnread: { color: colors.success, fontWeight: '700' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  preview: { flex: 1, ...typography.caption, color: colors.inkSoft },
  previewUnread: { color: colors.ink, fontWeight: '600' },
  unreadBadge: { minWidth: 21, height: 21, paddingHorizontal: 5, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText: { color: colors.white, fontSize: 10, lineHeight: 12, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});

