# Requirements Document

## Introduction

The AI Financial Analyst feature adds an intelligent, context-aware assistant to the QuantEdge platform. This assistant leverages the Groq API (llama-3.3-70b-versatile model) to provide professional financial analysis, insights, and guidance based on the user's current financial model (merger analysis or DCF valuation). The feature presents as a slide-in chat panel that understands the active model's parameters and results, enabling natural conversation about deal structures, valuation assumptions, risks, and sensitivities.

## Glossary

- **AI_Analyst**: The conversational AI assistant powered by Groq API that provides financial analysis
- **Chat_Panel**: The slide-in drawer UI component from the right side of the screen
- **Context**: The current financial model state (type and data) passed to the AI for awareness
- **System_Prompt**: The role and instruction set sent to the AI based on context type
- **Streaming_Response**: Real-time token-by-token delivery of AI responses
- **Rate_Limiter**: Backend mechanism to restrict API usage per user
- **Prompt_Chip**: Pre-built clickable question suggestions in the chat interface
- **Context_Banner**: Visual display of key metrics from the current model
- **Chat_History**: Persisted record of previous conversations with context

## Requirements

### Requirement 1: Backend API Endpoint

**User Story:** As a backend system, I want to process AI chat requests with financial context, so that the AI can provide relevant analysis based on the user's current model.

#### Acceptance Criteria

1. WHEN a POST request is received at /api/v1/ai-chat, THE Backend SHALL validate the request body contains messages array and context object
2. WHEN the context type is "merger", THE Backend SHALL construct a system prompt including merger-specific parameters and results
3. WHEN the context type is "dcf", THE Backend SHALL construct a system prompt including DCF-specific parameters and results
4. WHEN the context type is "general", THE Backend SHALL construct a general financial analysis system prompt
5. WHEN the system prompt is constructed, THE Backend SHALL call the Groq API with model "llama-3.3-70b-versatile", max_tokens 600, and temperature 0.3
6. WHEN the Groq API responds, THE Backend SHALL stream the response tokens to the client in real-time
7. IF the Groq API call fails, THEN THE Backend SHALL return an appropriate error response with status code and message

### Requirement 2: Rate Limiting

**User Story:** As a system administrator, I want to limit API usage per user, so that costs remain controlled and service remains available to all users.

#### Acceptance Criteria

1. WHEN a user makes an AI chat request, THE Rate_Limiter SHALL check the user's request count for the current hour
2. IF the user has made fewer than 20 requests in the current hour, THEN THE Rate_Limiter SHALL allow the request and increment the counter
3. IF the user has made 20 or more requests in the current hour, THEN THE Rate_Limiter SHALL reject the request with a 429 status code
4. WHEN an hour boundary is crossed, THE Rate_Limiter SHALL reset the user's request counter

### Requirement 3: System Prompt Construction

**User Story:** As the AI system, I want context-specific instructions, so that I can provide relevant and professional financial analysis.

#### Acceptance Criteria

1. WHEN constructing a merger context prompt, THE Backend SHALL include deal parameters, A/D impact, pro-forma EPS, and synergies from context data
2. WHEN constructing a DCF context prompt, THE Backend SHALL include WACC, terminal growth rate, and intrinsic value from context data
3. WHEN constructing any system prompt, THE Backend SHALL include instructions to format numbers professionally, keep responses under 200 words, and never give investment advice
4. WHEN constructing any system prompt, THE Backend SHALL include the role description appropriate to the context type

### Requirement 4: Chat Panel UI Component

**User Story:** As a user, I want to access the AI analyst through a slide-in panel, so that I can get insights without leaving my current analysis.

#### Acceptance Criteria

1. WHEN the user clicks the floating AI button, THE Chat_Panel SHALL slide in from the right side of the screen
2. WHEN the Chat_Panel is open, THE Chat_Panel SHALL display at 380px width and 100vh height with fixed positioning
3. WHEN the Chat_Panel renders, THE Chat_Panel SHALL show a header with title, context badge, and close button
4. WHEN the Chat_Panel renders, THE Chat_Panel SHALL display a context banner showing key metrics from the current model
5. WHEN the user clicks the close button, THE Chat_Panel SHALL slide out and close

### Requirement 5: Message Display and Formatting

**User Story:** As a user, I want to see chat messages clearly formatted, so that I can easily read and understand the AI's analysis.

#### Acceptance Criteria

1. WHEN a user message is displayed, THE Chat_Panel SHALL show it right-aligned with accent-primary background and white text
2. WHEN an AI message is displayed, THE Chat_Panel SHALL show it left-aligned with bg-elevated background and text-primary color
3. WHEN an AI message contains markdown, THE Chat_Panel SHALL render bold text, bullet lists, and numbered lists correctly
4. WHEN the messages area exceeds the visible height, THE Chat_Panel SHALL provide vertical scrolling
5. WHEN new messages are added, THE Chat_Panel SHALL auto-scroll to show the latest message

### Requirement 6: Streaming Response Display

**User Story:** As a user, I want to see AI responses appear in real-time, so that I know the system is working and can start reading immediately.

#### Acceptance Criteria

1. WHEN an AI response is streaming, THE Chat_Panel SHALL display a typing indicator with three animated dots
2. WHEN response tokens arrive from the backend, THE Chat_Panel SHALL append them character-by-character to the AI message bubble
3. WHEN the stream completes, THE Chat_Panel SHALL remove the typing indicator and finalize the message
4. IF the stream encounters an error, THEN THE Chat_Panel SHALL display "AI Analyst is temporarily unavailable. Please try again." in muted text

### Requirement 7: Message Input Interface

**User Story:** As a user, I want to type and send messages easily, so that I can ask questions about my financial model.

#### Acceptance Criteria

1. WHEN the input textarea is empty, THE Chat_Panel SHALL display it at minimum height
2. WHEN the user types multiple lines, THE Chat_Panel SHALL expand the textarea up to 4 lines maximum
3. WHEN the user presses Enter, THE Chat_Panel SHALL send the message and clear the input
4. WHEN the user presses Shift+Enter, THE Chat_Panel SHALL insert a newline without sending
5. WHEN a message is being sent, THE Chat_Panel SHALL disable the input until the response completes

### Requirement 8: Prompt Chip Suggestions

**User Story:** As a user, I want quick-access question suggestions, so that I can explore common analysis topics without typing.

#### Acceptance Criteria

1. WHEN the context type is "merger", THE Chat_Panel SHALL display prompt chips: "Explain the A/D result", "What synergies justify this deal?", "Key risks?", "Compare to market multiples"
2. WHEN the context type is "dcf", THE Chat_Panel SHALL display prompt chips: "Is my WACC reasonable?", "What drives intrinsic value here?", "Sensitivity analysis explanation", "Bull/bear case scenarios"
3. WHEN the user clicks a prompt chip, THE Chat_Panel SHALL populate the input textarea with that prompt text
4. WHEN the user clicks a prompt chip, THE Chat_Panel SHALL focus the input textarea for editing or immediate sending

### Requirement 9: Context Auto-Population and Initial Greeting

**User Story:** As a user, I want the AI to immediately understand my current model, so that I can start asking questions without explaining the context.

#### Acceptance Criteria

1. WHEN the Chat_Panel opens on the merger analysis page, THE Chat_Panel SHALL automatically pass current deal inputs and computed results as context
2. WHEN the Chat_Panel opens on the DCF page, THE Chat_Panel SHALL automatically pass current operational drivers and results as context
3. WHEN the Chat_Panel opens with context, THE AI_Analyst SHALL send an initial greeting message with a one-sentence observation about the current model
4. WHEN the context data changes while the panel is open, THE Chat_Panel SHALL update the context banner to reflect new values

### Requirement 10: Integration with Existing Pages

**User Story:** As a developer, I want the AI chat panel to integrate seamlessly with existing analysis pages, so that users have consistent access across the platform.

#### Acceptance Criteria

1. WHEN the merger-analysis.tsx page renders, THE Page SHALL display a floating AI button in the bottom-right corner
2. WHEN the dcf.tsx page renders, THE Page SHALL display a floating AI button in the bottom-right corner
3. WHEN the AI button is clicked on any page, THE Chat_Panel SHALL open with the appropriate context type
4. WHEN the Chat_Panel is integrated, THE Chat_Panel SHALL use the existing design system components and color palette
5. WHEN displaying financial numbers, THE Chat_Panel SHALL use DM Mono font for consistency

### Requirement 11: Chat History Persistence (Optional)

**User Story:** As a user, I want to review my previous conversations with the AI, so that I can reference past insights and analysis.

#### Acceptance Criteria

1. WHEN a conversation completes, THE Backend SHALL optionally save the conversation to ai_chat_history table with context_type and context_data
2. WHEN the user opens the History tab, THE Chat_Panel SHALL display past conversations grouped by date
3. WHEN the user clicks a historical conversation, THE Chat_Panel SHALL load and display that conversation's messages
4. WHEN displaying historical conversations, THE Chat_Panel SHALL show the context type and key metrics from that session

### Requirement 12: Error Handling and User Feedback

**User Story:** As a user, I want clear feedback when errors occur, so that I understand what went wrong and what to do next.

#### Acceptance Criteria

1. IF the backend returns a 429 rate limit error, THEN THE Chat_Panel SHALL display "You've reached the hourly limit of 20 requests. Please try again later."
2. IF the backend returns a 500 server error, THEN THE Chat_Panel SHALL display "AI Analyst is temporarily unavailable. Please try again."
3. IF the network request fails, THEN THE Chat_Panel SHALL display "Connection error. Please check your internet and try again."
4. WHEN an error message is displayed, THE Chat_Panel SHALL allow the user to retry the last message
5. WHEN the Groq API key is missing or invalid, THE Backend SHALL return a 503 error with message "AI service configuration error"
