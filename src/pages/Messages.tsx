import { useState } from "react";
import { Edit, Search, MessageCircle, Send, Smile, Paperclip, MoreVertical, Phone, Video, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";

const Messages = () => {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useMessages(user?.id);

  const handleSendMessage = () => {
    if (message.trim() && selectedChat && user) {
      sendMessage(selectedChat, message);
      setMessage("");
    }
  };

  // Group messages by conversation
  const conversations = messages.reduce((acc: any[], msg) => {
    const otherUserId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
    const existingConv = acc.find(c => c.userId === otherUserId);
    
    if (!existingConv) {
      acc.push({
        userId: otherUserId,
        username: msg.sender_id === user?.id ? msg.receiver?.username : msg.sender?.username,
        lastMessage: msg.content,
        time: new Date(msg.created_at).toLocaleString(),
        unread: !msg.read && msg.receiver_id === user?.id
      });
    }
    return acc;
  }, []);

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
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">Messages</h1>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search messages..." className="pl-9 bg-secondary border-0" />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {conversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => setSelectedChat(conv.userId)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-secondary/50 transition-all duration-200 border-b ${
                  selectedChat === conv.userId ? "bg-secondary" : ""
                }`}
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {conv.username?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm truncate">
                      {conv.username || 'Anonymous'}
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
            ))}
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-background">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {conversations.find(c => c.userId === selectedChat)?.username?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">{conversations.find(c => c.userId === selectedChat)?.username || 'Anonymous'}</h2>
                    <p className="text-xs text-muted-foreground">Active now</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="hover:bg-secondary">
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:bg-secondary">
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:bg-secondary">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                  <div className="flex justify-start">
                    <div className="bg-secondary rounded-2xl rounded-tl-sm p-3 max-w-[70%]">
                      <p className="text-sm">Hey! How are you doing?</p>
                      <span className="text-xs text-muted-foreground mt-1 block">10:30 AM</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-3 max-w-[70%]">
                      <p className="text-sm">I'm good! Just working on my project.</p>
                      <span className="text-xs text-primary-foreground/70 mt-1 block">10:32 AM</span>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-secondary rounded-2xl rounded-tl-sm p-3 max-w-[70%]">
                      <p className="text-sm">That's great! What are you building?</p>
                      <span className="text-xs text-muted-foreground mt-1 block">10:33 AM</span>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t bg-card">
                <div className="flex items-center gap-2 max-w-3xl mx-auto">
                  <Button variant="ghost" size="icon" className="hover:bg-secondary flex-shrink-0">
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      className="pr-10 bg-secondary border-0"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent"
                    >
                      <Smile className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </div>
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage}
                    className="bg-primary hover:bg-primary/90 flex-shrink-0"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-card">
              <MessageCircle className="h-24 w-24 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Your messages</h2>
              <p className="text-muted-foreground mb-4">Send a message to start a chat.</p>
              <Button className="bg-primary hover:bg-primary/90">
                Send message
              </Button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Messages;
