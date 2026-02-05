import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FunctionCallingConfigMode,
  FunctionDeclaration,
  GenerateContentParameters,
  GoogleGenAI,
} from '@google/genai';
import { AiSummary } from '@plum/shared-interfaces';
import { AiSummaryManagerService } from '../redis/repository-manager/index.js';

const MAX_RETRIES = 3;
const PROMPT = `Analyze every segment of the provided lecture data to create a structured summary and tags.

[Data Format Guide]
The input data follows this custom structure:
- **Header**: [Spk: SpeakerName | Base: UnixTimestamp]
  - 'Base' is the absolute starting time (in seconds) for the segments below it.
- **Body**: Start-End:Text
  - 'Start' and 'End' are relative offsets (in seconds) from the 'Base' timestamp.
  - Example: If Base is 1000 and segment is 10-20, the absolute time is 1010 to 1020.

[Instruction]
- **No Content Omission**: Ensure that all technical topics discussed are reflected.
- **Lecture Context**: Focus on the instructor's technical explanations and workflow.
- **Tone**: Use a polite and educational Korean tone.
- **Timestamp Calculation**: **CRITICAL!** Convert all relative times into **absolute Unix timestamps** for the 'timelines' field using the (Base + Offset) formula.
- **Noise Handling**: STT may contain errors or repetitive filler words. Focus on meaningful content.

[Output Fields (Korean)]
1. 'summary': Comprehensive overview.
2. 'tags': 3-5 technical keywords.
3. 'timelines': { startedAt: number, endedAt: number, content: string }[] (using absolute timestamps).

[Lecture Data]`;

@Injectable()
export class SummarizeService {
  private readonly logger = new Logger(SummarizeService.name);
  private readonly client: GoogleGenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiSummaryManagerService: AiSummaryManagerService,
  ) {
    const apiKey = configService.get<string>('LLM_WORKER_KEY');

    if (!apiKey) {
      this.logger.error('LLM_WORKER_KEY가 설정되지 않았습니다.');
      throw new InternalServerErrorException('AI 서비스 설정 오류');
    }

    this.client = new GoogleGenAI({ apiKey });
  }

  private getModelConfig(structuredData: string): GenerateContentParameters {
    const saveSummaryDeclaration: FunctionDeclaration = {
      name: 'saveAiSummary',
      parametersJsonSchema: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description:
              'Comprehensive 3-5 sentence summary of the entire lecture/meeting context.',
          },
          tags: {
            type: 'array',
            description:
              '3-5 essential keywords or hashtags representing the lecture topic in Korean.',
            items: { type: 'string' },
          },
          timelines: {
            type: 'array',
            description: 'List of major topics discussed, organized by time segments.',
            items: {
              type: 'object',
              properties: {
                startedAt: {
                  type: 'number',
                  description: 'Start Unix timestamp of the topic segment.',
                },
                endedAt: {
                  type: 'number',
                  description: 'End Unix timestamp of the topic segment.',
                },
                content: {
                  type: 'string',
                  description: 'Brief summary of discussions within this specific timeframe.',
                },
              },
              required: ['startedAt', 'endedAt', 'content'],
            },
          },
        },
        required: ['summary', 'timelines'],
      },
    };

    return {
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${PROMPT}\n${structuredData}`,
            },
          ],
        },
      ],
      config: {
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.ANY,
            allowedFunctionNames: ['saveAiSummary'],
          },
        },
        tools: [{ functionDeclarations: [saveSummaryDeclaration] }],
      },
    };
  }

  async summarizeRoom(roomId: string, chatLog: string, retryCount = 0) {
    const status = await this.aiSummaryManagerService.getSummaryStatus(roomId);
    if (retryCount === 0 && status !== 'YET') {
      this.logger.log('요약이 진행중이거나 완료되었습니다.');
      return;
    }

    try {
      await this.aiSummaryManagerService.setSummaryStatus(roomId, 'PROCESSING');
      const modelConfig = this.getModelConfig(chatLog);

      const response = await this.client.models.generateContent(modelConfig);
      const functionCall = response.functionCalls?.[0];
      if (!functionCall) {
        throw new Error('AI 응답 형식이 올바르지 않습니다.');
      }

      const result = functionCall.args as unknown as AiSummary;

      await this.aiSummaryManagerService.setSummaryStatus(roomId, 'COMPLETED');
      await this.aiSummaryManagerService.saveAiSummary(roomId, result);
      this.logger.log(`✅ [${roomId}] 요약 저장 완료: ${result.summary.substring(0, 10)}`);
    } catch (error) {
      const errorString = JSON.stringify(error);
      const isQuotaError =
        errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED');

      if (isQuotaError && retryCount < MAX_RETRIES) {
        const delay = 30 * 1000;
        this.logger.warn(
          `⚠️ 쿼터 초과. ${delay / 1000}초 후 재시도합니다... (${retryCount + 1}/${MAX_RETRIES})`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return await this.summarizeRoom(roomId, chatLog, retryCount + 1);
      }
      await this.aiSummaryManagerService.setSummaryStatus(`room:${roomId}:status`, 'FAILED');
      this.logger.error(`❌ 요약 중 오류 발생: ${error.message}`);
    }
  }
}
