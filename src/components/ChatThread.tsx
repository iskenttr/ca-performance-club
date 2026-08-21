import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '../constants';
import { useApp } from '../context/AppContext';
import { TRAINER_ID } from '../types/domain';
import { formatShortDate, formatTime, isSameDay } from '../utils/date';
import { AppText, Avatar, EmptyState } from './ui';

export const ChatThread = ({ studentId }: { studentId: string }) => {
  const { data, user, sendMessage, markThreadRead, students } = useApp();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const student = students.find((item) => item.id === studentId);
  const trainer = data?.users.find((item) => item.id === TRAINER_ID);
  const counterpart = user?.role === 'trainer' ? student : trainer;
  const messages = (data?.messages.filter((item) => item.studentId === studentId) ?? []).sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );

  useEffect(() => {
    markThreadRead(studentId);
  }, [studentId]);

  const submit = () => {
    if (!draft.trim()) return;
    sendMessage(studentId, draft);
    setDraft('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={4}>
      <View style={styles.counterpartBar}>
        <Avatar name={counterpart?.fullName ?? 'Cem Arslanoğlu'} size={40} accent={user?.role === 'student'} />
        <View style={styles.flex}>
          <AppText style={typography.bodyMedium}>{counterpart?.fullName ?? 'Cem Arslanoğlu'}</AppText>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <AppText style={styles.onlineText}>{user?.role === 'trainer' ? student?.goal : 'Personal Trainer'}</AppText>
          </View>
        </View>
        <View style={styles.securePill}>
          <MaterialCommunityIcons name="shield-check-outline" size={14} color={colors.success} />
          <AppText style={styles.secureText}>Özel</AppText>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {!messages.length ? (
          <EmptyState icon="message-text-outline" title="Sohbeti başlat" description="Sorularını, antrenman notlarını veya durumunu buradan paylaşabilirsin." />
        ) : null}
        {messages.map((message, index) => {
          const mine = message.senderId === user?.id;
          const previous = messages[index - 1];
          const showDate = !previous || !isSameDay(previous.sentAt, message.sentAt);
          return (
            <React.Fragment key={message.id}>
              {showDate ? (
                <View style={styles.dateDivider}>
                  <AppText style={styles.dateText}>{formatShortDate(message.sentAt)}</AppText>
                </View>
              ) : null}
              <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <AppText style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.text}</AppText>
                  <View style={styles.timeRow}>
                    <AppText style={[styles.timeText, mine && styles.timeTextMine]}>{formatTime(message.sentAt)}</AppText>
                    {mine ? <MaterialCommunityIcons name={message.readAt ? 'check-all' : 'check'} size={14} color={message.readAt ? colors.accentDark : '#BDD0CA'} /> : null}
                  </View>
                </View>
              </View>
            </React.Fragment>
          );
        })}
      </ScrollView>

      <View style={styles.composerWrap}>
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Mesajını yaz..."
            placeholderTextColor="#84918D"
            multiline
            maxLength={1000}
            style={styles.composerInput}
          />
          <Pressable onPress={submit} disabled={!draft.trim()} style={({ pressed }) => [styles.sendButton, !draft.trim() && styles.sendButtonDisabled, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="send" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  counterpartBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.cream },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  onlineText: { ...typography.caption, color: colors.inkSoft },
  securePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.successSoft },
  secureText: { fontSize: 10, lineHeight: 13, color: colors.success, fontWeight: '700' },
  messages: { flex: 1 },
  messagesContent: { flexGrow: 1, padding: spacing.lg, gap: spacing.sm, justifyContent: 'flex-end' },
  dateDivider: { alignItems: 'center', marginVertical: spacing.md },
  dateText: { ...typography.caption, color: colors.inkSoft, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: 20, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: 3 },
  bubbleOther: { backgroundColor: colors.surface, borderBottomLeftRadius: 6 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  bubbleText: { lineHeight: 21 },
  bubbleTextMine: { color: colors.white },
  timeRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 3 },
  timeText: { fontSize: 10, lineHeight: 12, color: colors.inkSoft },
  timeTextMine: { color: '#BDD0CA' },
  composerWrap: { padding: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.cream, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  composer: { minHeight: 50, maxHeight: 120, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: 25, borderWidth: 1, borderColor: colors.border, paddingLeft: spacing.lg, paddingRight: 5, paddingVertical: 5 },
  composerInput: { flex: 1, minWidth: 0, minHeight: 38, maxHeight: 100, color: colors.ink, fontSize: Platform.OS === 'web' ? 16 : 15, lineHeight: 20, paddingTop: 9, paddingBottom: 7 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  sendButtonDisabled: { opacity: 0.35 },
  pressed: { opacity: 0.72 },
});
