import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, createOptimizedRealtimeSubscription, getCachedData, setCachedData, clearCache } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { ChatMessage, ChatConversation } from '../types';

export const useChat = (requestId?: string) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Cache keys
  const conversationsCacheKey = useMemo(() => 
    user ? `chat_conversations_${user.id}` : null, 
    [user?.id]
  );

  const messagesCacheKey = useMemo(() => 
    activeConversation ? `chat_messages_${activeConversation.id}` : null, 
    [activeConversation?.id]
  );

  // CRITICAL FIX: Prevent infinite loops
  const fetchConversations = useCallback(async () => {
    if (!user || !conversationsCacheKey || loading) return;

    // Check cache first
    const cached = getCachedData<ChatConversation[]>(conversationsCacheKey);
    if (cached && initialized) {
      setConversations(cached);
      return;
    }

    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('chat_conversations')
        .select('*')
        .or(`dumper_id.eq.${user.id},collector_id.eq.${user.id}`)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false, nullsLast: true })
        .limit(20); // Add limit for performance

      if (fetchError) throw fetchError;

      const formattedConversations: ChatConversation[] = (data || []).map(conv => ({
        id: conv.id,
        requestId: conv.request_id,
        dumperId: conv.dumper_id,
        collectorId: conv.collector_id,
        lastMessage: conv.last_message,
        lastMessageAt: conv.last_message_at,
        dumperUnreadCount: conv.dumper_unread_count,
        collectorUnreadCount: conv.collector_unread_count,
        isActive: conv.is_active,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
      }));

      setConversations(formattedConversations);
      setCachedData(conversationsCacheKey, formattedConversations, 120000); // 2 minutes cache
      setInitialized(true);

    } catch (err: unknown) {
      console.error('Error fetching conversations:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(errorMessage);
    }
  }, [user, conversationsCacheKey, loading, initialized]);

  // CRITICAL FIX: Prevent infinite loops
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!messagesCacheKey || loading) return;

    // Check cache first
    const cached = getCachedData<ChatMessage[]>(messagesCacheKey);
    if (cached && initialized) {
      setMessages(cached);
      return;
    }

    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100); // Add limit for performance

      if (fetchError) throw fetchError;

      const formattedMessages: ChatMessage[] = (data || []).map(msg => ({
        id: msg.id,
        requestId: msg.request_id,
        senderId: msg.sender_id,
        senderType: msg.sender_type,
        message: msg.message,
        messageType: msg.message_type,
        metadata: msg.metadata as any,
        isRead: msg.is_read,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at,
      }));

      setMessages(formattedMessages);
      setCachedData(messagesCacheKey, formattedMessages, 60000); // 1 minute cache

      // Mark messages as read
      if (user && formattedMessages.length > 0) {
        await markMessagesAsRead(conversationId);
      }

    } catch (err: unknown) {
      console.error('Error fetching messages:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
      setError(errorMessage);
    }
  }, [messagesCacheKey, user, loading, initialized]);

  // Create or get conversation for a request
  const getOrCreateConversation = useCallback(async (requestId: string, dumperId: string, collectorId: string) => {
    try {
      // First, try to find existing conversation
      const { data: existingConv, error: findError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('request_id', requestId)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (existingConv) {
        const conversation: ChatConversation = {
          id: existingConv.id,
          requestId: existingConv.request_id,
          dumperId: existingConv.dumper_id,
          collectorId: existingConv.collector_id,
          lastMessage: existingConv.last_message,
          lastMessageAt: existingConv.last_message_at,
          dumperUnreadCount: existingConv.dumper_unread_count,
          collectorUnreadCount: existingConv.collector_unread_count,
          isActive: existingConv.is_active,
          createdAt: existingConv.created_at,
          updatedAt: existingConv.updated_at,
        };
        return conversation;
      }

      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('chat_conversations')
        .insert({
          request_id: requestId,
          dumper_id: dumperId,
          collector_id: collectorId,
          is_active: true,
        })
        .select()
        .single();

      if (createError) throw createError;

      const conversation: ChatConversation = {
        id: newConv.id,
        requestId: newConv.request_id,
        dumperId: newConv.dumper_id,
        collectorId: newConv.collector_id,
        lastMessage: newConv.last_message,
        lastMessageAt: newConv.last_message_at,
        dumperUnreadCount: newConv.dumper_unread_count,
        collectorUnreadCount: newConv.collector_unread_count,
        isActive: newConv.is_active,
        createdAt: newConv.created_at,
        updatedAt: newConv.updated_at,
      };

      // Clear conversations cache
      if (conversationsCacheKey) {
        clearCache(conversationsCacheKey);
      }

      return conversation;

    } catch (err: unknown) {
      console.error('Error creating conversation:', err);
      throw err;
    }
  }, [conversationsCacheKey]);

  // Send a message
  const sendMessage = useCallback(async (
    conversationId: string,
    message: string,
    messageType: 'text' | 'image' | 'location' = 'text',
    metadata?: any
  ) => {
    if (!user || !activeConversation) {
      throw new Error('User not authenticated or no active conversation');
    }

    setSending(true);
    setError(null);

    try {
      const { data, error: sendError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          request_id: activeConversation.requestId,
          sender_id: user.id,
          sender_type: user.userType as 'dumper' | 'collector',
          message,
          message_type: messageType,
          metadata: metadata || null,
          is_read: false,
        })
        .select()
        .single();

      if (sendError) throw sendError;

      // Update conversation with last message
      const { error: updateError } = await supabase
        .from('chat_conversations')
        .update({
          last_message: message,
          last_message_at: new Date().toISOString(),
          // Increment unread count for the other user
          ...(user.userType === 'dumper' 
            ? { collector_unread_count: activeConversation.collectorUnreadCount + 1 }
            : { dumper_unread_count: activeConversation.dumperUnreadCount + 1 }
          ),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      // Add message to local state
      const newMessage: ChatMessage = {
        id: data.id,
        requestId: data.request_id,
        senderId: data.sender_id,
        senderType: data.sender_type,
        message: data.message,
        messageType: data.message_type,
        metadata: data.metadata,
        isRead: data.is_read,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setMessages(prev => [...prev, newMessage]);

      // Clear caches
      if (messagesCacheKey) {
        clearCache(messagesCacheKey);
      }
      if (conversationsCacheKey) {
        clearCache(conversationsCacheKey);
      }

      return newMessage;

    } catch (err: unknown) {
      console.error('Error sending message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw err;
    } finally {
      setSending(false);
    }
  }, [user, activeConversation, messagesCacheKey, conversationsCacheKey]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      // Mark all unread messages as read for this user
      const { error: markReadError } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      if (markReadError) throw markReadError;

      // Reset unread count for this user in the conversation
      const { error: resetCountError } = await supabase
        .from('chat_conversations')
        .update({
          ...(user.userType === 'dumper' 
            ? { dumper_unread_count: 0 }
            : { collector_unread_count: 0 }
          ),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (resetCountError) throw resetCountError;

      // Clear caches
      if (conversationsCacheKey) {
        clearCache(conversationsCacheKey);
      }

    } catch (err: unknown) {
      console.error('Error marking messages as read:', err);
    }
  }, [user, conversationsCacheKey]);

  // Set active conversation
  const setActiveConversationById = useCallback(async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setActiveConversation(conversation);
      await fetchMessages(conversationId);
    }
  }, [conversations, fetchMessages]);

  // Initialize chat for a specific request
  const initializeChatForRequest = useCallback(async (requestId: string, dumperId: string, collectorId: string) => {
    try {
      const conversation = await getOrCreateConversation(requestId, dumperId, collectorId);
      setActiveConversation(conversation);
      await fetchMessages(conversation.id);
      return conversation;
    } catch (err: unknown) {
      console.error('Error initializing chat:', err);
      throw err;
    }
  }, [getOrCreateConversation, fetchMessages]);

  // Get unread count for current user
  const getUnreadCount = useCallback(() => {
    if (!user) return 0;
    
    return conversations.reduce((total, conv) => {
      return total + (user.userType === 'dumper' ? conv.dumperUnreadCount : conv.collectorUnreadCount);
    }, 0);
  }, [conversations, user]);

  // CRITICAL FIX: Only initialize once
  useEffect(() => {
    let mounted = true;
    
    if (user && !initialized) {
      setLoading(true);
      fetchConversations().finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    } else if (!user) {
      setLoading(false);
      setConversations([]);
      setMessages([]);
      setActiveConversation(null);
      setInitialized(false);
    }

    return () => {
      mounted = false;
    };
  }, [user?.id]); // Only depend on user ID

  // CRITICAL FIX: Disable real-time subscriptions temporarily to prevent resource exhaustion
  // This can be re-enabled once the core issues are resolved
  /*
  useEffect(() => {
    if (!user || !initialized) return;

    let conversationsChannel: ReturnType<typeof createOptimizedRealtimeSubscription> = null;
    let messagesChannel: ReturnType<typeof createOptimizedRealtimeSubscription> = null;

    // Subscribe to conversation changes
    conversationsChannel = createOptimizedRealtimeSubscription(
      'chat_conversations',
      () => {
        if (conversationsCacheKey) {
          clearCache(conversationsCacheKey);
        }
        fetchConversations();
      },
      {
        filter: `dumper_id=eq.${user.id},collector_id=eq.${user.id}`,
        debounceMs: 2000
      }
    );

    // Subscribe to message changes for active conversation
    if (activeConversation) {
      messagesChannel = createOptimizedRealtimeSubscription(
        'chat_messages',
        () => {
          if (messagesCacheKey) {
            clearCache(messagesCacheKey);
          }
          fetchMessages(activeConversation.id);
        },
        {
          filter: `conversation_id=eq.${activeConversation.id}`,
          debounceMs: 1000
        }
      );
    }

    return () => {
      if (conversationsChannel) {
        if (typeof conversationsChannel === 'object' && 'unsubscribe' in conversationsChannel) {
          (conversationsChannel as { unsubscribe: () => void }).unsubscribe();
        } else {
          supabase.removeChannel(conversationsChannel);
        }
      }
      if (messagesChannel) {
        if (typeof messagesChannel === 'object' && 'unsubscribe' in messagesChannel) {
          (messagesChannel as { unsubscribe: () => void }).unsubscribe();
        } else {
          supabase.removeChannel(messagesChannel);
        }
      }
    };
  }, [user?.id, activeConversation?.id, conversationsCacheKey, messagesCacheKey, fetchConversations, fetchMessages, initialized]);
  */

  return {
    conversations,
    messages,
    activeConversation,
    loading,
    sending,
    error,
    sendMessage,
    setActiveConversationById,
    initializeChatForRequest,
    markMessagesAsRead,
    getUnreadCount,
    refetchConversations: fetchConversations,
  };
};