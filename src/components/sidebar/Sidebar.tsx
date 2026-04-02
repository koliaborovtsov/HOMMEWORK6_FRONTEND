import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useChatStore } from '../../store/chatStore';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const { chats, activeChatId, deleteChat, updateChat, createChat, setActiveChat } = useChatStore();
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  const handleNewChat = () => {
    const newChatId = createChat();
    navigate(`/chat/${newChatId}`);
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChat(chatId);
    navigate(`/chat/${chatId}`);
  };

  const handleDeleteChat = (chatId: string) => {
    deleteChat(chatId);
    if (paramId === chatId) {
      navigate('/');
    }
    setChatToDelete(null);
  };

  const handleEditChat = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  };

  const handleSaveEdit = (chatId: string) => {
    if (editingTitle.trim()) {
      updateChat(chatId, { title: editingTitle.trim() });
    }
    setEditingChatId(null);
    setEditingTitle('');
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesTitle = chat.title.toLowerCase().includes(query);
    const matchesLastMessage = chat.messages.length > 0 && 
      chat.messages[chat.messages.length - 1].content.toLowerCase().includes(query);
    return matchesTitle || matchesLastMessage;
  });

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>GigaChat</h1>
        <button onClick={handleNewChat} className="new-chat-btn">
          + Новый чат
        </button>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Поиск чатов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="chats-list">
        {filteredChats.length === 0 && (
          <div className="no-chats">
            <p>Нет чатов</p>
            <button onClick={handleNewChat} className="create-first-btn">
              Создать первый чат
            </button>
          </div>
        )}
        
        {filteredChats.map((chat) => (
          <div
            key={chat.id}
            className={`chat-item ${activeChatId === chat.id ? 'active' : ''}`}
          >
            {editingChatId === chat.id ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => handleSaveEdit(chat.id)}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(chat.id)}
                autoFocus
                className="edit-title-input"
              />
            ) : (
              <div className="chat-info" onClick={() => handleSelectChat(chat.id)}>
                <div className="chat-title">{chat.title}</div>
                <div className="chat-preview">
                  {chat.messages.length > 0 
                    ? chat.messages[chat.messages.length - 1].content.slice(0, 50)
                    : 'Новый диалог'}
                  {chat.messages.length > 0 && chat.messages[chat.messages.length - 1].content.length > 50 && '...'}
                </div>
                <div className="chat-date">
                  {new Date(chat.updatedAt).toLocaleDateString()}
                </div>
              </div>
            )}
            
            <div className="chat-actions">
              {editingChatId !== chat.id && (
                <>
                  <button
                    onClick={() => handleEditChat(chat.id, chat.title)}
                    className="edit-btn"
                    title="Редактировать"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setChatToDelete(chat.id)}
                    className="delete-btn"
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {chatToDelete && (
        <div className="modal-overlay" onClick={() => setChatToDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Подтверждение удаления</h3>
            <p>Вы уверены, что хотите удалить этот чат? Это действие нельзя отменить.</p>
            <div className="modal-buttons">
              <button onClick={() => setChatToDelete(null)} className="cancel-btn">
                Отмена
              </button>
              <button onClick={() => handleDeleteChat(chatToDelete)} className="confirm-btn">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;