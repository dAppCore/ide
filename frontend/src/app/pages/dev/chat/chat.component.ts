// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { callBridge } from '../../../lib/bridge';

interface ChatModel {
  name: string;
  size?: number;
  status?: string;
  architecture?: string;
  loaded?: boolean;
  backend?: string;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  model?: string;
}

interface ChatConversation {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

/**
 * Chat panel — gui chat service surface. Lemma + any other local LLM
 * picked up via the chat service's models endpoint.
 *
 * The chat backend (gui chat service) defaults to APIURL
 * http://localhost:8090. If no LLM server responds there the panel
 * shows a "no endpoint" empty state with the actual error and a hint
 * to configure /dev/settings, rather than letting bridge errors bubble
 * as toasts.
 *
 * TODO(snider/wails): replace callBridge('chat_*') with a dedicated
 * chatBridge wails service for line-speed conversation streaming.
 */
@Component({
  selector: 'dev-chat',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="block chat-block">
      <div class="block-header chat-header">
        <h2 class="block-title">{{ 'chat.title' | translate }}</h2>
        <span class="editorial subtitle">{{ 'chat.subtitle' | translate }}</span>
      </div>

      <div class="chat-toolbar">
        <select class="input chat-model-select"
                [value]="selectedModel()"
                (change)="onModelChange($any($event.target).value)"
                [disabled]="models().length === 0">
          @if (models().length === 0) {
            <option value="">{{ 'chat.option.no-models' | translate }}</option>
          } @else {
            @for (m of models(); track m.name) {
              <option [value]="m.name">{{ m.name }}@if (m.backend) { · {{ m.backend }} }@if (m.loaded) { · loaded }</option>
            }
          }
        </select>
        <button class="btn btn-ghost btn-sm" (click)="loadEverything()" [disabled]="loading()">
          @if (loading()) { <span>{{ 'chat.status.loading' | translate }}</span> }
          @else { <span>↻ {{ 'chat.button.refresh' | translate }}</span> }
        </button>
      </div>

      @if (endpointError(); as err) {
        <div class="chat-empty">
          <h3>{{ 'chat.empty.no-endpoint.title' | translate }}</h3>
          <p>{{ 'chat.empty.no-endpoint.body' | translate }}</p>
          <pre class="chat-error-detail">{{ err }}</pre>
          <p class="hint">{{ 'chat.empty.no-endpoint.hint' | translate }}</p>
        </div>
      } @else {
        <div class="chat-body">
          <aside class="chat-sidebar">
            <div class="chat-sidebar-title">
              {{ 'chat.heading.conversations' | translate }}
              <button class="btn btn-ghost btn-sm chat-new-btn" (click)="startNewConversation()" [title]="'chat.tooltip.new' | translate">+</button>
            </div>
            @if (conversations().length === 0) {
              <div class="chat-empty-inline">{{ 'chat.empty.no-conversations' | translate }}</div>
            }
            @for (c of conversations(); track c.id) {
              <button class="chat-conv-row"
                      [class.active]="selectedConversationId() === c.id"
                      (click)="loadConversation(c.id)">
                <span class="chat-conv-title">{{ c.title || 'untitled' }}</span>
                <span class="chat-conv-meta">{{ c.model }} · {{ c.updated_at.slice(0, 10) }}</span>
              </button>
            }
          </aside>

          <main class="chat-main">
            @if (messages().length === 0 && !sending()) {
              <div class="chat-empty-inline chat-prompt-empty">{{ 'chat.empty.no-messages' | translate }}</div>
            }
            <div class="chat-messages">
              @for (m of messages(); track m.id) {
                <div class="chat-msg" [attr.data-role]="m.role">
                  <div class="chat-msg-head">
                    <span class="chat-msg-role">{{ m.role }}</span>
                    @if (m.model) { <span class="chat-msg-model">{{ m.model }}</span> }
                    <span class="chat-msg-time">{{ m.created_at.slice(11, 19) }}</span>
                  </div>
                  <div class="chat-msg-content">{{ m.content }}</div>
                </div>
              }
              @if (sending()) {
                <div class="chat-msg" data-role="assistant">
                  <div class="chat-msg-head"><span class="chat-msg-role">{{ 'chat.status.sending' | translate }}</span></div>
                </div>
              }
            </div>

            <div class="chat-composer">
              <textarea class="chat-textarea"
                        [placeholder]="'chat.placeholder.message' | translate"
                        [value]="draft()"
                        (input)="draft.set($any($event.target).value)"
                        (keydown.enter)="onComposerEnter($event)"
                        rows="3"></textarea>
              <button class="btn btn-primary btn-sm chat-send-btn"
                      (click)="send()"
                      [disabled]="!canSend()">
                {{ 'chat.button.send' | translate }}
              </button>
            </div>
          </main>
        </div>
      }
    </section>
  `,
  styles: [`
    .chat-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .chat-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .chat-toolbar { display: flex; gap: 8px; align-items: center; padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .chat-model-select { flex: 1; max-width: 380px; }

    .chat-empty { padding: 32px; max-width: 600px; margin: 24px auto; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; text-align: left; }
    .chat-empty h3 { font-size: 14px; color: var(--fg-1); margin: 0 0 8px; }
    .chat-empty p { color: var(--fg-2); font-size: 13px; line-height: 1.5; margin: 6px 0; }
    .chat-empty p.hint { color: var(--fg-3); font-style: italic; font-size: 12px; }
    .chat-error-detail { font-family: var(--font-mono); font-size: 11px; color: #fbbf24; background: var(--ink-1); padding: 10px 12px; border-radius: 4px; max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; margin: 12px 0; }
    .chat-empty-inline { padding: 18px; color: var(--fg-3); font-style: italic; font-size: 12px; text-align: center; }
    .chat-prompt-empty { margin: auto 0; }

    .chat-body { flex: 1; display: grid; grid-template-columns: 280px 1fr; gap: 0; min-height: 0; overflow: hidden; }
    .chat-sidebar { border-right: 1px solid var(--line-1); overflow-y: auto; padding: 10px 0; background: var(--ink-2); }
    .chat-sidebar-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); padding: 0 14px 8px; display: flex; justify-content: space-between; align-items: center; }
    .chat-new-btn { padding: 1px 8px; font-size: 13px; }
    .chat-conv-row { width: 100%; padding: 8px 14px; background: transparent; border: 0; border-left: 2px solid transparent; text-align: left; cursor: pointer; color: var(--fg-2); font: inherit; display: flex; flex-direction: column; gap: 3px; }
    .chat-conv-row:hover { background: var(--ink-1); }
    .chat-conv-row.active { background: var(--ink-1); border-left-color: var(--brand-200); color: var(--fg-1); }
    .chat-conv-title { font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chat-conv-meta { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }

    .chat-main { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
    .chat-messages { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
    .chat-msg { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; padding: 10px 14px; }
    .chat-msg[data-role="user"] { background: color-mix(in oklch, var(--brand-500) 8%, var(--ink-2)); border-color: color-mix(in oklch, var(--brand-500) 22%, var(--line-1)); }
    .chat-msg-head { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; font-size: 10px; color: var(--fg-3); }
    .chat-msg-role { text-transform: uppercase; letter-spacing: 0.06em; color: var(--brand-200); font-family: var(--font-mono); }
    .chat-msg-model { font-family: var(--font-mono); }
    .chat-msg-time { margin-left: auto; font-family: var(--font-mono); }
    .chat-msg-content { font-size: 13px; color: var(--fg-1); line-height: 1.55; white-space: pre-wrap; word-break: break-word; }

    .chat-composer { display: flex; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--line-1); flex-shrink: 0; }
    .chat-textarea { flex: 1; resize: vertical; min-height: 60px; max-height: 200px; padding: 8px 10px; background: var(--ink-2); border: 1px solid var(--line-2); border-radius: 5px; color: var(--fg-1); font-family: var(--font-sans); font-size: 13px; line-height: 1.45; }
    .chat-textarea:focus { border-color: var(--brand-400); outline: none; }
    .chat-send-btn { align-self: flex-end; }
  `],
})
export class ChatComponent implements OnInit {
  readonly models = signal<ChatModel[]>([]);
  readonly conversations = signal<ChatConversation[]>([]);
  readonly messages = signal<ChatMessage[]>([]);
  readonly selectedModel = signal<string>('');
  readonly selectedConversationId = signal<string>('');
  readonly draft = signal<string>('');
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly endpointError = signal<string | null>(null);

  readonly canSend = computed(() => this.draft().trim().length > 0 && !this.sending() && this.endpointError() === null);

  ngOnInit(): void {
    void this.loadEverything();
  }

  /**
   * Load models + conversations together. Both go through the chat
   * backend; if it's down, both fail with the same network error and
   * we surface it once via endpointError instead of two toasts.
   */
  async loadEverything(): Promise<void> {
    this.loading.set(true);
    this.endpointError.set(null);
    try {
      const [modelsResp, convsResp] = await Promise.allSettled([
        callBridge<{ models?: ChatModel[] }>('chat_models', {}),
        callBridge<{ conversations?: ChatConversation[] }>('chat_conversations_list', {}),
      ]);
      if (modelsResp.status === 'fulfilled') {
        const list = modelsResp.value?.models || [];
        this.models.set(list);
        if (list.length > 0 && !this.selectedModel()) this.selectedModel.set(list[0].name);
      }
      if (convsResp.status === 'fulfilled') {
        this.conversations.set(convsResp.value?.conversations || []);
      }

      // If both failed in a way that screams "endpoint not reachable",
      // surface the error inline so the user knows the chat backend is
      // down rather than seeing an empty screen.
      if (modelsResp.status === 'rejected' && convsResp.status === 'rejected') {
        const reason = modelsResp.reason instanceof Error ? modelsResp.reason.message : String(modelsResp.reason);
        this.endpointError.set(reason);
      }
    } finally {
      this.loading.set(false);
    }
  }

  async loadConversation(id: string): Promise<void> {
    this.selectedConversationId.set(id);
    try {
      const v = await callBridge<{ conversation?: { messages?: ChatMessage[]; model?: string } }>(
        'chat_conversations_load',
        { id },
      );
      const conv = v?.conversation;
      this.messages.set(conv?.messages || []);
      if (conv?.model) this.selectedModel.set(conv.model);
    } catch (e) {
      this.messages.set([]);
      this.endpointError.set(e instanceof Error ? e.message : String(e));
    }
  }

  startNewConversation(): void {
    this.selectedConversationId.set('');
    this.messages.set([]);
    this.draft.set('');
  }

  async onModelChange(name: string): Promise<void> {
    this.selectedModel.set(name);
    if (this.selectedConversationId()) {
      try {
        await callBridge('chat_select_model', {
          model: name,
          conversation_id: this.selectedConversationId(),
        });
      } catch {
        // surface via reload — the next loadConversation will catch it
      }
    }
  }

  onComposerEnter(ev: Event): void {
    const ke = ev as KeyboardEvent;
    if (ke.shiftKey) return; // Shift+Enter = newline
    ke.preventDefault();
    void this.send();
  }

  async send(): Promise<void> {
    const text = this.draft().trim();
    if (!text || this.sending()) return;
    this.sending.set(true);

    // Optimistically append the user message so the UI doesn't feel
    // dead while the LLM is thinking. The reload after send will
    // replace this with the real persisted version.
    const stub: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    this.messages.update((cur) => [...cur, stub]);
    this.draft.set('');

    try {
      await callBridge<{ message_id?: string }>('chat_send', {
        conversation_id: this.selectedConversationId(),
        content: text,
        model: this.selectedModel(),
      });
      // Refresh: send may have created a new conversation; reload list +
      // the active conversation messages.
      await this.loadEverything();
      const cur = this.selectedConversationId();
      if (cur) await this.loadConversation(cur);
      else if (this.conversations().length > 0) {
        // New conversation was just created — pick the most recent one.
        const newest = this.conversations()[0];
        if (newest) await this.loadConversation(newest.id);
      }
    } catch (e) {
      // Surface the error inline by setting endpointError; the empty
      // state UI takes over and the user sees the actual reason.
      this.endpointError.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.sending.set(false);
    }
  }
}
