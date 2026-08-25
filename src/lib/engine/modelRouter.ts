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
  | 'agentic_chat'      // Real estate conversation with tool calling & negotiation
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
          primaryModel: 'llama-3.1-8b-instant',
          fallbackModel: 'gpt-4o-mini',
          temperature: 0.1,
          maxTokens: 250
        };

      case 'extraction':
        return {
          primaryModel: 'llama-3.1-8b-instant',
          fallbackModel: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          maxTokens: 500
        };

      case 'briefing':
      case 'reverse_matching':
      case 'summarization':
        return {
          primaryModel: 'llama-3.3-70b-versatile',
          fallbackModel: 'gpt-4o-mini',
          temperature: 0.2,
          maxTokens: 1000
        };

      case 'agentic_chat':
      default:
        return {
          primaryModel: 'llama-3.3-70b-versatile',
          fallbackModel: 'gpt-4o-mini',
          temperature: 0.25,
          maxTokens: 1200
        };
    }
  }

  /**
   * Estimates cost (USD) for a given token usage and model
   */
  static estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    let inputPricePerMillion = 0.59;
    let outputPricePerMillion = 0.79;

    if (model.includes('8b')) {
      inputPricePerMillion = 0.05;
      outputPricePerMillion = 0.08;
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
