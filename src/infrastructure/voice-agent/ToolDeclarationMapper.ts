/**
 * ToolDeclarationMapper — Mapea declaraciones de tools agnósticas a formato específico de cada proveedor
 * 
 * Convierte AIToolDeclaration (interfaz del dominio) al formato requerido por cada proveedor de IA.
 * Centraliza la lógica de transformación para cumplir DRY.
 */

import type { AIToolDeclaration } from '@/domain/ports/IAIRealtimeProvider';
import type { OpenAIToolDeclaration, OpenAIParameterSchema } from './types';

export class ToolDeclarationMapper {
  /**
   * Convierte una declaración agnóstica al formato OpenAI Function Calling
   */
  static toOpenAI(tool: AIToolDeclaration): OpenAIToolDeclaration {
    return {
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters.properties as Record<string, OpenAIParameterSchema>,
        required: tool.parameters.required,
      },
    };
  }

  /**
   * Convierte una declaración OpenAI al formato agnóstico
   * Útil para migrar tools existentes a la interfaz agnóstica
   */
  static fromOpenAI(tool: OpenAIToolDeclaration): AIToolDeclaration {
    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    };
  }

  /**
   * Convierte múltiples declaraciones agnósticas al formato OpenAI
   */
  static allToOpenAI(tools: AIToolDeclaration[]): OpenAIToolDeclaration[] {
    return tools.map((tool) => ToolDeclarationMapper.toOpenAI(tool));
  }

  /**
   * Convierte múltiples declaraciones OpenAI al formato agnóstico
   */
  static allFromOpenAI(tools: OpenAIToolDeclaration[]): AIToolDeclaration[] {
    return tools.map((tool) => ToolDeclarationMapper.fromOpenAI(tool));
  }

  // --- Stubs para proveedores futuros ---

  /**
   * Convierte una declaración agnóstica al formato Gemini Function Declaration
   * @see https://ai.google.dev/gemini-api/docs/function-calling
   */
  static toGemini(tool: AIToolDeclaration): Record<string, unknown> {
    // Gemini usa un formato similar pero con FunctionDeclaration wrapper
    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'OBJECT',
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    };
  }

  /**
   * Convierte una declaración agnóstica al formato Claude Tool Use
   * @see https://docs.anthropic.com/en/docs/build-with-claude/tool-use
   */
  static toClaude(tool: AIToolDeclaration): Record<string, unknown> {
    // Claude usa input_schema en lugar de parameters
    return {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    };
  }
}
