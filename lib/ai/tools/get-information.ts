import { z } from 'zod';
import { type DataStreamWriter, streamText, tool } from 'ai';
import { myProvider } from '../providers';
import { getInformationPrompt } from '../prompts';

interface GetInformationProps {
  dataStream: DataStreamWriter;
}

export const getInformation = ({ dataStream }: GetInformationProps) =>
  tool({
    description: `Efficient Retrieval-Augmented Generation (RAG) tool using a Small Language Model (SLM) for precise information retrieval from a domain-specific knowledge base. Fully self-contained questions are required to provide accurate, concise, yet complete responses. Optimized for effective data extraction with clear and succinct explanations included.`,
    parameters: z.object({
      question: z
        .string()
        .describe(
          'Fully self-contained question including all necessary context for accurate retrieval and explanation from the knowledge base',
        ),
    }),
    execute: async ({ question }) => {
      dataStream.writeData({
        type: 'clear',
        content: '',
      });

      const { textStream } = streamText({
        model: myProvider.languageModel('artifact-model'),
        system: getInformationPrompt,
        prompt: `Retrieve exact raw data from knowledge base to answer: "${question}". Plain text, minimal length, no markdown formatting or conversation.`,
      });

      let fullText = '';

      for await (const textChunk of textStream) {
        fullText += textChunk;

        dataStream.writeData({
          type: 'information-delta',
          content: textChunk,
        });
      }

      dataStream.writeData({ type: 'finish', content: '' });

      return {
        question,
        content: fullText,
        status: 'idle',
      };
    },
  });
