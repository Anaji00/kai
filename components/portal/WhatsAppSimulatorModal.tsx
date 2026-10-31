"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  Sparkles,
  Smartphone,
  CheckCheck,
  Plane,
  FileCheck,
  BookOpen,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  StagingIntake,
  fetchWhatsAppCard,
  executeWhatsAppButtonAction,
  sendWhatsAppReplyText,
  WhatsAppSimulationResponse,
} from "@/lib/sidecar-api";

interface WhatsAppSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  intake: StagingIntake | null;
  onIntakeUpdated?: (updated: Partial<StagingIntake>) => void;
}

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text?: string;
  cardData?: any;
  timestamp: string;
  isReceipt?: boolean;
}

export default function WhatsAppSimulatorModal({
  isOpen,
  onClose,
  intake,
  onIntakeUpdated,
}: WhatsAppSimulatorModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentIntake, setCurrentIntake] = useState<StagingIntake | null>(intake);

  useEffect(() => {
    setCurrentIntake(intake);
    if (intake && isOpen) {
      loadCard(intake);
    }
  }, [intake, isOpen]);

  const loadCard = async (targetIntake: StagingIntake) => {
    setLoading(true);
    try {
      const res: WhatsAppSimulationResponse = await fetchWhatsAppCard(targetIntake.id);
      const cardBody =
        res.card_payload?.interactive?.body?.text ||
        `🌿 *KAI CONCIERGE DISPATCH*\n*Guest:* ${targetIntake.client_name} (Burnout Score: 9/10)\n*Sanctuary:* ${(targetIntake.sanctuary_slug || "Nosara").toUpperCase()}\n*Room:* ${targetIntake.room_tier || "Private Villa Sanctuary"}\n\n📋 *PRE-CALL CLINICAL THESIS:*\n• Sympathetic hyperarousal with sleep fragmentation\n\n⚡ *Quick Actions:*`;

      setMessages([
        {
          id: "card-msg",
          sender: "bot",
          text: cardBody,
          cardData: res.card_payload?.interactive,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !currentIntake) return null;

  const handleButtonClick = async (btnId: string, btnTitle: string) => {
    // 1. Add user click message
    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: btnTitle,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await executeWhatsAppButtonAction(currentIntake.id, btnId, "Kareena Islam");
      if (res.action_result?.reply_text) {
        const botReply: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: res.action_result.reply_text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isReceipt: true,
        };
        setMessages((prev) => [...prev, botReply]);
      }

      if (res.updated_intake && onIntakeUpdated) {
        onIntakeUpdated(res.updated_intake);
        setCurrentIntake((prev) => (prev ? { ...prev, ...res.updated_intake } : null));
      }
    } catch (e) {
      console.error("Action error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const res = await sendWhatsAppReplyText(currentIntake.id, textToSend);
      if (res.reply_receipt) {
        const botReply: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: res.reply_receipt,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isReceipt: true,
        };
        setMessages((prev) => [...prev, botReply]);
      }

      if (res.updated_intake && onIntakeUpdated) {
        onIntakeUpdated(res.updated_intake);
        setCurrentIntake((prev) => (prev ? { ...prev, ...res.updated_intake } : null));
      }
    } catch (e) {
      console.error("Reply error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0F172A] rounded-[36px] p-4 shadow-2xl border-4 border-[#334155] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Phone Speaker & Dynamic Island Mockup */}
        <div className="flex justify-between items-center px-4 py-1 text-slate-400 text-[10px] font-mono select-none">
          <span>09:41</span>
          <div className="w-20 h-4 bg-black rounded-full mx-auto" />
          <div className="flex items-center space-x-1">
            <Smartphone className="w-3 h-3" />
            <span>5G</span>
          </div>
        </div>

        {/* WhatsApp App Header */}
        <div className="bg-[#075E54] text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-md mt-1">
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-900 font-serif font-bold text-sm">
                🌿
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#075E54] rounded-full" />
            </div>
            <div>
              <div className="font-semibold text-xs leading-tight flex items-center space-x-1">
                <span>KAI Concierge Bot</span>
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
              </div>
              <div className="text-[10px] text-emerald-100/90 font-mono">
                Operator Dispatch &middot; Mobile Webhook
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => loadCard(currentIntake)}
              disabled={loading}
              className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10"
              title="Reset Card"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Stream Container */}
        <div
          className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0B141A] rounded-2xl my-2 border border-slate-800 text-xs scrollbar-thin scrollbar-thumb-slate-700"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.4) 0%, rgba(11, 20, 26, 0.95) 100%)",
          }}
        >
          {/* Encryption notice */}
          <div className="text-center">
            <span className="inline-block px-2.5 py-1 rounded bg-[#182229] text-[#8696A0] text-[9px] font-mono border border-slate-800">
              🔒 End-to-end encrypted &middot; Zero Autonomous Writes Enforced
            </span>
          </div>

          {messages.map((msg) => {
            const isBot = msg.sender === "bot";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isBot ? "items-start" : "items-end"}`}
              >
                <div
                  className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isBot
                      ? "bg-[#202C33] text-[#E9EDEF] rounded-tl-sm border border-slate-700/50"
                      : "bg-[#005C4B] text-white rounded-tr-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

                  {/* Render Action Buttons if available on bot card */}
                  {isBot && msg.cardData?.action?.buttons && !msg.isReceipt && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700 space-y-1.5">
                      <div className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400">
                        Tap to Authorize:
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {msg.cardData.action.buttons.map((b: any) => (
                          <button
                            key={b.reply.id}
                            onClick={() => handleButtonClick(b.reply.id, b.reply.title)}
                            disabled={loading}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold bg-[#2A3942] hover:bg-[#324552] text-white transition-all flex items-center justify-between border border-slate-600/70"
                          >
                            <span>{b.reply.title}</span>
                            <span className="text-[10px] text-emerald-400 font-mono">1-Tap</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`mt-1.5 flex items-center justify-end space-x-1 text-[9px] ${
                      isBot ? "text-[#8696A0]" : "text-emerald-200"
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {!isBot && <CheckCheck className="w-3 h-3 text-cyan-400" />}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center space-x-2 text-slate-400 text-xs italic p-2">
              <span className="animate-spin w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full" />
              <span>KAI Webhook Processing...</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips for Kareena */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1 px-1 scrollbar-none text-[10px]">
          <button
            onClick={() => handleSendReply("Change room tier to Shared Ocean Pavilion, tag as VIP")}
            disabled={loading}
            className="px-2 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap border border-slate-700 flex items-center space-x-1"
          >
            <span>✨ Change to Ocean Pavilion</span>
          </button>
          <button
            onClick={() => handleSendReply("Add note: husband joining, requires low-impact yoga")}
            disabled={loading}
            className="px-2 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap border border-slate-700 flex items-center space-x-1"
          >
            <span>📝 Add Companion Note</span>
          </button>
          <button
            onClick={() => handleSendReply("Decline intake, retreat group at strict 14 limit")}
            disabled={loading}
            className="px-2 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-red-300 whitespace-nowrap border border-red-900/50"
          >
            <span>⛔ Route to Waitlist</span>
          </button>
        </div>

        {/* Reply Bar */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
            placeholder="Reply to adjust notes or room tier..."
            className="flex-1 bg-[#202C33] text-white text-xs px-3.5 py-2.5 rounded-full border border-slate-700 focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
          />
          <button
            onClick={() => handleSendReply()}
            disabled={loading || !inputText.trim()}
            className="p-2.5 rounded-full bg-[#00A884] hover:bg-[#008F6F] text-white disabled:opacity-40 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
