import OpenAI from 'openai';
import { env } from '../../config/env';
import { LLM_DEFAULTS } from '../../config/constants';
import { LLMMessage, LLMCompletionOptions, LLMResponse } from '../../types';
import { ILLMProvider } from './provider.interface';
import { LLMError } from '../../utils/errors';
import { withRetry } from '../../utils/retry';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('OpenAIProvider');

// Models that don't support temperature parameter
const NO_TEMPERATURE_MODELS = ['gpt-5-mini', 'gpt-5-nano', 'gpt-5.2', 'gpt-5.1'];

export class OpenAIProvider implements ILLMProvider {
  readonly providerName = 'openai';
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  private supportsTemperature(model: string): boolean {
    return !NO_TEMPERATURE_MODELS.some(m => model.startsWith(m));
  }

  async complete(messages: LLMMessage[], options: LLMCompletionOptions = {}): Promise<LLMResponse> {
    const {
      model = LLM_DEFAULTS.OPENAI_MODEL,
      maxTokens = LLM_DEFAULTS.MAX_TOKENS,
      temperature = LLM_DEFAULTS.TEMPERATURE,
    } = options;

    logger.debug({ model, messageCount: messages.length }, 'Sending completion request');

    try {
      const requestParams: any = {
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_completion_tokens: maxTokens,
      };

      // Only add temperature for models that support it
      if (this.supportsTemperature(model)) {
        requestParams.temperature = temperature;
      }

      const response = await withRetry(
        () => this.client.chat.completions.create(requestParams),
        'OpenAI completion'
      );

      const content = response.choices[0]?.message?.content || '';

      logger.debug(
        {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
        },
        'Completion received'
      );

      return {
        content,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: message }, 'OpenAI completion error');
      throw new LLMError('openai', message);
    }
  }

  async completeWithJson<T>(messages: LLMMessage[], options: LLMCompletionOptions = {}): Promise<T> {
    const {
      model = LLM_DEFAULTS.OPENAI_MODEL,
      maxTokens = LLM_DEFAULTS.MAX_TOKENS,
      temperature = LLM_DEFAULTS.TEMPERATURE,
    } = options;

    logger.debug({ model, messageCount: messages.length }, 'Sending JSON completion request');

    try {
      const requestParams: any = {
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_completion_tokens: maxTokens,
        response_format: { type: 'json_object' },
      };

      // Only add temperature for models that support it
      if (this.supportsTemperature(model)) {
        requestParams.temperature = temperature;
      }

      const response = await withRetry(
        () => this.client.chat.completions.create(requestParams),
        'OpenAI JSON completion'
      );

      const content = response.choices[0]?.message?.content || '{}';

      logger.debug({ contentLength: content.length, contentPreview: content.slice(0, 200) }, 'JSON response received');

      try {
        const parsed = JSON.parse(content) as T;
        logger.debug({ parsedKeys: Object.keys(parsed as object || {}) }, 'JSON parsed successfully');
        return parsed;
      } catch (parseError) {
        logger.error({ content: content.slice(0, 500), error: parseError }, 'Failed to parse JSON response');
        throw new LLMError('openai', 'Failed to parse JSON response');
      }
    } catch (error) {
      if (error instanceof LLMError) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: message }, 'OpenAI JSON completion error');
      throw new LLMError('openai', message);
    }
  }
}
