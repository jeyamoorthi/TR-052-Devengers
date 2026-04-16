import { SoilData, WeatherData, CropRecommendation, Language } from '../types';

export const cropService = {
  getTopCrop(soil: SoilData, weather: WeatherData): CropRecommendation {
    // Rule Engine Logic
    // Inputs: Soil Texture, pH, Weather (Temp, Rain/Humidity implied)
    
    const isHot = weather.temp > 28;
    const isWet = weather.condition.includes('Rain') || weather.humidity > 70;
    
    // 1. RICE (Paddy)
    // Needs: Clay/Loam, Water (Wet), Heat
    if ((soil.texture === 'Clay' || soil.texture === 'Loamy') && isWet && isHot) {
        return {
            cropName: {
                [Language.EN]: 'Rice (Paddy)',
                [Language.HI]: 'चावल (धान)',
                [Language.TA]: 'அரிசி (நெல்)',
                [Language.TE]: 'బియ్యం (వరి)',
                [Language.ML]: 'അരി (നെല്ല്)',
                [Language.KN]: 'ಅಕ್ಕಿ (ಭತ್ತ)',
                [Language.MR]: 'तांदूळ (भात)'
            },
            suitabilityScore: 95,
            image: 'https://images.unsplash.com/photo-1536630562529-795cb710b1a0?auto=format&fit=crop&q=80&w=400',
            reasons: {
                [Language.EN]: ['Clay soil retains water well.', 'High humidity favors growth.', 'Warm temperature is ideal.'],
                [Language.HI]: ['चिकनी मिट्टी पानी को अच्छे से रोकती है।', 'अधिक नमी विकास में सहायक है।', 'गर्म तापमान आदर्श है।'],
                [Language.TA]: ['களிமண் தண்ணீரை நன்கு தேக்கி வைக்கும்.', 'அதிக ஈரப்பதம் வளர்ச்சியை ஆதரிக்கிறது.', 'வெப்பமான வெப்பநிலை சிறந்தது.'],
                [Language.TE]: ['బంకమట్టి నీటిని బాగా నిల్వ ఉంచుతుంది.', 'అధిక తేమ పెరుగుదలకు అనుకూలం.', 'వెచ్చని ఉష్ణోగ్రత అనువైనది.'],
                [Language.ML]: ['കളിമണ്ണ് വെള്ളം നന്നായി പിടിച്ചുനിർത്തുന്നു.', 'ഉയർന്ന ഈർപ്പം വളർച്ചയെ സഹായിക്കുന്നു.', 'ചൂടുള്ള താപനില അനുയോജ്യമാണ്.'],
                [Language.KN]: ['ಜೇಡಿಮಣ್ಣು ನೀರನ್ನು ಚೆನ್ನಾಗಿ ಹಿಡಿದಿಟ್ಟುಕೊಳ್ಳುತ್ತದೆ.', 'ಹೆಚ್ಚಿನ ಆರ್ದ್ರತೆ ಬೆಳವಣಿಗೆಗೆ ಸಹಕಾರಿ.', 'ಬೆಚ್ಚಗಿನ ತಾಪಮಾನ ಸೂಕ್ತವಾಗಿದೆ.'],
                [Language.MR]: ['चिकनमाती पाणी चांगले धरून ठेवते.', 'जास्त आर्द्रता वाढीस पोषक आहे.', 'उबदार तापमान आदर्श आहे.']
            }
        };
    }

    // 2. MILLET (Bajra/Jowar)
    // Needs: Sandy/Loam, Drier conditions, Heat tolerant
    if (soil.texture === 'Sandy' && !isWet) {
        return {
            cropName: {
                [Language.EN]: 'Pearl Millet (Bajra)',
                [Language.HI]: 'बाजरा',
                [Language.TA]: 'கம்பு',
                [Language.TE]: 'సజ్జలు',
                [Language.ML]: 'ബജ്റ',
                [Language.KN]: 'ಸಜ್ಜೆ',
                [Language.MR]: 'बाजरी'
            },
            suitabilityScore: 90,
            image: 'https://images.unsplash.com/photo-1627920769837-7756f8745564?auto=format&fit=crop&q=80&w=400',
            reasons: {
                [Language.EN]: ['Sandy soil drains well.', 'Tolerant to low rainfall.', 'Good for hot weather.'],
                [Language.HI]: ['रेतीली मिट्टी से पानी जल्दी निकल जाता है।', 'कम वर्षा में भी उग सकता है।', 'गर्म मौसम के लिए अच्छा है।'],
                [Language.TA]: ['மணல் மண் நன்கு வடிகிறது.', 'குறைந்த மழையைத் தாங்கும்.', 'வெப்பமான வானிலைக்கு நல்லது.'],
                [Language.TE]: ['ఇసుక నేల బాగా నీరు iంకిపోతుంది.', 'తక్కువ వర్షపాతాన్ని తట్టుకుంటుంది.', 'వేడి వాతావరణానికి మంచిది.'],
                [Language.ML]: ['മണൽ മണ്ണ് നന്നായി വറ്റുന്നു.', 'കുറഞ്ഞ മഴയെ അതിജീവിക്കുന്നു.', 'ചൂടുള്ള കാലാവസ്ഥയ്ക്ക് നല്ലതാണ്.'],
                [Language.KN]: ['ಮರಳು ಮಣ್ಣು ಚೆನ್ನಾಗಿ ಬರಿದಾಗುತ್ತದೆ.', 'ಕಡಿಮೆ ಮಳೆಯನ್ನು ಸಹಿಸಿಕೊಳ್ಳುತ್ತದೆ.', 'ಬಿಸಿ ವಾತావರಣಕ್ಕೆ ಒಳ್ಳೆಯದು.'],
                [Language.MR]: ['वालुकामय जमिनीतून पाण्याचा निचरा चांगला होतो.', 'कमी पाऊस सहन करू शकते.', 'उष्ण हवामानासाठी चांगले.']
            }
        };
    }

    // 3. WHEAT
    // Needs: Loam, Cool/Moderate temp (simulated via else), not too wet
    if (soil.texture === 'Loamy' && !isHot) {
         return {
            cropName: {
                [Language.EN]: 'Wheat',
                [Language.HI]: 'गेहूँ',
                [Language.TA]: 'கோதுமை',
                [Language.TE]: 'గోధుమ',
                [Language.ML]: 'ഗോതമ്പ്',
                [Language.KN]: 'ಗೋಧಿ',
                [Language.MR]: 'गहू'
            },
            suitabilityScore: 88,
            image: 'https://images.unsplash.com/photo-1574943320219-55ed48256f3b?auto=format&fit=crop&q=80&w=400',
            reasons: {
                [Language.EN]: ['Loamy soil offers good balance.', 'Moderate temperature prevents stress.', 'Soil pH is optimal.'],
                [Language.HI]: ['दोमट मिट्टी अच्छा संतुलन प्रदान करती है।', 'मध्यम तापमान तनाव से बचाता है।', 'मिट्टी का pH अनुकूल है।'],
                [Language.TA]: ['வண்டல் மண் நல்ல சமநிலையை வழங்குகிறது.', 'மிதமான வெப்பநிலை அழுத்தத்தைத் தடுக்கிறது.', 'மண் pH உகந்தது.'],
                [Language.TE]: ['ఒండ్రు మట్టి మంచి సమతుల్యతను ఇస్తుంది.', 'మితమైన ఉష్ణోగ్రత ఒత్తిడిని నివారిస్తుంది.', 'నేల pH అనుకూలంగా ఉంది.'],
                [Language.ML]: ['എക്കൽ മണ്ണ് നല്ല സന്തുലിതാവസ്ഥ നൽകുന്നു.', 'മിതമായ താപനില സമ്മർദ്ദം തടയുന്നു.', 'മണ്ണിന്റെ pH അനുയോജ്യമാണ്.'],
                [Language.KN]: ['ಮೆಕ್ಕಲು ಮಣ್ಣು ಉತ್ತಮ ಸಮತೋಲನವನ್ನು ನೀಡುತ್ತದೆ.', 'ಮಧ್ಯಮ ತಾಪಮಾನವು ಒತ್ತಡವನ್ನು ತಡೆಯುತ್ತದೆ.', 'ಮಣ್ಣಿನ pH ಸೂಕ್ತವಾಗಿದೆ.'],
                [Language.MR]: ['पोयटा माती चांगला समतोल राखते.', 'मध्यम तापमान तणाव टाळते.', 'मातीचा pH इष्टतम आहे.']
            }
        };
    }

    // Default: MAIZE (Corn) - versatile
    return {
        cropName: {
            [Language.EN]: 'Maize (Corn)',
            [Language.HI]: 'मक्का',
            [Language.TA]: 'மக்காச்சோளம்',
            [Language.TE]: 'మొక్కజొన్న',
            [Language.ML]: 'ചോളം',
            [Language.KN]: 'ಮೆಕ್ಕೆಜೋಳ',
            [Language.MR]: 'मका'
        },
        suitabilityScore: 85,
        image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=400',
        reasons: {
            [Language.EN]: ['Versatile for your soil type.', 'Good market value.', 'Moderate water requirement.'],
            [Language.HI]: ['आपकी मिट्टी के प्रकार के लिए बहुमुखी।', 'अच्छा बाजार मूल्य।', 'मध्यम पानी की आवश्यकता।'],
            [Language.TA]: ['உங்கள் மண் வகைக்கு ஏற்றது.', 'நல்ல சந்தை மதிப்பு.', 'மிதமான நீர் தேவை.'],
            [Language.TE]: ['మీ నేల రకానికి అనుకూలమైనది.', 'మంచి మార్కెట్ విలువ.', 'మితమైన నీటి అవసరం.'],
            [Language.ML]: ['നിങ്ങളുടെ മണ്ണ type-ന് അനുയോജ്യമാണ്.', 'നല്ല വിപണി മൂല്യം.', 'മിതമായ വെള്ളം മതി.'],
            [Language.KN]: ['ನಿಮ್ಮ ಮಣ್ಣಿನ ಪ್ರಕಾರಕ್ಕೆ ಬಹುಮುಖವಾಗಿದೆ.', 'ಉತ್ತಮ ಮಾರುಕಟ್ಟೆ ಮೌಲ್ಯ.', 'ಮಧ್ಯಮ ನೀರಿನ ಅಗತ್ಯವಿದೆ.'],
            [Language.MR]: ['तुमच्या मातीच्या प्रकारासाठी अष्टपैलू.', 'चांगले बाजार मूल्य.', 'मध्यम पाण्याची आवश्यकता.']
        }
    };
  }
};