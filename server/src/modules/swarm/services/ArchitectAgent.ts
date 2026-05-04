// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'openai';

export interface DataField {
  name: string;
  type: string;
  description?: string;
  required: boolean;
}

export interface DataSchema {
  name: string;
  fields: DataField[];
}

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requestBody?: any;
  responseBody?: any;
  description: string;
}

export interface ArchitectureBlueprint {
  title: string;
  description: string;
  schemas: DataSchema[];
  apis: ApiEndpoint[];
  technologies: string[];
  infrastructureRequirements: string[];
}

@Injectable()
export class ArchitectAgent {
  private readonly logger = new Logger(ArchitectAgent.name);
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analysiert Anforderungen und generiert ein technisches Blueprint.
   * @param requirements Die textuellen Anforderungen des Benutzers oder des Orchestrators.
   */
  async design(requirements: string): Promise<ArchitectureBlueprint> {
    this.logger.log('Starting architecture analysis...');

    const systemPrompt = `You are a Senior Software Architect Agent in a multi-agent swarm system. 
    Your task is to transform high-level requirements into a precise technical specification.
    Output must be a valid JSON object strictly following the ArchitectureBlueprint interface.
    Focus on scalability, RESTful principles, and type safety.`;

    const userPrompt = `Analyze these requirements and generate a technical blueprint:
    
    Requirements:
    "${requirements}"
    
    The JSON structure must be:
    {
      "title": "Short descriptive title",
      "description": "A technical summary of the system architecture",
      "schemas": [
        {
          "name": "EntityName",
          "fields": [
            { "name": "id", "type": "string", "description": "UUID", "required": true }
          ]
        }
      ],
      "apis": [
        {
          "path": "/api/v1/resource",
          "method": "POST",
          "description": "Description of the operation",
          "requestBody": {},
          "responseBody": {}
        }
      ],
      "technologies": ["List of recommended tools/languages"],
      "infrastructureRequirements": ["e.g. Redis, Postgres, Docker"]
    }`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('ArchitectAgent failed: Empty response from LLM');
      }

      const blueprint: ArchitectureBlueprint = JSON.parse(content);
      this.logger.log(`Architecture design for "${blueprint.title}" completed.`);
      
      return blueprint;
    } catch (error) {
      this.logger.error('Error during architecture design phase', error.stack);
      throw new Error(`ArchitectAgent Design Error: ${error.message}`);
    }
  }

  /**
   * Generiert ein spezifisches JSON-Schema für eine Entität.
   */
  async generateSchema(entityName: string, context: string): Promise<DataSchema> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      messages: [
        { 
          role: 'system', 
          content: 'Generate a JSON schema for the requested entity. Return ONLY JSON.' 
        },
        { 
          role: 'user', 
          content: `Entity: ${entityName}. Context: ${context}` 
        }
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content || '{}') as DataSchema;
  }
}