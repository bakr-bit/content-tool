import { env } from '../../config/env';
import { LLMProvider } from '../../types';
import { ILLMProvider } from './provider.interface';
import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';

const providers: Map<LLMProvider, ILLMProvider> = new Map();

export function getLLMProvider(provider?: LLMProvider): ILLMProvider {
  const selectedProvider = provider || env.DEFAULT_LLM_PROVIDER;

  if (providers.has(selectedProvider)) {
    return providers.get(selectedProvider)!;
  }

  let newProvider: ILLMProvider;

  switch (selectedProvider) {
    case 'openai':
      newProvider = new OpenAIProvider();
      break;
    case 'gemini':
      newProvider = new GeminiProvider();
      break;
    default:
      throw new Error(`Unknown LLM provider: ${selectedProvider}`);
  }

  providers.set(selectedProvider, newProvider);
  return newProvider;
}

export function getDefaultProvider(): ILLMProvider {
  return getLLMProvider(env.DEFAULT_LLM_PROVIDER);
}
