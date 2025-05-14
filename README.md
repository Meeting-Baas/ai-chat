<p align="center"><a href="https://discord.com/invite/dsvFgDTr6c"><img height="60px" src="https://user-images.githubusercontent.com/31022056/158916278-4504b838-7ecb-4ab9-a900-7dc002aade78.png" alt="Join our Discord!"></a></p>

# Baas Chat

An Open-Source AI Chatbot w/ MeetingBaas Integrated - Fork of [Vercel's AI Chatbot](https://github.com/techwithanirudh/ai-chatbot)

## Features

- [MeetingBaas](https://meetingbaas.com)
  - Unified API for integrating with Google Meet, Zoom, and Microsoft Teams meetings
  - Automated recording, transcription, and LLM summaries through simple API endpoints
- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports OpenAI (default), Anthropic, xAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Centralised authentication app integration](https://github.com/Meeting-Baas/better-auth-nextjs-starter)
  - Simple and secure authentication. Built upon [better-auth](https://www.better-auth.com)
  - Support for several providers like Google, Microsoft, GitHub, GitLab and Zoom.

## Migrating from previous auth system

If you're upgrading from a previous version using Auth.js:

1. Update your environment variables according to the new .env.example file
2. Since userId is now an integer, **the current tables would be truncated, and data would be lost**
3. Set `DISABLE_AUTH=true` for local development if needed
4. For production, ensure the auth app is deployed and configured first

## Upgrades

This enhanced version of the Chat SDK template includes several key upgrades to improve authentication, UX, and functionality:

- Auth System Integration
  - Fully integrated authentication using [`better-auth`](https://www.better-auth.com)
  - Support for multiple providers
  - Single Sign On
  - Optionally disable auth for local development (useful when authentication app is on a different domain)
- Redesigned Login & Register Pages
  - Modern, user-friendly layouts with improved UX and input validation
- Home Page Makeover
  - Cleaner interface and layout for the chatbot landing page
- Web Search Integration
  - Responses enriched via **OpenAI's Responses API**, adding contextual and real-time info


## Model Providers

This template ships with [OpenAI](https://openai.com) `gpt-4o` as the default chat model. However, with the [AI SDK](https://sdk.vercel.ai/docs), you can switch LLM providers to [xAI](https://x.ai), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://sdk.vercel.ai/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftechwithanirudh%2Fai-chatbot&env=AUTH_SECRET&envDescription=Generate%20a%20random%20secret%20to%20use%20for%20authentication&envLink=https%3A%2F%2Fgenerate-secret.vercel.app%2F32&project-name=my-awesome-chatbot&repository-name=my-awesome-chatbot&demo-title=AI%20Chatbot&demo-description=An%20Open-Source%20AI%20Chatbot%20Template%20Built%20With%20Next.js%20and%20the%20AI%20SDK%20by%20Vercel&demo-url=https%3A%2F%2Fchat.techwithanirudh.com&products=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22grok%22%2C%22integrationSlug%22%3A%22xai%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22api-key%22%2C%22integrationSlug%22%3A%22groq%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22neon%22%2C%22integrationSlug%22%3A%22neon%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run the AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000/).
