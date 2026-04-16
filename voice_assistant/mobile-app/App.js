import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import FarmerSVG from './components/FarmerSVG';

const { width, height } = Dimensions.get('window');
const API_URL = 'http://localhost:5000/api'; // Change to your backend URL

const LANGUAGES = [
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
];

export default function App() {
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [response, setResponse] = useState(null);
  const [translatedResponse, setTranslatedResponse] = useState(null);
  const [statusText, setStatusText] = useState('Tap microphone to speak');
  
  const micScale = new Animated.Value(1);
  const pulseAnim = new Animated.Value(1);

  const [recording, setRecording] = useState(null);

  useEffect(() => {
    pulseAnimation();
  }, []);

  const pulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow microphone access');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_WAV,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      await newRecording.start();
      setRecording(newRecording);
      setIsRecording(true);
      setStatusText('Listening... Speak now');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      setStatusText('Processing...');
      await recording.stopAndUnloadAsync();
      
      const uri = recording.getURI();
      setRecording(null);
      
      // Convert to base64 and send to backend
      await processAudio(uri);
    } catch (err) {
      console.error('Failed to stop recording', err);
      setIsProcessing(false);
      setStatusText('Tap microphone to speak');
    }
  };

  const processAudio = async (audioUri) => {
    setIsProcessing(true);
    
    try {
      // Read audio file as base64
      const response = await fetch(audioUri);
      const blob = await response.blob();
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });

      // Step 1: Transcribe
      const transcribeRes = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64,
          lang_code: selectedLang.code,
        }),
      });

      const transcribeData = await transcribeRes.json();

      // Step 2: Get AI response
      const askRes = await fetch(`${API_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: transcribeData.translated,
          is_comprehensive: false,
        }),
      });

      const askData = await askRes.json();

      // Step 3: Generate TTS
      const speakRes = await fetch(`${API_URL}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: askData.answer,
          lang_code: selectedLang.code,
        }),
      });

      const speakData = await speakRes.json();

      setResponse(askData.answer);
      setTranslatedResponse(speakData.translated);
      setStatusText('Response ready!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Play audio
      if (speakData.audio) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/wav;base64,${speakData.audio}` }
        );
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Processing failed:', error);
      Alert.alert('Error', 'Failed to process your request');
      setStatusText('Tap microphone to speak');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicPress = () => {
    if (isProcessing) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1f14" />
      
      {/* Header */}
      <LinearGradient
        colors={['#0a1f14', '#163825']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>🌾 Smart Farm Advisory</Text>
        <Text style={styles.headerSubtitle}>AI Voice Assistant for Farmers</Text>
      </LinearGradient>

      {/* Main Content */}
      <View style={styles.content}>
        
        {/* Language Selector Button */}
        <TouchableOpacity
          style={styles.langButton}
          onPress={() => setShowLangModal(true)}
        >
          <Ionicons name="language" size={20} color="#52c060" />
          <Text style={styles.langButtonText}>
            {selectedLang.native} ({selectedLang.name})
          </Text>
          <Ionicons name="chevron-down" size={20} color="#52c060" />
        </TouchableOpacity>

        {/* Farmer Animation & Mic - Center */}
        <View style={styles.centerSection}>
          <View style={styles.farmerContainer}>
            <FarmerSVG width={width * 0.6} height={width * 0.7} />
          </View>

          {/* Microphone Button */}
          <View style={styles.micContainer}>
            {isRecording && (
              <Animated.View
                style={[
                  styles.pulseRing,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
            )}
            <TouchableOpacity
              style={[
                styles.micButton,
                isRecording && styles.micButtonRecording,
              ]}
              onPress={handleMicPress}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={48}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* Status Text */}
          <Text style={styles.statusText}>{statusText}</Text>
        </View>

        {/* Response Section */}
        {(response || translatedResponse) && (
          <View style={styles.responseSection}>
            {response && (
              <View style={styles.responseCard}>
                <Text style={styles.responseLabel}>💡 AI Advisory</Text>
                <Text style={styles.responseText}>{response}</Text>
              </View>
            )}
            
            {translatedResponse && (
              <View style={styles.responseCard}>
                <Text style={styles.responseLabel}>
                  🗣️ Response in {selectedLang.name}
                </Text>
                <Text style={styles.responseText}>{translatedResponse}</Text>
              </View>
            )}
          </View>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#52c060" />
            <Text style={styles.processingText}>Processing your question...</Text>
          </View>
        )}
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={showLangModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLangModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Language</Text>
            <ScrollView style={styles.langList}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langItem,
                    selectedLang.code === lang.code && styles.langItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedLang(lang);
                    setShowLangModal(false);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text style={styles.langItemText}>
                    {lang.native}
                  </Text>
                  <Text style={styles.langItemSubtext}>{lang.name}</Text>
                  {selectedLang.code === lang.code && (
                    <Ionicons name="checkmark-circle" size={24} color="#52c060" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLangModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1f14',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#52c060',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(82,192,96,0.3)',
  },
  langButtonText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  farmerContainer: {
    marginBottom: 20,
  },
  micContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(224,82,82,0.3)',
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2d7a3a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#52c060',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  micButtonRecording: {
    backgroundColor: '#e05252',
  },
  statusText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
  },
  responseSection: {
    marginBottom: 20,
  },
  responseCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(82,192,96,0.2)',
  },
  responseLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f0b429',
    marginBottom: 10,
  },
  responseText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 24,
  },
  processingContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  processingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#163825',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.7,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  langList: {
    padding: 10,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  langItemSelected: {
    backgroundColor: 'rgba(82,192,96,0.2)',
    borderWidth: 1,
    borderColor: '#52c060',
  },
  langItemText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  langItemSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginRight: 10,
  },
  closeButton: {
    backgroundColor: '#2d7a3a',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
