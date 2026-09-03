/**
 * Model Router & Cost/Latency Optimizer
 * Inspired by Enterprise Assistant ModelRouter
 * 
 * Selects the optimal AI model based on task complexity, balancing latency, cost, and quality.
 */

import { AIModel } from './aiUtils';

export type TaskType = 
  | 'classification'    // Quick categorization (e.g. buyer, tenant, partner broker)
  | 'extraction'        // Extracting name, budget, bedrooms from text
  | 'junk_filter'       // Filtering spam/garbage
  | 'agentic_chat'      // Real estate conversation with tool calling & negotiation (Flagship Gemini 2.5)
  | 'deep_reasoning'    // Complex financing constraints, exchange calculations (DeepSeek R1 / V3)
  | 'briefing'          // Daily briefing generation for brokers
  | 'reverse_matching'  // Matching leads to newly registered properties
  | 'summarization';    // General summarization

export interface RouteConfig {
  primaryModel: AIModel;
  fallbackModel: AIModel;
  temperature: number;
  maxTokens?: number;
}

export class ModelRouter {
  /**
   * Returns optimal model configuration for a specific task
   */
  static getRoute(task: TaskType): RouteConfig {
    switch (task) {
      case 'classification':
      case 'junk_filter':
        return {
          primaryModel: 'gemini-2.5-flash',
          fallbackModel: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          maxTokens: 250
        };

      case 'extraction':
        return {
          primaryModel: 'gemini-2.5-flash',
          fallbackModel: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          maxTokens: 500
        };

      case 'deep_reasoning':
        return {
          primaryModel: 'deepseek-chat',
          fallbackModel: 'qwen-2.5-72b',
          temperature: 0.1,
          maxTokens: 1500
        };

      case 'briefing':
      case 'reverse_matching':
      case 'summarization':
        return {
          primaryModel: 'gemini-2.5-flash',
          fallbackModel: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          maxTokens: 1000
        };

      case 'agentic_chat':
      default:
        return {
          primaryModel: 'gemini-2.5-flash',
          fallbackModel: 'llama-3.3-70b-versatile',
          temperature: 0.25,
          maxTokens: 1200
        };
    }
  }

  /**
   * Estimates cost (USD) for a given token usage and model
   */
  static estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    let inputPricePerMillion = 0.075;
    let outputPricePerMillion = 0.30;

    if (model.includes('8b')) {
      inputPricePerMillion = 0.05;
      outputPricePerMillion = 0.08;
    } else if (model.includes('gemini-2.5-flash')) {
      inputPricePerMillion = 0.075;
      outputPricePerMillion = 0.30;
    } else if (model.includes('gemini-2.5-pro')) {
      inputPricePerMillion = 1.25;
      outputPricePerMillion = 5.00;
    } else if (model.includes('deepseek')) {
      inputPricePerMillion = 0.14;
      outputPricePerMillion = 0.28;
    } else if (model.includes('qwen')) {
      inputPricePerMillion = 0.35;
      outputPricePerMillion = 0.40;
    } else if (model.includes('70b')) {
      inputPricePerMillion = 0.59;
      outputPricePerMillion = 0.79;
    } else if (model.includes('gpt-4o-mini')) {
      inputPricePerMillion = 0.15;
      outputPricePerMillion = 0.60;
    }

    return ((inputTokens * inputPricePerMillion) + (outputTokens * outputPricePerMillion)) / 1_000_000;
  }
}
