import { z } from 'zod';
import { type DataStreamWriter, smoothStream, streamText, tool } from 'ai';
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

      let draftContent = '';
      const { fullStream } = streamText({
        model: myProvider.languageModel('artifact-model'),
        system: getInformationPrompt,
        experimental_transform: smoothStream({ chunking: 'word' }),
        prompt: `Retrieve exact raw data from knowledge base to answer: "${question}". Plain text, minimal length, no markdown formatting or conversation.`,
      });

      for await (const delta of fullStream) {
        const { type } = delta;

        if (type === 'text-delta') {
          const { textDelta } = delta;

          draftContent += textDelta;

          dataStream.writeData({
            type: 'information-delta',
            content: textDelta,
          });
        }
      }

      dataStream.writeData({ type: 'finish', content: '' });

      return {
        content: draftContent,
        status: 'idle',
      };
    },
  });
