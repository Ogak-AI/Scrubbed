import React from 'react';
import { MessageSquare, User, Clock, ArrowRight } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import type { ChatConversation } from '../../types';

interface ChatListProps {
  onSelectConversation: (conversation: ChatConversation) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelectConversation }) => {
  const { user } = useAuth();
  const { conversations, loading, getUnreadCount } = useChat();

  const formatLastMessageTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getUnreadCountForConversation = (conversation: ChatConversation) => {
    if (!user) return 0;
    return user.userType === 'dumper' ? conversation.dumperUnreadCount : conversation.collectorUnreadCount;
  };

  const getOtherUserType = (conversation: ChatConversation) => {
    return user?.userType === 'dumper' ? 'Collector' : 'Customer';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h4>
        <p className="text-gray-600 text-sm">
          Start chatting when you {user?.userType === 'dumper' ? 'get matched with a collector' : 'accept a collection request'}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => {
        const unreadCount = getUnreadCountForConversation(conversation);
        const otherUserType = getOtherUserType(conversation);
        
        return (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation)}
            className="w-full p-4 text-left hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="relative">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 truncate">{otherUserType}</h4>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatLastMessageTime(conversation.lastMessageAt)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 truncate">
                    {conversation.lastMessage || 'No messages yet'}
                  </p>
                  
                  <div className="flex items-center mt-1">
                    <Clock className="h-3 w-3 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-500">Request #{conversation.requestId.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
              
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 ml-2" />
            </div>
          </button>
        );
      })}
    </div>
  );
};