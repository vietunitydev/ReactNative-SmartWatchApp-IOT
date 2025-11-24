// screens/ChatBotScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const GEMINI_API_KEY = 'AIzaSyAUq1lisVRbCj_K6izyDS-pvW4laeLmiEg';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

const ChatBotScreen = ({ route, navigation }) => {
  const { latestSensorData } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef();

  // Dữ liệu hiện tại (dễ đọc)
  const data = latestSensorData || {};
  const hasData = data.spo2 || data.heartRate;

  // Prompt hệ thống chung
  const systemPrompt = `Bạn là bác sĩ AI cá nhân bằng tiếng Việt, thân thiện, chuyên nghiệp.
Dữ liệu sức khỏe mới nhất từ thiết bị đeo tay:
• SpO2: ${data.spo2 || '--'}%
• Nhịp tim: ${data.heartRate || '--'} bpm ${data.heartRateValid ? '(ổn định)' : '(chưa ổn)'}
• Bước chân hôm nay: ${data.step || 0} bước
• Pin: ${data.batteryLevel || '--'}% ${data.isCharging ? '(đang sạc)' : ''}
• Té ngã: ${data.fallDetected ? 'CÓ' : 'Không phát hiện'}
• Tín hiệu: ${data.signalQuality || 'không rõ'}

Hãy trả lời ngắn gọn, tích cực, có emoji, và gợi ý thực tế.`;

  useEffect(() => {
    if (!hasData) {
      setMessages([
        { id: '1', text: 'Xin chào! Hãy kết nối thiết bị để tôi hỗ trợ bạn tốt nhất nhé!', sender: 'bot' }
      ]);
    } else {
      setMessages([
        { id: 'welcome', text: 'Chào bạn! Dữ liệu sức khỏe đã được cập nhật. Bạn muốn tôi giúp gì hôm nay?', sender: 'bot' }
      ]);
    }
  }, []);

  // Hàm gọi Gemini với câu hỏi cụ thể
  const askGemini = async (question) => {
    if (loading) return;
    setLoading(true);

    const userMsg = { id: Date.now().toString(), text: question, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Hiểu rồi, tôi sẽ trả lời dựa trên dữ liệu trên.' }] },
            { role: 'user', parts: [{ text: question }] }
          ],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1500 }
        })
      });

      const res = await response.json();
      const reply = res.candidates?.[0]?.content?.parts?.[0]?.text || 'Tôi đang suy nghĩ...';

      setMessages(prev => [...prev, { id: Date.now().toString(), text: reply, sender: 'bot' }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now().toString(), text: 'Không kết nối được AI. Thử lại nhé!', sender: 'bot' }]);
    } finally {
      setLoading(false);
    }
  };

  // 3 gợi ý thông minh
  const suggestions = [
    {
      title: 'Phân tích sức khỏe hiện tại',
      icon: 'heart-outline',
      color: '#ef4444',
      question: 'Hãy phân tích chi tiết tình trạng sức khỏe của tôi ngay bây giờ dựa trên dữ liệu mới nhất (SpO2, nhịp tim, bước chân, té ngã...). Có gì cần lưu ý không?'
    },
    {
      title: 'Gợi ý bài tập hôm nay',
      icon: 'walk-outline',
      color: '#10b981',
      question: 'Dựa trên nhịp tim, SpO2 và số bước chân hiện tại, hãy gợi ý cho tôi 1-2 bài tập phù hợp hôm nay (đi bộ, hít thở, yoga nhẹ...) kèm thời gian và lợi ích.'
    },
    {
      title: 'Thực đơn ăn uống',
      icon: 'restaurant-outline',
      color: '#f59e0b',
      question: 'Dựa trên dữ liệu sức khỏe hiện tại, hãy gợi ý thực đơn 3 bữa hôm nay (sáng, trưa, tối) phù hợp để tăng cường sức khỏe tim mạch và năng lượng.'
    },
  ];

  const renderMessage = ({ item }) => (
    <View style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.botBubble]}>
      <Text style={[styles.messageText, item.sender === 'user' ? styles.userText : styles.botText]}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Trợ lý sức khỏe AI</Text>
        <Icon name="chatbubble-ellipses" size={28} color="#fff" />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          ListHeaderComponent={
            hasData && messages.length <= 1 ? (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionTitle}>Bạn muốn tôi giúp gì?</Text>
                <View style={styles.suggestionGrid}>
                  {suggestions.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.suggestionCard, { borderLeftColor: s.color }]}
                      onPress={() => askGemini(s.question)}
                      activeOpacity={0.8}
                    >
                      <Icon name={s.icon} size={28} color={s.color} />
                      <Text style={styles.suggestionText}>{s.title}</Text>
                      <Icon name="chevron-forward" size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Nhập câu hỏi của bạn..."
            placeholderTextColor="#94a3b8"
            onSubmitEditing={() => inputText.trim() && askGemini(inputText)}
          />
          <TouchableOpacity
            onPress={() => inputText.trim() && askGemini(inputText)}
            disabled={loading || !inputText.trim()}
            style={[styles.sendBtn, (loading || !inputText.trim()) && styles.sendBtnDisabled]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Icon name="send" size={24} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0ea5e9', paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 19, fontWeight: '700', color: '#fff' },
  messageList: { padding: 16, paddingTop: 8 },
  messageBubble: { maxWidth: '85%', padding: 14, borderRadius: 20, marginVertical: 6 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#0ea5e9' },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#e2e8f0' },
  messageText: { fontSize: 16, lineHeight: 23 },
  userText: { color: '#fff' },
  botText: { color: '#1e293b' },

  // 3 gợi ý đẹp lung linh
  suggestionsContainer: { marginBottom: 20 },
  suggestionTitle: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 12, textAlign: 'center' },
  suggestionGrid: { gap: 12 },
  suggestionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestionText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', color: '#1e293b' },

  inputContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14, fontSize: 16, maxHeight: 100, marginRight: 12 },
  sendBtn: { backgroundColor: '#0ea5e9', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#94a3b8' },
});

export default ChatBotScreen;