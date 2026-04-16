import { Language } from '../types';

export type Intent = 
  | 'DISEASE'
  | 'SOIL'
  | 'WEATHER'
  | 'MARKET'
  | 'CROP_GROWTH'
  | 'RECOMMENDATION'
  | 'COMMUNITY'
  | 'HOME'
  | 'SUSTAINABLE'
  | 'PROFILE'
  | 'UNKNOWN';

interface IntentResult {
  intent: Intent;
  replyKey: string; // Key for the spoken confirmation
  targetView?: string; // View to navigate to
}

// Multilingual Keyword Mapping
const KEYWORDS: Record<Intent, Record<Language, string[]>> = {
  DISEASE: {
    [Language.EN]: ['disease', 'sick', 'infection', 'leaf', 'problem', 'detect'],
    [Language.HI]: ['बीमारी', 'रोग', 'कीड़ा', 'संक्रमण', 'पत्ता'],
    [Language.TA]: ['நோய்', 'பூச்சி', 'தாக்குதல்', 'இலை'],
    [Language.TE]: ['వ్యాధి', 'తెగులు', 'పురుగు', 'ఆకు'],
    [Language.ML]: ['രോഗം', 'കീടം', 'ഇല', 'അസുഖം'],
    [Language.KN]: ['ರೋಗ', 'ಕೀಟ', 'ಎಲೆ', 'ಸಮಸ್ಯೆ'],
    [Language.MR]: ['रोग', 'कीड', 'आजार', 'पान']
  },
  SOIL: {
    [Language.EN]: ['soil', 'earth', 'land', 'dirt', 'test', 'report'],
    [Language.HI]: ['मिट्टी', 'मृदा', 'जमीन', 'रिपोर्ट'],
    [Language.TA]: ['மண்', 'நிலம்', 'அறிக்கை'],
    [Language.TE]: ['మట్టి', 'నేల', 'భూమి', 'రిపోర్ట్'],
    [Language.ML]: ['മണ്ണ്', 'നിലം', 'റിപ്പോർട്ട്'],
    [Language.KN]: ['ಮಣ್ಣು', 'ಭೂಮಿ', 'ವರದಿ'],
    [Language.MR]: ['माती', 'मृदा', 'जमीन', 'अहवाल']
  },
  WEATHER: {
    [Language.EN]: ['weather', 'rain', 'temperature', 'sun', 'forecast'],
    [Language.HI]: ['मौसम', 'बारिश', 'वर्षा', 'धूप', 'तापमान'],
    [Language.TA]: ['வானிலை', 'மழை', 'வெயில்'],
    [Language.TE]: ['వాతావరణం', 'వర్షం', 'ఎండ'],
    [Language.ML]: ['കാലാവസ്ഥ', 'മഴ', 'വെയിൽ'],
    [Language.KN]: ['ಹವಾಮಾನ', 'ಮಳೆ', 'ಬಿಸಿಲು'],
    [Language.MR]: ['हवामान', 'पाऊस', 'ऊन']
  },
  MARKET: {
    [Language.EN]: ['market', 'price', 'rate', 'sell', 'cost', 'mandi'],
    [Language.HI]: ['बाजार', 'भाव', 'कीमत', 'बेचना', 'मंडी', 'रेट'],
    [Language.TA]: ['சந்தை', 'விலை', 'விற்க'],
    [Language.TE]: ['మార్కెట్', 'ధర', 'అమ్మకం'],
    [Language.ML]: ['വിപണി', 'വില', 'വിൽക്കുക'],
    [Language.KN]: ['ಮಾರುಕಟ್ಟೆ', 'ಬೆಲೆ', 'ದರ'],
    [Language.MR]: ['बाजार', 'भाव', 'किंमत']
  },
  CROP_GROWTH: {
    [Language.EN]: ['growth', 'status', 'progress', 'stage', 'my crop', 'journey', 'record'],
    [Language.HI]: ['विकास', 'स्थिति', 'प्रगति', 'चरण', 'मेरी फसल', 'रिकॉर्ड'],
    [Language.TA]: ['வளர்ச்சி', 'நிலை', 'என் பயிர்', 'பதிவு'],
    [Language.TE]: ['పెరుగుదల', 'స్థితి', 'నా పంట', 'రికార్డు'],
    [Language.ML]: ['വളർച്ച', 'അവസ്ഥ', 'എന്റെ കൃഷി', 'റെക്കോർഡ്'],
    [Language.KN]: ['ಬೆಳವಣಿಗೆ', 'ಸ್ಥಿತಿ', 'ನನ್ನ ಬೆಳೆ', 'ದಾಖಲೆ'],
    [Language.MR]: ['वाढ', 'स्थिती', 'माझे पीक', 'रेकॉर्ड']
  },
  RECOMMENDATION: {
    [Language.EN]: ['best crop', 'suggest', 'recommend', 'what to grow'],
    [Language.HI]: ['सबसे अच्छी फसल', 'सुझाव', 'क्या उगाएं'],
    [Language.TA]: ['சிறந்த பயிர்', 'பரிந்துரை'],
    [Language.TE]: ['మంచి పంట', 'సలహా'],
    [Language.ML]: ['നല്ല വിള', 'നിർദ്ദേശം'],
    [Language.KN]: ['ಉತ್ತಮ ಬೆಳೆ', 'ಸಲಹೆ'],
    [Language.MR]: ['चांगले पीक', 'सल्ला']
  },
  COMMUNITY: {
    [Language.EN]: ['community', 'others', 'village', 'nearby'],
    [Language.HI]: ['समुदाय', 'गाँव', 'आसपास'],
    [Language.TA]: ['சமூகம்', 'கிராமம்'],
    [Language.TE]: ['కమ్యూనిటీ', 'గ్రామం'],
    [Language.ML]: ['കമ്മ്യൂണിറ്റി', 'ഗ്രാമം'],
    [Language.KN]: ['ಸಮುದಾಯ', 'ಗ್ರಾಮ'],
    [Language.MR]: ['समुदाय', 'गाव']
  },
  HOME: {
    [Language.EN]: ['home', 'dashboard', 'main', 'back'],
    [Language.HI]: ['होम', 'डैशबोर्ड', 'वापस'],
    [Language.TA]: ['முகப்பு', 'திரும்ப'],
    [Language.TE]: ['హోమ్', 'వెనుకకు'],
    [Language.ML]: ['ഹോം', 'തിരികെ'],
    [Language.KN]: ['ಮುಖಪುಟ', 'ಹಿಂದೆ'],
    [Language.MR]: ['होम', 'मागे']
  },
  SUSTAINABLE: {
    [Language.EN]: ['sustainable', 'organic', 'nature', 'green', 'future', 'tips'],
    [Language.HI]: ['टिकाऊ', 'जैविक', 'प्राकृतिक', 'हरा', 'भविष्य'],
    [Language.TA]: ['இயற்கை', 'பசுமை', 'எதிர்காலம்'],
    [Language.TE]: ['సేంద్రీయ', 'ప్రకృతి', 'ఆకుపచ్చ'],
    [Language.ML]: ['ജൈവ', 'പ്രകൃതി', 'ഹരിത'],
    [Language.KN]: ['ಸಾವಯವ', 'ನೈಸರ್ಗಿಕ', 'ಹಸಿರು'],
    [Language.MR]: ['सेंद्रिय', 'नैसर्गिक', 'हिरवा']
  },
  PROFILE: {
    [Language.EN]: ['profile', 'account', 'me', 'user'],
    [Language.HI]: ['प्रोफाइल', 'खाता', 'मैं', 'उपयोगकर्ता'],
    [Language.TA]: ['சுயவிவரம்', 'கணக்கு'],
    [Language.TE]: ['ప్రొఫైల్', 'ఖాతా'],
    [Language.ML]: ['പ്രൊഫൈൽ', 'അക്കൗണ്ട്'],
    [Language.KN]: ['ಪ್ರೊಫೈಲ್', 'ಖಾತೆ'],
    [Language.MR]: ['प्रोफाइल', 'खाते']
  },
  UNKNOWN: {
    [Language.EN]: [], [Language.HI]: [], [Language.TA]: [], [Language.TE]: [], [Language.ML]: [], [Language.KN]: [], [Language.MR]: []
  }
};

const RESPONSES: Record<string, Record<Language, string>> = {
  NAV_DISEASE: {
    [Language.EN]: "Opening Disease Detection. Please scan your leaf.",
    [Language.HI]: "रोग पहचान खोल रहा हूँ। कृपया पत्ती स्कैन करें।",
    [Language.TA]: "நோய் கண்டறிதல் திறக்கப்படுகிறது. இலையை ஸ்கேன் செய்யவும்.",
    [Language.TE]: "వ్యాధి నిర్ధారణ తెరవబడుతోంది. దయచేసి ఆకును స్కాన్ చేయండి.",
    [Language.ML]: "രോഗനിർണയം തുറക്കുന്നു. ഇല സ്കാൻ ചെയ്യുക.",
    [Language.KN]: "ರೋಗ ಪತ್ತೆ ತೆರೆಯಲಾಗುತ್ತಿದೆ. ದಯವಿಟ್ಟು ಎಲೆಯನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.",
    [Language.MR]: "रोग निदान उघडत आहे. कृपया पान स्कॅन करा."
  },
  NAV_SOIL: {
    [Language.EN]: "Opening Soil Health Analysis.",
    [Language.HI]: "मृदा स्वास्थ्य विश्लेषण खोल रहा हूँ।",
    [Language.TA]: "மண் வள ஆய்வு திறக்கப்படுகிறது.",
    [Language.TE]: "నేల ఆరోగ్య విశ్లేషణ తెరవబడుతోంది.",
    [Language.ML]: "മണ്ണ് പരിശോധന തുറക്കുന്നു.",
    [Language.KN]: "ಮಣ್ಣಿನ ಆರೋಗ್ಯ ವಿಶ್ಲೇಷಣೆ ತೆರೆಯಲಾಗುತ್ತಿದೆ.",
    [Language.MR]: "मृदा आरोग्य विश्लेषण उघडत आहे."
  },
  NAV_WEATHER: {
    [Language.EN]: "Checking weather forecast and alerts.",
    [Language.HI]: "मौसम पूर्वानुमान और चेतावनी की जाँच कर रहा हूँ।",
    [Language.TA]: "வானிலை முன்னறிவிப்பு மற்றும் எச்சரிக்கைகளை சரிபார்க்கிறது.",
    [Language.TE]: "వాతావరణ సూచన మరియు హెచ్చరికలను తనిఖీ చేస్తోంది.",
    [Language.ML]: "കാലാവസ്ഥാ പ്രവചനവും മുന്നറിയിപ്പുകളും പരിശോധിക്കുന്നു.",
    [Language.KN]: "ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ಮತ್ತು ಎಚ್ಚರಿಕೆಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ.",
    [Language.MR]: "हवामान अंदाज आणि इशारे तपासत आहे."
  },
  NAV_MARKET: {
    [Language.EN]: "Opening Market Prices.",
    [Language.HI]: "बाजार भाव खोल रहा हूँ।",
    [Language.TA]: "சந்தை விலைகள் திறக்கப்படுகிறது.",
    [Language.TE]: "మార్కెట్ ధరలు తెరవబడుతున్నాయి.",
    [Language.ML]: "വിപണി വിലകൾ തുറക്കുന്നു.",
    [Language.KN]: "ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳನ್ನು ತೆರೆಯಲಾಗುತ್ತಿದೆ.",
    [Language.MR]: "बाजारभाव उघडत आहे."
  },
  NAV_GROWTH: {
    [Language.EN]: "Opening your Crop Journey page.",
    [Language.HI]: "आपकी फसल यात्रा पृष्ठ खोल रहा हूँ।",
    [Language.TA]: "உங்கள் பயிர் பயணப் பக்கத்தைத் திறக்கிறது.",
    [Language.TE]: "మీ పంట ప్రయాణ పేజీని తెరుస్తోంది.",
    [Language.ML]: "നിങ്ങളുടെ വിള യാത്ര പേജ് തുറക്കുന്നു.",
    [Language.KN]: "ನಿಮ್ಮ ಬೆಳೆ ಪ್ರಯಾಣ ಪುಟವನ್ನು ತೆರೆಯಲಾಗುತ್ತಿದೆ.",
    [Language.MR]: "तुमचे पीक प्रवास पृष्ठ उघडत आहे."
  },
  NAV_TOPCROP: {
    [Language.EN]: "Finding the best crop for you.",
    [Language.HI]: "आपके लिए सबसे अच्छी फसल ढूंढ रहा हूँ।",
    [Language.TA]: "உங்களுக்கான சிறந்த பயிரைக் கண்டறிகிறது.",
    [Language.TE]: "మీకు ఉత్తమమైన పంటను కనుగొంటోంది.",
    [Language.ML]: "നിങ്ങൾക്ക് അനുയോജ്യമായ വിള കണ്ടെത്തുന്നു.",
    [Language.KN]: "ನಿಮಗೆ ಉತ್ತಮ ಬೆಳೆಯನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ.",
    [Language.MR]: "तुमच्यासाठी सर्वोत्तम पीक शोधत आहे."
  },
  NAV_COMMUNITY: {
    [Language.EN]: "Opening community reports.",
    [Language.HI]: "सामुदायिक रिपोर्ट खोल रहा हूँ।",
    [Language.TA]: "சமூக அறிக்கைகளைத் திறக்கிறது.",
    [Language.TE]: "కమ్యూనిటీ నివేదికలను తెరుస్తోంది.",
    [Language.ML]: "കമ്മ്യൂണിറ്റി റിപ്പോർട്ടുകൾ തുറക്കുന്നു.",
    [Language.KN]: "ಸಮುದಾಯ ವರದಿಗಳನ್ನು ತೆರೆಯಲಾಗುತ್ತಿದೆ.",
    [Language.MR]: "समुदाय अहवाल उघडत आहे."
  },
  NAV_HOME: {
    [Language.EN]: "Going to Home Screen.",
    [Language.HI]: "होम स्क्रीन पर जा रहा हूँ।",
    [Language.TA]: "முகப்புத் திரைக்குச் செல்கிறது.",
    [Language.TE]: "హోమ్ స్క్రీన్‌కి వెళుతోంది.",
    [Language.ML]: "ഹോം സ്ക്രീനിലേക്ക് പോകുന്നു.",
    [Language.KN]: "ಮುಖಪುಟಕ್ಕೆ ಹೋಗಲಾಗುತ್ತಿದೆ.",
    [Language.MR]: "होम स्क्रीनवर जात आहे."
  },
  NAV_SUSTAINABLE: {
    [Language.EN]: "Opening Sustainable Farming tips.",
    [Language.HI]: "टिकाऊ खेती के सुझाव खोल रहा हूँ।",
    [Language.TA]: "நிலையான விவசாயக் குறிப்புகளைத் திறக்கிறது.",
    [Language.TE]: "సుస్థిర వ్యవసాయ చిట్కాలను తెరుస్తోంది.",
    [Language.ML]: "സുസ്ഥിര കൃഷി നിർദ്ദേശങ്ങൾ തുറക്കുന്നു.",
    [Language.KN]: "ಸುಸ್ಥಿರ ಕೃಷಿ ಸಲಹೆಗಳನ್ನು ತೆರೆಯಲಾಗುತ್ತಿದೆ.",
    [Language.MR]: "शाश्वत शेती टिप्स उघडत आहे."
  },
  NAV_PROFILE: {
    [Language.EN]: "Opening your Profile.",
    [Language.HI]: "आपकी प्रोफाइल खोल रहा हूँ।",
    [Language.TA]: "உங்கள் சுயவிவரத்தைத் திறக்கிறது.",
    [Language.TE]: "మీ ప్రొఫైల్‌ను తెరుస్తోంది.",
    [Language.ML]: "നിങ്ങളുടെ പ്രൊഫൈൽ തുറക്കുന്നു.",
    [Language.KN]: "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ತೆರೆಯಲಾಗುತ್ತಿದೆ.",
    [Language.MR]: "तुमचे प्रोफाइल उघडत आहे."
  },
  UNKNOWN: {
    [Language.EN]: "I didn't understand. Try saying 'Disease', 'Weather', or 'Market'.",
    [Language.HI]: "मैं समझ नहीं पाया। 'बीमारी', 'मौसम', या 'बाजार' बोलने का प्रयास करें।",
    [Language.TA]: "எனக்கு புரியவில்லை. 'நோய்', 'வானிலை' அல்லது 'சந்தை' என்று சொல்லவும்.",
    [Language.TE]: "నాకు అర్థం కాలేదు. 'వ్యాధి', 'వాతావరణం' లేదా 'మార్కెట్' అని చెప్పడానికి ప్రయత్నించండి.",
    [Language.ML]: "എനിക്ക് മനസ്സിലായില്ല. 'രോഗം', 'കാലാവസ്ഥ', അല്ലെങ്കിൽ 'വിപണി' എന്ന് പറയാൻ ശ്രമിക്കുക.",
    [Language.KN]: "ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. 'ರೋಗ', 'ಹವಾಮಾನ' ಅಥವಾ 'ಮಾರುಕಟ್ಟೆ' ಎಂದು ಹೇಳಲು ಪ್ರಯತ್ನಿಸಿ.",
    [Language.MR]: "मला समजले नाही. 'रोग', 'हवामान' किंवा 'बाजार' म्हणण्याचा प्रयत्न करा."
  }
};

export const intentService = {
  processIntent(text: string, language: Language): IntentResult {
    const lowerText = text.toLowerCase();
    
    // Check against all keywords for the selected language
    for (const intentKey of Object.keys(KEYWORDS)) {
      const intent = intentKey as Intent;
      if (intent === 'UNKNOWN') continue;

      const words = KEYWORDS[intent][language];
      if (words.some(word => lowerText.includes(word.toLowerCase()))) {
        
        // Map Intent to View and Response
        let targetView = '';
        let replyKey = '';

        switch(intent) {
          case 'DISEASE': targetView = 'disease'; replyKey = 'NAV_DISEASE'; break;
          case 'SOIL': targetView = 'soil'; replyKey = 'NAV_SOIL'; break;
          case 'WEATHER': targetView = 'weather'; replyKey = 'NAV_WEATHER'; break;
          case 'MARKET': targetView = 'market'; replyKey = 'NAV_MARKET'; break;
          case 'CROP_GROWTH': targetView = 'journey'; replyKey = 'NAV_GROWTH'; break;
          case 'RECOMMENDATION': targetView = 'topcrop'; replyKey = 'NAV_TOPCROP'; break;
          case 'COMMUNITY': targetView = 'community'; replyKey = 'NAV_COMMUNITY'; break;
          case 'HOME': targetView = 'home'; replyKey = 'NAV_HOME'; break;
          case 'SUSTAINABLE': targetView = 'sustainable'; replyKey = 'NAV_SUSTAINABLE'; break;
          case 'PROFILE': targetView = 'profile'; replyKey = 'NAV_PROFILE'; break;
        }

        return { intent, replyKey, targetView };
      }
    }

    return { intent: 'UNKNOWN', replyKey: 'UNKNOWN' };
  },

  getResponse(key: string, language: Language): string {
    return RESPONSES[key]?.[language] || RESPONSES['UNKNOWN'][language];
  }
};