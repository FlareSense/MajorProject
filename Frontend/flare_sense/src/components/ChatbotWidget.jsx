import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, Loader2 } from 'lucide-react';

const SpriteCharacter = ({ actionState, size = 60, floating = false }) => {
  // Map the application states directly to the user's custom GIF files
  const gifMap = {
    'idle': '/idle.gif',        // When bot is chilling
    'alert': '/alert.gif',      // When there is an error/threat
    'send': '/send.gif',        // When the user is typing
    'response': '/response.gif' // When the bot is replying/loading
  };

  const activeGif = gifMap[actionState] || '/idle.gif';

  return (
    <motion.img 
      src={activeGif} 
      alt={`FlareBot is ${actionState}`}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        y: floating ? [0, -5, 0] : 0, // Very subtle, stable breathing bob
        filter: actionState === 'alert' 
          ? 'drop-shadow(0px 0px 25px rgba(239, 68, 68, 0.9))' 
          : 'drop-shadow(0px 15px 25px rgba(0, 210, 255, 0.6))'
      }}
      transition={{
        y: floating ? { repeat: Infinity, duration: 4, ease: 'easeInOut' } : { duration: 0.3 },
        opacity: { duration: 0.5 }
      }}
      style={{
        width: typeof size === 'number' ? `${size}px` : size, 
        height: typeof size === 'number' ? `${size}px` : size,
        objectFit: 'contain', 
        pointerEvents: 'none', // So it doesn't block clicks to the button/window behind it
      }}
      onError={(e) => { e.target.style.opacity = 0; }}
    />
  );
};

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm FlareBot. I can assist you with system monitoring, dashboard queries, or fire safety." }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Smart Positioning State
  const [verticalAlign, setVerticalAlign] = useState('top');
  const [horizontalAlign, setHorizontalAlign] = useState('right');
  
  const endOfMessagesRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputVal.trim()) return;
    
    setHasError(false);
    const userMessage = { role: 'user', text: inputVal.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputVal('');
    setIsLoading(true);

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    if (!apiKey) {
      setTimeout(() => {
        setHasError(true);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          text: "I am unable to answer right now. Please add your `VITE_OPENAI_API_KEY` to your frontend .env file and restart the server!" 
        }]);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const openAiMessages = [
        { role: 'system', content: "You are FlareBot, a highly advanced AI security assistant for a project named 'FlareSense'. FlareSense is an AI-powered visual fire detection application that uses computer vision to detect fires and dispatch cross-channel alerts (Twilio, Telegram, Email). You are helpful, professional, and concise. Your goal is to help users navigate the dashboard, understand fire safety, and explain how the YOLO computer vision models work. Do not make up random facts." }
      ];

      messages.slice(1).forEach(msg => {
          openAiMessages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.text });
      });
      openAiMessages.push({ role: 'user', content: userMessage.text });

      const requestBody = {
        model: 'gpt-3.5-turbo',
        messages: openAiMessages,
        temperature: 0.7,
        max_tokens: 500,
      };

      const res = await fetch(`https://api.openai.com/v1/chat/completions`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error.message);

      const botReply = data.choices[0].message.content || "Sorry, I couldn't formulate a response.";
      setMessages(prev => [...prev, { role: 'assistant', text: botReply }]);
    } catch (error) {
      console.error(error);
      setHasError(true);
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I encountered an error communicating with the server." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine Sprite State
  let currentAction = 'idle';
  if (hasError) currentAction = 'alert';
  else if (isLoading) currentAction = 'response';
  else if (inputVal.trim().length > 0) currentAction = 'send';

  const toggleChatWindow = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // If button is physically currently dragged to the top half of the screen, open downwards!
      setVerticalAlign(rect.top < window.innerHeight / 2 ? 'bottom' : 'top');
      // If button is physically currently dragged to the left half, align left side!
      setHorizontalAlign(rect.left < window.innerWidth / 2 ? 'left' : 'right');
    }
    setIsOpen(!isOpen);
  };

  return (
    <motion.div 
      drag 
      dragMomentum={false}
      // Keeps the entire draggable container within the bounds of the viewport body!
      dragConstraints={{ left: 20, right: window.innerWidth - 100, top: 20, bottom: window.innerHeight - 100 }}
      style={{ 
        position: 'fixed', bottom: '30px', right: '30px', 
        zIndex: 1000, 
        cursor: 'grab'
      }}
      whileTap={{ cursor: 'grabbing' }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            onPointerDown={e => e.stopPropagation()} // Prevents dragging when interacting with chat
            initial={{ opacity: 0, scale: 0.8, y: verticalAlign === 'top' ? 30 : -30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: verticalAlign === 'top' ? 30 : -30, pointerEvents: 'none' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'absolute',
              [verticalAlign === 'top' ? 'bottom' : 'top']: 'calc(100% + 20px)',
              [horizontalAlign === 'right' ? 'right' : 'left']: '-10px',
              width: '360px',
              height: '500px',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)',
              borderRadius: '24px',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              cursor: 'default' // Return string cursor for chat box
            }}
          >
            {/* Header */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.2), rgba(89, 92, 255, 0.2))',
              padding: '16px 20px', borderBottom: '1px solid var(--glass-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(0, 210, 255, 0.4)', overflow: 'hidden' }}>
                  <SpriteCharacter actionState={currentAction} size={50} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-primary)' }}>FlareBot AI</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', background: hasError ? '#ef4444' : '#22c55e', borderRadius: '50%', display: 'inline-block' }}></span> 
                    {hasError ? 'System Error' : (isLoading ? 'Typing...' : 'Online')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                    background: msg.role === 'user' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    border: `1px solid ${msg.role === 'user' ? 'var(--glass-border)' : 'rgba(0, 210, 255, 0.3)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                  }}>
                    {msg.role === 'user' ? <User size={14} color="var(--text-secondary)" /> : <SpriteCharacter actionState="idle" size={35} />}
                  </div>
                  <div style={{
                    background: msg.role === 'user' ? 'var(--text-primary)' : 'var(--glass-bg)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--glass-border)',
                    color: msg.role === 'user' ? 'var(--bg-color)' : 'var(--text-primary)',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                    borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    maxWidth: '85%'
                  }}>
                    {msg.text.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i !== msg.text.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(0, 210, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                     <SpriteCharacter actionState="response" size={35} />
                  </div>
                  <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '12px 16px', borderRadius: '16px', borderTopLeftRadius: '4px' }}>
                    <Loader2 size={16} color="var(--text-secondary)" className="animate-spin" />
                  </div>
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', gap: '8px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '99px', padding: '6px 6px 6px 16px' }}>
                <input 
                  type="text"
                  placeholder="Ask me anything..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading || !inputVal.trim()}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                    background: inputVal.trim() && !isLoading ? 'var(--accent-blue)' : 'var(--glass-border)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: inputVal.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s'
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Central Handle Container */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* Holographic Character Placed on the Left Side */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 30, scale: 0.5 }}
              animate={{ opacity: 1, x: 0, scale: 1 }} 
              exit={{ opacity: 0, x: 20, scale: 0.8 }}
              transition={{ type: 'spring', damping: 15 }}
              style={{ 
                position: 'absolute', 
                right: '65px', // Sits partially flush over the button's left edge to bring the character physically closer
                bottom: '-22px', // Accurately centers the 120px wrapper against the 75px circle
                width: '120px', // Smaller bounding box for precise layout
                height: '120px',
                zIndex: 10, 
                pointerEvents: 'none',
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center'
              }}
            >
              <SpriteCharacter actionState={currentAction} size={120} floating={true} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Toggle Button (Movable Handle) */}
        <motion.button
          ref={buttonRef}
          whileHover={{ scale: 1.05, boxShadow: '0 12px 30px rgba(0, 210, 255, 0.6)' }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleChatWindow}
          style={{
            width: '75px', height: '75px',
            borderRadius: '50%',
            background: 'var(--glass-bg)', // Automatically adapts to Light/Dark mode!
            backdropFilter: 'blur(12px)',
            border: '2px solid var(--accent-blue)',
            boxShadow: '0 8px 25px rgba(0, 210, 255, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'grab', zIndex: 5,
          }}
        >
          {isOpen ? (
            <X size={28} color="var(--text-primary)" />
          ) : (
            <span style={{ 
              fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-primary)', 
              letterSpacing: '1px', textShadow: '0 0 12px rgba(0, 210, 255, 0.7)' 
            }}>
              F_S
            </span>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ChatbotWidget;
