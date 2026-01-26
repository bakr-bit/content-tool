import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { env } from '../../config/env';
import { LLM_DEFAULTS } from '../../config/constants';
import { LLMMessage, LLMCompletionOptions, LLMResponse } from '../../types';
import { ILLMProvider } from './provider.interface';
import { LLMError } from '../../utils/errors';
import { withRetry } from '../../utils/retry';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('GeminiProvider');

export class GeminiProvider implements ILLMProvider {
  readonly providerName = 'gemini';
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required for Gemini provider');
    }
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  private getModel(modelName: string = LLM_DEFAULTS.GEMINI_MODEL): GenerativeModel {
    return this.genAI.getGenerativeModel({ model: modelName });
  }

  private convertMessages(messages: LLMMessage[]): { role: string; parts: { text: string }[] }[] {
    const converted: { role: string; parts: { text: string }[] }[] = [];
    let systemPrompt = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += msg.content + '\n';
      } else {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        if (converted.length === 0 && systemPrompt && role === 'user') {
          converted.push({
            role: 'user',
            parts: [{ text: systemPrompt + '\n\n' + msg.content }],
          });
        } else {
          converted.push({
            role,
            parts: [{ text: msg.content }],
          });
        }
      }
    }

    return converted;
  }

  async complete(messages: LLMMessage[], options: LLMCompletionOptions = {}): Promise<LLMResponse> {
    const {
      model = LLM_DEFAULTS.GEMINI_MODEL,
      maxTokens = LLM_DEFAULTS.MAX_TOKENS,
      temperature = LLM_DEFAULTS.TEMPERATURE,
    } = options;

    logger.debug({ model, messageCount: messages.length }, 'Sending completion request');

    try {
      const genModel = this.getModel(model);
      const convertedMessages = this.convertMessages(messages);

      const chat = genModel.startChat({
        history: convertedMessages.slice(0, -1),
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      });

      const lastMessage = convertedMessages[convertedMessages.length - 1];

      const response = await withRetry(
        () => chat.sendMessage(lastMessage.parts[0].text),
        'Gemini completion'
      );

      const content = response.response.text();

      logger.debug('Completion received');

      return {
        content,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: message }, 'Gemini completion error');
      throw new LLMError('gemini', message);
    }
  }

  async completeWithJson<T>(messages: LLMMessage[], options: LLMCompletionOptions = {}): Promise<T> {
    const jsonInstructionMessage: LLMMessage = {
      role: 'user',
      content: messages[messages.length - 1].content + '\n\nIMPORTANT: Respond with valid JSON only. No markdown, no code blocks, just raw JSON.',
    };

    const modifiedMessages = [...messages.slice(0, -1), jsonInstructionMessage];

    const response = await this.complete(modifiedMessages, options);

    let content = response.content.trim();

    // Handle markdown code blocks if present
    if (content.startsWith('```json')) {
      content = content.slice(7);
    } else if (content.startsWith('```')) {
      content = content.slice(3);
    }
    if (content.endsWith('```')) {
      content = content.slice(0, -3);
    }
    content = content.trim();

    try {
      return JSON.parse(content) as T;
    } catch {
      logger.error({ content: content.slice(0, 200) }, 'Failed to parse Gemini JSON response');
      throw new LLMError('gemini', 'Failed to parse JSON response');
    }
  }
}
