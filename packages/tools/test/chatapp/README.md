# Chat App - Test Application

This is a basic Next.js chat application created for testing the Supermemory packages and tools. It demonstrates how to integrate Supermemory with a simple chat interface.

## Features

- **Real-time Chat Interface**: Clean, modern chat UI with message bubbles
- **Supermemory Integration**: Uses Supermemory tools for enhanced AI conversations
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode Support**: Automatic theme switching based on system preferences
- **Loading States**: Visual feedback during AI processing
- **Error Handling**: Graceful error handling for API failures

## Tech Stack

- **Next.js 16**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling
- **AI SDK**: OpenAI integration for chat functionality
- **Supermemory**: Memory management and retrieval

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set up Environment Variables**:
   Create a `.env.local` file with your API keys:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   SUPERMEMORY_API_KEY=your_supermemory_api_key_here
   ```

3. **Run the Development Server**:
   ```bash
   npm run dev
   ```

4. **Open in Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

- Type a message in the input field and press Enter or click Send
- The AI will respond using Supermemory for context-aware conversations
- Messages are displayed in a chat bubble format
- Loading indicator shows when the AI is processing

## Testing Supermemory Features

This app is specifically designed to test:
- Memory storage and retrieval
- Context-aware conversations
- Package integration
- API functionality
- UI/UX patterns

## Development

This is a test application and should not be used in production. It's designed for:
- Testing Supermemory package functionality
- Demonstrating integration patterns
- UI/UX experimentation
- Development and debugging

## File Structure

```
app/
├── api/chat/route.ts    # API endpoint for chat functionality
├── globals.css          # Global styles and Tailwind imports
├── layout.tsx           # Root layout with fonts and metadata
└── page.tsx            # Main chat interface component
```
