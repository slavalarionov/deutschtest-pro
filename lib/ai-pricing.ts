/**
 * Тарифы внешних AI-провайдеров.
 * Цены актуальны на апрель 2026. При изменении тарифов — править здесь.
 *
 * Все цены в USD.
 */

export const PRICING = {
  anthropic: {
    // Реальная строка модели, которую использует lib/claude.ts.
    'claude-sonnet-4-20250514': {
      inputPerMTok: 3.0,    // $3 за миллион input-токенов
      outputPerMTok: 15.0,  // $15 за миллион output-токенов
    },
  },
  elevenlabs: {
    // multilingual_v2: ~$0.30 за 1000 символов на платном тарифе.
    // Это приблизительная оценка — реальная цена зависит от подписки.
    'eleven_multilingual_v2': {
      perKChar: 0.30,
    },
  },
  openai: {
    // Whisper: $0.006 за минуту аудио
    'whisper-1': {
      perMinute: 0.006,
    },
  },
} as const;

/**
 * Подсчёт стоимости вызова Anthropic Claude.
 */
export function calculateAnthropicCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING.anthropic[model as keyof typeof PRICING.anthropic];
  if (!pricing) {
    console.warn(`[ai-pricing] Unknown Anthropic model: ${model}, cost = 0`);
    return 0;
  }
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMTok;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMTok;
  return inputCost + outputCost;
}

/**
 * Подсчёт стоимости вызова ElevenLabs TTS.
 */
export function calculateElevenLabsTtsCost(
  model: string,
  characters: number
): number {
  const pricing = PRICING.elevenlabs[model as keyof typeof PRICING.elevenlabs];
  if (!pricing) {
    console.warn(`[ai-pricing] Unknown ElevenLabs TTS model: ${model}, cost = 0`);
    return 0;
  }
  return (characters / 1000) * pricing.perKChar;
}

/**
 * Подсчёт стоимости вызова OpenAI Whisper.
 */
export function calculateWhisperCost(
  model: string,
  audioSeconds: number
): number {
  const pricing = PRICING.openai[model as keyof typeof PRICING.openai];
  if (!pricing) {
    console.warn(`[ai-pricing] Unknown OpenAI model: ${model}, cost = 0`);
    return 0;
  }
  const minutes = audioSeconds / 60;
  return minutes * pricing.perMinute;
}
