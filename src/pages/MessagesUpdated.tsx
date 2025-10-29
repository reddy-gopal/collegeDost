import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { ChatWindow } from "@/components/messages/ChatWindow";
import { formatDistanceToNow } from "date-fns";

const MessagesUpdated = () => {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const { user } = useAuth();
  const { messages, loading } = useMessages(user?.id);

  // Group messages by conversation
  const conversations = messages.reduce((acc: any[], msg) => {
    const otherUserId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
    const existingConv = acc.find(c => c.userId === otherUserId);
    
    if (!existingConv) {
      const otherUser = msg.sender_id === user?.id ? msg.receiver : msg.sender;
      acc.push({
        userId: otherUserId,
        username: otherUser?.username || 'Anonymous',
        avatar: otherUser?.avatar_url,
        lastMessage: msg.content,
        time: formatDistanceToNow(new Date(msg.created_at), { addSuffix: true }),
        unread: !msg.read && msg.receiver_id === user?.id
      });
    }
    return acc;
  }, []);

  const selectedConversation = conversations.find(c => c.userId === selectedChat);

  if (loading) {
    return (
      <MainLayout showTrending={false}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showTrending={false}>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Conversations List */}
        <Card className="w-full md:w-96 border-r rounded-none flex flex-col">
          <div className="p-4 border-b bg-card">
            <h1 className="text-xl font-bold mb-4">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search messages..." className="pl-9 bg-secondary border-0" />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => setSelectedChat(conv.userId)}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-secondary/50 transition-all duration-200 border-b ${
                    selectedChat === conv.userId ? "bg-secondary" : ""
                  }`}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conv.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {conv.username?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm truncate">
                        {conv.username}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {conv.time}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage}
                    </p>
                    {conv.unread && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-1" />
                    )}
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <div className="flex-1 bg-background">
          {selectedChat && selectedConversation ? (
            <ChatWindow
              recipientId={selectedChat}
              recipientName={selectedConversation.username}
              recipientAvatar={selectedConversation.avatar}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <h2 className="text-2xl font-semibold mb-2">Your messages</h2>
              <p className="text-muted-foreground">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default MessagesUpdated;
