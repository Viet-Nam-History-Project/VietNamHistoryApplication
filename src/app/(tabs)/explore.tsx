/** Tab trợ lý AI sử dụng kho tri thức lịch sử đã được kiểm duyệt. */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { AppHeader, Card, Screen } from '@/components/ui';
import { askHistoryAi } from '@/services/chatAiService';

type ChatRole = 'assistant' | 'user';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  confidence?: number;
  isError?: boolean;
}

const QUICK_PROMPTS = [
  'Chiến dịch Điện Biên Phủ diễn ra như thế nào?',
  'Tóm tắt giai đoạn 1954-1975',
  'Ai là nhân vật tiêu biểu thời chống Mỹ?',
  'Ý nghĩa của Cách mạng tháng Tám',
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'Chào bạn, mình là trợ lý học Lịch sử Việt Nam. Hãy đặt một câu hỏi về sự kiện, nhân vật hoặc giai đoạn lịch sử bạn muốn tìm hiểu.',
  },
];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const colors = useThemeColors();
  const isUser = message.role === 'user';
  const markdownStyles = useMemo(() => ({
    body: { color: colors.text, fontSize: FONT_SIZES.sm, lineHeight: 23 },
    heading1: { color: colors.text, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, marginTop: 12, marginBottom: 7 },
    heading2: { color: colors.text, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, marginTop: 11, marginBottom: 6 },
    heading3: { color: colors.text, fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.bold, marginTop: 9, marginBottom: 5 },
    paragraph: { marginTop: 0, marginBottom: 9 },
    strong: { color: colors.text, fontWeight: FONT_WEIGHTS.bold },
    bullet_list: { marginBottom: 8 },
    ordered_list: { marginBottom: 8 },
    list_item: { marginBottom: 4 },
    table: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginVertical: 8 },
    tr: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    th: { backgroundColor: colors.primaryDim, padding: 6 },
    td: { padding: 6 },
  }), [colors]);

  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="sparkles-outline" size={17} color={colors.primary} />
        </View>
      )}

      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? colors.primary : colors.surface,
            borderColor: message.isError
              ? colors.error
              : isUser
                ? colors.primary
                : colors.border,
          },
        ]}
      >
        {isUser || message.isError ? <Text style={[styles.messageText, { color: isUser ? colors.onPrimary : colors.text }]}>{message.content}</Text> : <Markdown style={markdownStyles}>{message.content}</Markdown>}

      </View>
    </View>
  );
}

function PromptChip({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.promptChip,
        {
          backgroundColor: colors.primaryDim,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primary} />
      <Text style={[styles.promptText, { color: colors.text }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const colors = useThemeColors();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const canSend = draft.trim().length > 0 && !isThinking;

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question || isThinking) return;

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content: question,
    };

    setDraft('');
    setMessages((current) => [...current, userMessage]);
    setIsThinking(true);
    scrollToEnd();

    try {
      const history = messages
        .filter((message) => message.id !== 'welcome' && !message.isError)
        .slice(-8)
        .map(({ role, content }) => ({ role, content }));
      const result = await askHistoryAi(question, history);
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: 'assistant',
        content: result.answer,
        confidence: result.confidence,
      };
      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: 'assistant',
          content: error instanceof Error
            ? error.message
            : 'Không thể kết nối với trợ lý AI. Vui lòng thử lại.',
          isError: true,
        },
      ]);
    } finally {
      setIsThinking(false);
      scrollToEnd();
    }
  }, [isThinking, messages, scrollToEnd]);

  const footer = useMemo(() => {
    if (!isThinking) return null;

    return (
      <View style={[styles.thinkingRow, { borderColor: colors.border }]}>
        <View style={[styles.thinkingDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.thinkingText, { color: colors.textSecondary }]}>Đang soạn câu trả lời...</Text>
      </View>
    );
  }, [colors.border, colors.primary, colors.textSecondary, isThinking]);

  return (
    <Screen>
      <AppHeader title="Chat AI" subtitle="Trợ lý Lịch sử Việt Nam" showBack={false} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        style={styles.keyboardRoot}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: ListRenderItemInfo<ChatMessage>) => <MessageBubble message={item} />}
          ListHeaderComponent={
            <View style={styles.topContent}>
              <Card highlighted style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <View style={[styles.heroIcon, { backgroundColor: colors.primaryDim }]}>
                    <Ionicons name="school-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.heroCopy}>
                    <Text style={[styles.heroTitle, { color: colors.text }]}>Hỏi đáp lịch sử</Text>
                    <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                      Tìm hiểu sự kiện, nhân vật và mốc thời gian Việt Nam
                    </Text>
                  </View>
                </View>
              </Card>

              <View style={styles.promptGrid}>
                {QUICK_PROMPTS.map((prompt) => (
                  <PromptChip key={prompt} label={prompt} onPress={() => sendMessage(prompt)} />
                ))}
              </View>
            </View>
          }
          ListFooterComponent={footer}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
        />

        <View
          style={[
            styles.inputPanel,
            {
              backgroundColor: colors.surfaceElevated,
              borderTopColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Nhập câu hỏi lịch sử..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              style={[styles.input, { color: colors.text }]}
              selectionColor={colors.primary}
            />
            <Pressable
              onPress={() => sendMessage(draft)}
              disabled={!canSend}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: canSend ? colors.primary : colors.primaryDim,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <Ionicons
                name={isThinking ? 'hourglass-outline' : 'send'}
                size={18}
                color={canSend ? colors.onPrimary : colors.textMuted}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[5],
    gap: SPACING[3],
  },
  topContent: {
    gap: SPACING[3],
    marginBottom: SPACING[1],
  },
  heroCard: {
    gap: SPACING[3],
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: SPACING[1],
  },
  heroTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  heroSubtitle: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  promptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  promptChip: {
    width: '48.6%',
    minHeight: 60,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
  },
  promptText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING[2],
  },
  assistantRow: {
    alignSelf: 'flex-start',
    paddingRight: SPACING[8],
  },
  userRow: {
    alignSelf: 'flex-end',
    paddingLeft: SPACING[8],
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
  },
  messageText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 22,
  },
  thinkingRow: {
    alignSelf: 'flex-start',
    marginLeft: 40,
    minHeight: 38,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  thinkingText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  inputPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[3],
    paddingBottom: Platform.select({ ios: SPACING[5], android: SPACING[3], default: SPACING[3] }),
  },
  inputBox: {
    minHeight: 52,
    maxHeight: 124,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    paddingLeft: SPACING[3],
    paddingRight: SPACING[2],
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING[2],
  },
  input: {
    flex: 1,
    minHeight: 50,
    maxHeight: 112,
    paddingTop: SPACING[3],
    paddingBottom: SPACING[3],
    fontSize: FONT_SIZES.sm,
    lineHeight: 21,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
});
