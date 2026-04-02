export interface Message {
  id string;
  role 'user'  'assistant'  'system';
  content string;
  timestamp number;
}

export interface Chat {
  id string;
  title string;
  createdAt number;
  updatedAt number;
  messages Message[];
}

export interface ChatState {
  chats Chat[];
  activeChatId string  null;
  isLoading boolean;
  error string  null;
  isStreaming boolean;
}