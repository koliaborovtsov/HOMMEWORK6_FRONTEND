import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useChatStore } from '../../store/chatStore';
import { sendMessageToGigaChat } from '../../api/gigachat';
import { Message } from '../../types';
import './ChatWindow.css';

const ChatWindow: React.FC = () => {
  const { 
    chats, 
    activeChatId, 
    isLoading, 
    isStreaming,
    error,
    addMessage, 
    updateLastMessage,
    setLoading, 
    setError,
    setStreaming,
    generateChatTitle
  } = useChatStore();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const activeChat = chats.find(chat => chat.id === activeChatId);
  const messages = activeChat?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !activeChatId || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    addMessage(activeChatId, userMessage);
    setInput('');
    setLoading(true);
    setError(null);
    
    // Auto-generate title if this is the first message
    if (activeChat?.messages.length === 0) {
      generateChatTitle(activeChatId, input);
    }

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    
    addMessage(activeChatId, assistantMessage);
    
    try {
      const allMessages = [...(activeChat?.messages || []), userMessage];
      
      await sendMessageToGigaChat(allMessages, (fullContent) => {
        updateLastMessage(activeChatId, fullContent);
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  if (!activeChat) {
    return (
      <div className="chat-window empty">
        <div className="empty-state">
          <h2>Добро пожаловать в GigaChat</h2>
          <p>Создайте новый чат, чтобы начать общение</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h2>{activeChat.title}</h2>
      </div>
      
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <p>Задайте первый вопрос, чтобы начать диалог</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-avatar">
              {message.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              {message.role === 'assistant' ? (
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content || (isStreaming && message.id === messages[messages.length - 1]?.id ? '...' : '')}
                </ReactMarkdown>
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && !isStreaming && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-container">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Введите сообщение... (Shift+Enter для новой строки)"
          disabled={isLoading}
          rows={1}
        />
        <button 
          onClick={handleSendMessage} 
          disabled={isLoading || !input.trim()}
          className="send-button"
        >
          {isLoading ? '⏳' : '📤'}
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;