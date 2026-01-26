import { LLMMessage, LLMCompletionOptions, LLMResponse } from '../../types';

export interface ILLMProvider {
  readonly providerName: string;

  complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<LLMResponse>;

  completeWithJson<T>(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<T>;
}
