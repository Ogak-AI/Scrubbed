import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { useChat } from '../../hooks/useChat';
import { useWasteRequests } from '../../hooks/useWasteRequests';
import type { ChatConversation, WasteRequest } from '../../types';

interface ChatInterfaceProps {
  onClose: () => void;
  initialRequestId?: string;
  initialDumperId?: string;
  initialCollectorId?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  onClose, 
  initialRequestId, 
  initialDumperId, 
  initialCollectorId 
}) => {
  const { initializeChatForRequest, setActiveConversationById } = useChat();
  const { requests } = useWasteRequests();
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WasteRequest | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize chat for specific request if provided
  useEffect(() => {
    const initializeSpecificChat = async () => {
      if (initialRequestId && initialDumperId && initialCollectorId) {
        setLoading(true);
        try {
          const conversation = await initializeChatForRequest(
            initialRequestId, 
            initialDumperId, 
            initialCollectorId
          );
          
          const request = requests.find(r => r.id === initialRequestId);
          if (request) {
            setSelectedConversation(conversation);
            setSelectedRequest(request);
          }
        } catch (error) {
          console.error('Failed to initialize chat:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    initializeSpecificChat();
  }, [initialRequestId, initialDumperId, initialCollectorId, initializeChatForRequest, requests]);

  const handleSelectConversation = async (conversation: ChatConversation) => {
    setLoading(true);
    try {
      await setActiveConversationById(conversation.id);
      
      const request = requests.find(r => r.id === conversation.requestId);
      if (request) {
        setSelectedConversation(conversation);
        setSelectedRequest(request);
      }
    } catch (error) {
      console.error('Failed to select conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setSelectedRequest(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={selectedConversation ? handleBackToList : onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 mr-3 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <MessageSquare className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {selectedConversation ? 'Chat' : 'Messages'}
                </h1>
                <p className="text-sm text-gray-600">
                  {selectedConversation 
                    ? 'Discuss collection details' 
                    : 'Your conversations with collectors and customers'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {selectedConversation && selectedRequest ? (
          <div className="bg-white rounded-xl border border-gray-200 h-[calc(100vh-200px)]">
            <ChatWindow
              conversation={selectedConversation}
              request={selectedRequest}
              onClose={handleBackToList}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Your Conversations</h2>
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Stay connected with your matches</span>
              </div>
            </div>
            
            <ChatList onSelectConversation={handleSelectConversation} />
          </div>
        )}
      </div>
    </div>
  );
};