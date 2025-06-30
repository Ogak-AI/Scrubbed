/*
  # Add Chat System Tables

  1. New Tables
    - `chat_conversations`
      - `id` (uuid, primary key)
      - `request_id` (uuid, references waste_requests)
      - `dumper_id` (uuid, references profiles)
      - `collector_id` (uuid, references profiles)
      - `last_message` (text, nullable)
      - `last_message_at` (timestamptz, nullable)
      - `dumper_unread_count` (integer, default 0)
      - `collector_unread_count` (integer, default 0)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `chat_messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references chat_conversations)
      - `request_id` (uuid, references waste_requests)
      - `sender_id` (uuid, references profiles)
      - `sender_type` (text, check constraint for dumper/collector)
      - `message` (text)
      - `message_type` (text, default 'text')
      - `metadata` (jsonb, nullable)
      - `is_read` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to access their own conversations and messages
    - Ensure proper access control for chat functionality

  3. Indexes
    - Add indexes for better query performance
    - Optimize for common chat queries
*/

-- Create chat_conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid REFERENCES waste_requests(id) ON DELETE CASCADE NOT NULL,
  dumper_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  collector_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_message text,
  last_message_at timestamptz,
  dumper_unread_count integer DEFAULT 0,
  collector_unread_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE CASCADE NOT NULL,
  request_id uuid REFERENCES waste_requests(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sender_type text CHECK (sender_type IN ('dumper', 'collector')) NOT NULL,
  message text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location')),
  metadata jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can read own conversations" ON chat_conversations 
  FOR SELECT USING (
    auth.uid() = dumper_id OR auth.uid() = collector_id
  );

CREATE POLICY "Users can insert conversations for their requests" ON chat_conversations 
  FOR INSERT WITH CHECK (
    auth.uid() = dumper_id OR auth.uid() = collector_id
  );

CREATE POLICY "Users can update own conversations" ON chat_conversations 
  FOR UPDATE USING (
    auth.uid() = dumper_id OR auth.uid() = collector_id
  );

-- RLS Policies for chat_messages
CREATE POLICY "Users can read messages in their conversations" ON chat_messages 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE chat_conversations.id = chat_messages.conversation_id 
      AND (chat_conversations.dumper_id = auth.uid() OR chat_conversations.collector_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their conversations" ON chat_messages 
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE chat_conversations.id = chat_messages.conversation_id 
      AND (chat_conversations.dumper_id = auth.uid() OR chat_conversations.collector_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages" ON chat_messages 
  FOR UPDATE USING (
    auth.uid() = sender_id OR
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE chat_conversations.id = chat_messages.conversation_id 
      AND (chat_conversations.dumper_id = auth.uid() OR chat_conversations.collector_id = auth.uid())
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_request_id ON chat_conversations(request_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_dumper_id ON chat_conversations(dumper_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_collector_id ON chat_conversations(collector_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_is_active ON chat_conversations(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message_at ON chat_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_request_id ON chat_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON chat_messages(is_read);

-- Add unique constraint to prevent duplicate conversations for the same request
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_conversations_unique_request 
ON chat_conversations(request_id) 
WHERE is_active = true;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_chat_conversations_updated_at 
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at 
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE chat_conversations IS 'Stores chat conversations between dumpers and collectors for waste requests';
COMMENT ON TABLE chat_messages IS 'Stores individual messages within chat conversations';

COMMENT ON COLUMN chat_conversations.dumper_unread_count IS 'Number of unread messages for the dumper';
COMMENT ON COLUMN chat_conversations.collector_unread_count IS 'Number of unread messages for the collector';
COMMENT ON COLUMN chat_messages.message_type IS 'Type of message: text, image, or location';
COMMENT ON COLUMN chat_messages.metadata IS 'Additional message data like image URLs or location coordinates';