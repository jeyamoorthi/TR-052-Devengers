import { WeatherData, UserProfile, InputAdvisory, Scheme, Language } from '../types';
import { SCHEMES, UI_TEXT } from './knowledgeBase';

export const advisoryService = {
  /**
   * Generates rule-based advice for inputs (Fertilizer/Pesticide) based on weather.
   * Rules:
   * 1. Rain > 60% -> Danger (Fertilizer runoff)
   * 2. Wind > 20km/h -> Danger (Pesticide drift)
   * 3. Rain > 30% OR Wind > 15km/h -> Warning
   * 4. Else -> Safe
   */
  getInputAdvisory(weather: WeatherData, language: Language): InputAdvisory {
    const t = UI_TEXT[language];

    // Rule 1: High Rain Risk
    if (weather.precipProb > 60) {
      return {
        action: 'danger',
        icon: 'droplet',
        title: {
            [Language.EN]: t.dontSpray,
            [Language.HI]: t.dontSpray,
            [Language.TA]: t.dontSpray,
            [Language.TE]: t.dontSpray,
            [Language.ML]: t.dontSpray,
            [Language.KN]: t.dontSpray,
            [Language.MR]: t.dontSpray
        },
        message: {
            [Language.EN]: t.rainWarning,
            [Language.HI]: t.rainWarning,
            [Language.TA]: t.rainWarning,
            [Language.TE]: t.rainWarning,
            [Language.ML]: t.rainWarning,
            [Language.KN]: t.rainWarning,
            [Language.MR]: t.rainWarning
        }
      };
    }

    // Rule 2: High Wind Risk
    if (weather.windSpeed > 20) {
      return {
        action: 'danger',
        icon: 'wind',
        title: {
            [Language.EN]: t.dontSpray,
            [Language.HI]: t.dontSpray,
            [Language.TA]: t.dontSpray,
            [Language.TE]: t.dontSpray,
            [Language.ML]: t.dontSpray,
            [Language.KN]: t.dontSpray,
            [Language.MR]: t.dontSpray
        },
        message: {
            [Language.EN]: t.windWarning,
            [Language.HI]: t.windWarning,
            [Language.TA]: t.windWarning,
            [Language.TE]: t.windWarning,
            [Language.ML]: t.windWarning,
            [Language.KN]: t.windWarning,
            [Language.MR]: t.windWarning
        }
      };
    }

    // Rule 3: Safe
    return {
      action: 'safe',
      icon: 'check',
      title: {
          [Language.EN]: t.safeToSpray,
          [Language.HI]: t.safeToSpray,
          [Language.TA]: t.safeToSpray,
          [Language.TE]: t.safeToSpray,
          [Language.ML]: t.safeToSpray,
          [Language.KN]: t.safeToSpray,
          [Language.MR]: t.safeToSpray
      },
      message: {
          [Language.EN]: t.perfectDay,
          [Language.HI]: t.perfectDay,
          [Language.TA]: t.perfectDay,
          [Language.TE]: t.perfectDay,
          [Language.ML]: t.perfectDay,
          [Language.KN]: t.perfectDay,
          [Language.MR]: t.perfectDay
      }
    };
  },

  /**
   * Filters government schemes based on user profile.
   */
  getEligibleSchemes(user: UserProfile): Scheme[] {
    return SCHEMES.filter(scheme => scheme.eligibilityRule(user));
  }
};