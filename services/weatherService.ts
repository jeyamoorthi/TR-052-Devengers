import { WeatherData, WeatherAlert, DailyWeather, Language } from '../types';
import { UI_TEXT } from './knowledgeBase';

// Deterministic random generator based on seed (lat+lng) to ensure consistent results for the "Demo"
function mulberry32(a: number) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

export const weatherService = {
  getWeather(lat: number, lng: number): WeatherData {
    // In a production app, fetch form OpenWeatherMap here.
    // For this robust demo, we use a deterministic rule engine based on location.
    
    const seed = lat + lng;
    const rand = mulberry32(Math.floor(seed * 1000));
    
    // Simulate realistic variation
    const temp = 20 + Math.floor(rand() * 15); // 20-35 C
    const humidity = 40 + Math.floor(rand() * 50); // 40-90%
    const isRainy = rand() > 0.6; // Slightly higher chance for demo purposes
    const windSpeed = Math.floor(rand() * 25); // 0-25 km/h
    const precipProb = isRainy ? 60 + Math.floor(rand() * 40) : Math.floor(rand() * 30); // % chance
    
    const condition = isRainy ? 'Rainy' : (windSpeed > 15 ? 'Windy' : (temp > 30 ? 'Sunny' : 'Cloudy'));
    
    const alerts: WeatherAlert[] = [];

    // Rule-based Alerts (Deterministic)
    if (humidity > 80 && temp > 25) {
      alerts.push({
        type: 'Disease',
        severity: 'High',
        message: {
          [Language.EN]: 'High humidity and heat detected. Risk of Fungal Blight is high.',
          [Language.HI]: 'अधिक नमी और गर्मी। फफूंद जनित रोगों का खतरा अधिक है।',
          [Language.TA]: 'அதிக ஈரப்பதம் மற்றும் வெப்பம். பூஞ்சை நோய் ஆபத்து அதிகம்.',
          [Language.TE]: 'అధిక తేమ మరియు వేడి. ఫంగల్ బ్లైట్ ప్రమాదం ఎక్కువగా ఉంది.',
          [Language.ML]: 'ഉയർന്ന ഈർപ്പവും ചൂടും. ഫംഗൽ രോഗസാധ്യത കൂടുതലാണ്.',
          [Language.KN]: 'ಹೆಚ್ಚಿನ ಆರ್ದ್ರತೆ ಮತ್ತು ಶಾಖ. ಶಿಲೀಂಧ್ರ ರೋಗದ ಅಪಾಯ ಹೆಚ್ಚು.',
          [Language.MR]: 'जास्त आर्द्रता आणि उष्णता. बुरशीजन्य रोगाचा धोका जास्त आहे.'
        },
        action: {
          [Language.EN]: 'Avoid overhead watering today.',
          [Language.HI]: 'आज ऊपर से पानी देने से बचें।',
          [Language.TA]: 'இன்று பயிரின் மேல் தண்ணீர் ஊற்றுவதைத் தவிர்க்கவும்.',
          [Language.TE]: 'ఈ రోజు ఓవర్‌హెడ్ నీరు త్రాగుట మానుకోండి.',
          [Language.ML]: 'ഇന്ന് ചെടികൾക്ക് മുകളിൽ വെള്ളം നനയ്ക്കുന്നത് ഒഴിവാക്കുക.',
          [Language.KN]: 'ಇಂದು ಮೇಲಿನಿಂದ ನೀರು ಹಾಕಬೇಡಿ.',
          [Language.MR]: 'आज वरून पाणी देणे टाळा.'
        }
      });
    }

    if (isRainy && rand() > 0.8) {
       alerts.push({
        type: 'Rain',
        severity: 'Medium',
        message: {
          [Language.EN]: 'Heavy rain expected in the next 24 hours.',
          [Language.HI]: 'अगले 24 घंटों में भारी बारिश की संभावना है।',
          [Language.TA]: 'அடுத்த 24 மணி நேரத்தில் கனமழை எதிர்பார்க்கப்படுகிறது.',
          [Language.TE]: 'రాబోయే 24 గంటల్లో భారీ వర్షాలు కురిసే అవకాశం ఉంది.',
          [Language.ML]: 'അടുത്ത 24 മണിക്കൂറിൽ കനത്ത മഴ പ്രതീക്ഷിക്കുന്നു.',
          [Language.KN]: 'ಮುಂದಿನ 24 ಗಂಟೆಗಳಲ್ಲಿ ಭಾರೀ ಮಳೆ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ.',
          [Language.MR]: 'येत्या २४ तासांत मुसळधार पावसाची शक्यता आहे.'
        },
        action: {
          [Language.EN]: 'Ensure drainage channels are clear.',
          [Language.HI]: 'सुनिश्चित करें कि जल निकासी नालियाँ साफ हैं।',
          [Language.TA]: 'வடிகால் வழிகள் தெளிவாக இருப்பதை உறுதி செய்யவும்.',
          [Language.TE]: 'డ్రైనేజీ కాలువలు శుభ్రంగా ఉన్నాయని నిర్ధారించుకోండి.',
          [Language.ML]: 'ഡ്രെയിനേജ് ചാനലുകൾ വ്യക്തമാണെന്ന് ഉറപ്പാക്കുക.',
          [Language.KN]: 'ಚರಂಡಿ ಕಾಲುವೆಗಳು ಸ್ವಚ್ಛವಾಗಿವೆಯೇ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.',
          [Language.MR]: 'पाण्याचा निचरा होणाऱ्या नाल्या साफ असल्याची खात्री करा.'
        }
       });
    }

    // Generate 7-Day Forecast/Context
    const forecast: DailyWeather[] = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    let totalRain = 0;
    
    // Generate previous 3 days, today, next 3 days
    for (let i = -3; i <= 3; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayName = days[d.getDay()];
        const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
        
        // Vary weather slightly based on seed + day index
        const dayRand = mulberry32(Math.floor(seed * 1000 + i));
        const dayTemp = temp + Math.floor((dayRand() * 6) - 3);
        const dayRainy = dayRand() > 0.6;
        const dayRainfall = dayRainy ? Math.floor(dayRand() * 20) : 0;
        
        let dayCond = dayRainy ? 'Rainy' : 'Sunny';
        if (!dayRainy && dayRand() > 0.5) dayCond = 'Cloudy';

        if (i === 0) { // Override today with main calculation
             forecast.push({ day: 'Today', date: dateStr, temp, condition, rainfall: isRainy ? 15 : 0 });
             totalRain += (isRainy ? 15 : 0);
        } else {
             forecast.push({ day: dayName, date: dateStr, temp: dayTemp, condition: dayCond, rainfall: dayRainfall });
             totalRain += dayRainfall;
        }
    }

    // Weekly Summary Logic
    let summaryKey = 'Normal';
    if (totalRain > 30) summaryKey = 'HighRain';
    if (temp > 35) summaryKey = 'HighHeat';

    const summaries: Record<string, { summary: Record<Language, string>, advice: Record<Language, string> }> = {
        'HighRain': {
            summary: {
                [Language.EN]: 'High rainfall this week. Soil moisture increased significantly.',
                [Language.HI]: 'इस सप्ताह भारी बारिश। मिट्टी की नमी काफी बढ़ गई।',
                [Language.TA]: 'இந்த வாரம் அதிக மழை. மண்ணின் ஈரப்பதம் கணிசமாக அதிகரித்தது.',
                [Language.TE]: 'ఈ వారం భారీ వర్షాలు. నేల తేమ గణనీయంగా పెరిగింది.',
                [Language.ML]: 'ഈ ആഴ്ച കനത്ത മഴ. മണ്ണിലെ ഈർപ്പം ഗണ്യമായി വർദ്ധിച്ചു.',
                [Language.KN]: 'ಈ ವಾರ ಹೆಚ್ಚು ಮಳೆ. ಮಣ್ಣಿನ ತೇವಾಂಶ ಗಮನಾರ್ಹವಾಗಿ ಹೆಚ್ಚಿದೆ.',
                [Language.MR]: 'या आठवड्यात जास्त पाऊस. जमिनीतील ओलावा लक्षणीय वाढला.'
            },
            advice: {
                [Language.EN]: 'Avoid spraying now. Check your crop for root rot symptoms.',
                [Language.HI]: 'अभी छिड़काव से बचें। अपनी फसल में जड़ सड़न के लक्षणों की जाँच करें।',
                [Language.TA]: 'இப்போது தெளிப்பதைத் தவிர்க்கவும். வேர் அழுகல் அறிகுறிகளை சரிபார்க்கவும்.',
                [Language.TE]: 'ఇప్పుడు పిచికారీ చేయడం మానుకోండి. వేరు తెగులు లక్షణాల కోసం పంటను తనిఖీ చేయండి.',
                [Language.ML]: 'ഇപ്പോൾ സ്പ്രേ ചെയ്യുന്നത് ഒഴിവാക്കുക. വേരുചീയൽ ലക്ഷണങ്ങൾ പരിശോധിക്കുക.',
                [Language.KN]: 'ಈಗ ಸಿಂಪಡಿಸುವುದನ್ನು ತಪ್ಪಿಸಿ. ಬೇರು ಕೊಳೆತ ರೋಗಲಕ್ಷಣಗಳಿಗಾಗಿ ಬೆಳೆ ಪರಿಶೀಲಿಸಿ.',
                [Language.MR]: 'आता फवारणी टाळा. पिकाच्या मुळकूज लक्षणांची तपासणी करा.'
            }
        },
        'HighHeat': {
            summary: {
                [Language.EN]: 'High temperatures this week. Crop heat stress likely.',
                [Language.HI]: 'इस सप्ताह उच्च तापमान। फसल पर गर्मी का तनाव संभव है।',
                [Language.TA]: 'இந்த வாரம் அதிக வெப்பநிலை. பயிர் வெப்ப அழுத்தம் ஏற்பட வாய்ப்புள்ளது.',
                [Language.TE]: 'ఈ వారం అధిక ఉష్ణోగ్రతలు. పంటకు వేడి ఒత్తిడి కలిగే అవకాశం ఉంది.',
                [Language.ML]: 'ഈ ആഴ്ച ഉയർന്ന താപനില. വിളയ്ക്ക് ചൂട് മൂലമുള്ള സമ്മർദ്ദം ഉണ്ടാകാൻ സാധ്യതയുണ്ട്.',
                [Language.KN]: 'ಈ ವಾರ ಹೆಚ್ಚಿನ ತಾಪಮಾನ. ಬೆಳೆ ಶಾಖದ ಒತ್ತಡಕ್ಕೆ ಒಳಗಾಗುವ ಸಾಧ್ಯತೆಯಿದೆ.',
                [Language.MR]: 'या आठवड्यात उच्च तापमान. पिकाला उष्णतेचा ताण येण्याची शक्यता आहे.'
            },
            advice: {
                [Language.EN]: 'Irrigate in the evening. Mulch soil to retain moisture.',
                [Language.HI]: 'शाम को सिंचाई करें। नमी बनाए रखने के लिए मिट्टी को ढँक दें।',
                [Language.TA]: 'மாலை நேரத்தில் நீர் பாய்ச்சவும். ஈரப்பதத்தைத் தக்கவைக்க மண்ணை மூடவும்.',
                [Language.TE]: 'సాయంత్రం నీరు పెట్టండి. తేమను నిలుపుకోవడానికి మల్చింగ్ చేయండి.',
                [Language.ML]: 'വൈകുന്നേരം നനയ്ക്കുക. ഈർപ്പം നിലനിർത്താൻ പുതയിടുക.',
                [Language.KN]: 'ಸಂಜೆ ನೀರು ಹಾಕಿ. ತೇವಾಂಶ ಉಳಿಸಿಕೊಳ್ಳಲು ಮಲ್ಚಿಂಗ್ ಮಾಡಿ.',
                [Language.MR]: 'संध्याकाळी पाणी द्या. ओलावा टिकवण्यासाठी आच्छादन करा.'
            }
        },
        'Normal': {
            summary: {
                [Language.EN]: 'Weather has been stable with moderate conditions.',
                [Language.HI]: 'मध्यम स्थितियों के साथ मौसम स्थिर रहा है।',
                [Language.TA]: 'மிதமான நிலைகளுடன் வானிலை நிலையாக உள்ளது.',
                [Language.TE]: 'మితమైన పరిస్థితులతో వాతావరణం నిలకడగా ఉంది.',
                [Language.ML]: 'കാലാവസ്ഥ മിതമായ രീതിയിൽ സ്ഥിരമാണ്.',
                [Language.KN]: 'ಹವಾಮಾನವು ಸಾಧಾರಣ ಸ್ಥಿತಿಯೊಂದಿಗೆ ಸ್ಥಿರವಾಗಿದೆ.',
                [Language.MR]: 'हवामान मध्यम स्थितीसह स्थिर आहे.'
            },
            advice: {
                [Language.EN]: 'Good conditions for field activities and monitoring.',
                [Language.HI]: 'खेत की गतिविधियों और निगरानी के लिए अच्छी स्थिति।',
                [Language.TA]: 'களப் பணிகள் மற்றும் கண்காணிப்புக்கு நல்ல நிலை.',
                [Language.TE]: 'క్షేత్ర పనులు మరియు పర్యవేక్షణకు మంచి పరిస్థితులు.',
                [Language.ML]: 'ഫീൽഡ് പ്രവർത്തനങ്ങൾക്കും നിരീക്ഷണത്തിനും നല്ല സാഹചര്യം.',
                [Language.KN]: 'ಕ್ಷೇತ್ರ ಚಟುವಟಿಕೆಗಳು ಮತ್ತು ಮೇಲ್ವಿಚಾರಣೆಗೆ ಉತ್ತಮ ಪರಿಸ್ಥಿತಿಗಳು.',
                [Language.MR]: 'शेतातील कामे आणि देखरेखीसाठी चांगली स्थिती.'
            }
        }
    };

    return { 
        temp, humidity, windSpeed, precipProb, condition, alerts,
        forecast,
        weeklySummary: summaries[summaryKey].summary,
        weeklyAdvice: summaries[summaryKey].advice
    };
  }
};