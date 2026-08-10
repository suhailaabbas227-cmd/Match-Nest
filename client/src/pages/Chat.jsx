import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
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
  const [access, setAccess] = useState(user.membership || null);
  const [sendError, setSendError] = useState("");
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
      setAccess(r.access);
      const o = conversations.find((c) => c.user?.id === userId)?.user;
      setOther(o || null);
    }).catch(() => {});
    // eslint-disable-next-line
  }, [userId, conversations]);


  // Secure polling keeps locked message text on the server. Direct realtime
  // table payloads are intentionally not used because they could expose text
  // that a free member has not unlocked.
  useEffect(() => {
    if (!convo || !userId) return undefined;
    const timer = window.setInterval(() => {
      api.get(`/chat/with/${userId}`).then((r) => {
        setMessages(r.messages);
        setAccess(r.access);
      }).catch(() => {});
    }, 4000);
    return () => window.clearInterval(timer);
  }, [convo?.id, userId]);


  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);


  async function send(e) {
    e.preventDefault();
    if (!text.trim() || !convo) return;
    setSendError("");
    try {
      await api.post(`/chat/${convo.id}/message`, { text });
      setText("");
      const refreshed = await api.get(`/chat/with/${userId}`);
      setMessages(refreshed.messages);
      setAccess(refreshed.access);
    } catch (e) {
      setSendError(e.message || "Could not send message");
    }
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
  const freeMessagesRemaining = access?.is_premium ? null : Math.max(0, access?.free_messages_remaining ?? 2);
  const freeLimitReached = freeMessagesRemaining === 0;


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
                {messages.map((m) => {
                  const kind = m.isChaperone ? "chap" : m.from === user.id ? "mine" : "theirs";
                  return (
                    <div key={m.id} className={`msg ${kind} ${m.locked ? "locked" : ""}`}>
                      {m.from !== user.id && <div className="who">{m.fromName}{m.isChaperone ? " (chaperone)" : ""}</div>}
                      {m.locked ? (
                        <div className="locked-message">
                          <div className="locked-preview" aria-hidden="true">This message is waiting for you</div>
                          <div className="locked-overlay">
                            <b>🔒 Premium message</b>
                            <span>Upgrade to read and continue the conversation.</span>
                            <button type="button" onClick={() => nav("/plans")}>View plans</button>
                          </div>
                        </div>
                      ) : m.text}
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              {!access?.is_premium && (
                <div className="free-chat-limit">
                  <b>Free plan:</b> {freeMessagesRemaining} of 2 messages remaining.
                  {freeLimitReached && <button type="button" onClick={() => nav("/plans")}>Upgrade</button>}
                </div>
              )}
              {sendError && <div className="error chat-error" role="alert">{sendError}</div>}
              <form className="chat-input" onSubmit={send}>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={freeLimitReached ? "Upgrade to continue messaging" : "Type a respectful message…"}
                  disabled={freeLimitReached}
                />
                {freeLimitReached ? (
                  <button className="btn" type="button" onClick={() => nav("/plans")}>Upgrade</button>
                ) : (
                  <button className="btn">Send</button>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
