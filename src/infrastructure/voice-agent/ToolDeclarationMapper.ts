/**
 * ToolDeclarationMapper — Mapea declaraciones de tools agnósticas a formato específico de cada proveedor
 * 
 * Convierte ToolDeclaration (interfaz del dominio) al formato requerido por cada proveedor de IA.
 * Centraliza la lógica de transformación para cumplir DRY.
 */

import type { ToolDeclaration } from '@/domain/ports/IVoiceProvider';
import type { OpenAIToolDeclaration, OpenAIParameterSchema } from './types';

export class ToolDeclarationMapper {
  /**
   * Convierte una declaración agnóstica al formato OpenAI Function Calling
   */
  static toOpenAI(tool: ToolDeclaration): OpenAIToolDeclaration {
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
  static fromOpenAI(tool: OpenAIToolDeclaration): ToolDeclaration {
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
  static allToOpenAI(tools: ToolDeclaration[]): OpenAIToolDeclaration[] {
    return tools.map((tool) => ToolDeclarationMapper.toOpenAI(tool));
  }

  /**
   * Convierte múltiples declaraciones OpenAI al formato agnóstico
   */
  static allFromOpenAI(tools: OpenAIToolDeclaration[]): ToolDeclaration[] {
    return tools.map((tool) => ToolDeclarationMapper.fromOpenAI(tool));
  }

  // --- Stubs para proveedores futuros ---

  /**
   * Convierte una declaración agnóstica al formato Gemini Function Declaration
   * Gemini requiere tipos en MAYÚSCULA (STRING, NUMBER, BOOLEAN, ARRAY, OBJECT)
   * @see https://ai.google.dev/gemini-api/docs/function-calling
   */
  static toGemini(tool: ToolDeclaration): Record<string, unknown> {
    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'OBJECT',
        properties: ToolDeclarationMapper.convertPropertiesToGemini(tool.parameters.properties),
        required: tool.parameters.required,
      },
    };
  }

  /**
   * Convierte recursivamente las propiedades de parámetros al formato Gemini
   * OpenAI usa minúsculas (string, number), Gemini usa MAYÚSCULAS (STRING, NUMBER)
   */
  private static convertPropertiesToGemini(
    properties: Record<string, unknown>
  ): Record<string, unknown> {
    const geminiProperties: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value !== 'object' || value === null) {
        geminiProperties[key] = value;
        continue;
      }

      const prop = value as Record<string, unknown>;
      const geminiProp: Record<string, unknown> = { ...prop };

      // Convertir tipo a mayúscula
      if (typeof prop.type === 'string') {
        geminiProp.type = prop.type.toUpperCase();
      }

      // Recursión para propiedades anidadas (arrays, objects)
      if (prop.items && typeof prop.items === 'object') {
        const items = prop.items as Record<string, unknown>;
        geminiProp.items = {
          ...items,
          type: typeof items.type === 'string' ? items.type.toUpperCase() : items.type,
        };
        if (items.properties) {
          const updatedItems = geminiProp.items as Record<string, unknown>;
          geminiProp.items = {
            ...updatedItems,
            properties: ToolDeclarationMapper.convertPropertiesToGemini(
              items.properties as Record<string, unknown>
            ),
          };
        }
      }

      if (prop.properties) {
        geminiProp.properties = ToolDeclarationMapper.convertPropertiesToGemini(
          prop.properties as Record<string, unknown>
        );
      }

      geminiProperties[key] = geminiProp;
    }

    return geminiProperties;
  }

  /**
   * Convierte una declaración agnóstica al formato Claude Tool Use
   * @see https://docs.anthropic.com/en/docs/build-with-claude/tool-use
   */
  static toClaude(tool: ToolDeclaration): Record<string, unknown> {
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
