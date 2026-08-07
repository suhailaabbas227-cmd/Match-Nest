import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { supabase } from "../supabase";
import { useAuth } from "../AuthContext";


export default function Chat() {
  const { userId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [convo, setConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [other, setOther] = useState(null);
  const endRef = useRef(null);


  // List conversations.
  useEffect(() => {
    api.get("/chat/conversations").then((r) => setConversations(r.conversations));
  }, []);


  // Open a conversation when a userId is in the URL.
  useEffect(() => {
    if (!userId) { setConvo(null); setMessages([]); setOther(null); return; }
    api.get(`/chat/with/${userId}`).then((r) => {
      setConvo(r.conversation);
      setMessages(r.messages);
      const o = conversations.find((c) => c.user?.id === userId)?.user;
      setOther(o || null);
    }).catch(() => {});
    // eslint-disable-next-line
  }, [userId, conversations]);


  // Live updates: subscribe to new messages in the open conversation.
  useEffect(() => {
    if (!convo) return;
    const channel = supabase
      .channel(`messages:${convo.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convo.id}` },
        (payload) => {
          const m = payload.new;
          const msg = {
            id: m.id,
            from: m.from_user,
            fromName: m.from_name,
            isChaperone: m.is_chaperone,
            text: m.text,
            createdAt: m.created_at,
          };
          setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [convo?.id]);


  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);


  async function send(e) {
    e.preventDefault();
    if (!text.trim() || !convo) return;
    await api.post(`/chat/${convo.id}/message`, { text });
    setText("");
  }


  async function addChaperone() {
    const email = prompt("Enter the email of the family member to add as chaperone:");
    if (!email) return;
    try {
      await api.post(`/chat/${convo.id}/chaperone`, { email });
      alert("Chaperone added to this conversation.");
    } catch (e) {
      alert(e.error || "Could not add chaperone");
    }
  }


  const Name = (u) => u?.profile?.displayName || u?.profile?.fullLegalName || u?.fullName || "Member";


  return (
    <div className="container">
      <h1 className="section-title">Chat</h1>
      <div className="chat-wrap">
        <div className="convo-list">
          {conversations.length === 0 && <div className="empty" style={{ padding: 24 }}>No conversations yet.</div>}
          {conversations.map((c) => (
            <div key={c.id}
              className={`convo-item ${c.user?.id === userId ? "active" : ""}`}
              onClick={() => nav(`/chat/${c.user?.id}`)}>
              <div className="name">{Name(c.user)}</div>
              <div className="last">{c.lastMessage || "Say salaam 👋"}</div>
            </div>
          ))}
        </div>


        <div className="chat-main">
          {!convo ? (
            <div className="empty">Select a conversation to start chatting.</div>
          ) : (
            <>
              <div className="chat-head">
                <div className="avatar" style={{ width: 38, height: 38 }}>{Name(other)[0]}</div>
                <b>{Name(other)}</b>
                <div className="spacer" />
                {user.mode === "marriage" && (
                  <button className="btn ghost sm" onClick={addChaperone} title="Add a family member to this chat">
                    👪 Add Chaperone
                  </button>
                )}
              </div>
              <div className="messages">
                {messages.map((m) => (
                  <div key={m.id}
                    className={`msg ${m.isChaperone ? "chap" : m.from === user.id ? "mine" : "theirs"}`}>
                    {m.from !== user.id && <div className="who">{m.fromName}{m.isChaperone ? " (chaperone)" : ""}</div>}
                    {m.text}
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form className="chat-input" onSubmit={send}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a respectful message…" />
                <button className="btn">Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
