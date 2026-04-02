import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';
import Sidebar from '../components/sidebar/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import './App.css';

const ChatRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { chats, setActiveChat } = useChatStore();

  useEffect(() => {
    if (id && chats.find(chat => chat.id === id)) {
      setActiveChat(id);
    } else if (chats.length > 0 && !id) {
      setActiveChat(chats[0].id);
    }
  }, [id, chats, setActiveChat]);

  return <ChatWindow />;
};

const AppRoutes: React.FC = () => {
  const { chats, setActiveChat } = useChatStore();

  useEffect(() => {
    // Restore last active chat on load
    const savedState = localStorage.getItem('gigachat-storage');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        const state = parsed.state;
        if (state?.activeChatId && state?.chats?.find((c: any) => c.id === state.activeChatId)) {
          setActiveChat(state.activeChatId);
        } else if (state?.chats?.[0]) {
          setActiveChat(state.chats[0].id);
        }
      } catch (e) {
        console.error('Failed to restore state:', e);
      }
    }
  }, [setActiveChat]);

  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ChatRoute />} />
            <Route path="/chat/:id" element={<ChatRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default AppRoutes;