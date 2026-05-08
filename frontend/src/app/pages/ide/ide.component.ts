import { Component, signal, OnInit, OnDestroy, PLATFORM_ID, Inject, computed, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { Brief, Site, ActivityItem, ViStatus, emptyViStatus, loadViData } from '../../lib/vi.types';

// Plugin → native-element-tag map. v1 fixture allowlist; v2 will read from
// each marketplace module's manifest entry_native_tag field.
function pluginNativeTag(code: string): string | null {
  switch (code) {
    case 'vi': return 'lethean-vi-plugin';
    default: return null;
  }
}

/**
 * IDE main page — Vi Control Panel layout (Lethean-3 native handoff pattern).
 *
 * Three-column on desktop:
 *   sidebar (240px) | main content (brief grid + sites + activity) | (Vi conversation panel — future)
 *
 * Status bar pinned at bottom (22px tall, mono, Vi connected · latency · sites · spend).
 *
 * Other surfaces (explorer / search / git / terminal / settings) keep placeholder
 * content for now but inherit the new tokens. The dashboard view is replaced
 * with the brief grid + sites + activity per the Vi Control Panel pattern.
 */
@Component({
  selector: 'app-ide',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="ide-layout">
      <app-sidebar [currentRoute]="currentRoute()" [pluginMenus]="pluginMenus()" (routeChange)="onRouteChange($event)"></app-sidebar>

      <div class="ide-main">
        <!-- Toolbar -->
        <div class="toolbar">
          <div class="toolbar-title">
            {{ titleForRoute() }}
          </div>
          <div class="toolbar-actions">
            <button class="btn btn-ghost btn-sm" title="Search workspace">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
              <span class="kbd">⌘F</span>
            </button>
            <button class="btn btn-ghost btn-sm vi-pill" title="Toggle chat panel" (click)="showChat()">
              <span class="kbd">⌘K</span>
              <span>Ask Vi</span>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="content">
          @switch (viewKind()) {
            @case ('control-panel') {
              <!-- Brief grid -->
              <section class="block">
                <div class="block-header">
                  <h2 class="block-title">Briefs</h2>
                  <span class="editorial subtitle">{{ briefSubtitle() }}</span>
                </div>
                <div class="brief-grid">
                  @for (brief of briefs(); track $index) {
                    <article class="brief-card" [attr.data-tone]="brief.tone" [class.done]="brief.done">
                      <span class="tone-strip"></span>
                      <div class="brief-body">
                        <div class="brief-meta">
                          <span class="tone-dot"></span>
                          <span class="brief-time">{{ brief.time }}</span>
                          @if (brief.done) {
                            <span class="brief-done">DONE</span>
                          }
                        </div>
                        <h3 class="brief-title">{{ brief.title }}</h3>
                        <p class="brief-text">{{ brief.body }}</p>
                        <div class="brief-actions">
                          @for (action of brief.actions; track action.label) {
                            <button class="btn btn-sm" [class.btn-primary]="action.primary && !brief.done" [class.btn-secondary]="!action.primary && !brief.done" [class.btn-ghost]="brief.done">
                              {{ action.label }}
                              @if (brief.shortcut && action.primary) {
                                <span class="kbd">{{ brief.shortcut }}</span>
                              }
                            </button>
                          }
                        </div>
                      </div>
                    </article>
                  }
                </div>
              </section>

              <!-- Sites table -->
              <section class="block">
                <div class="block-header">
                  <h2 class="block-title">Sites</h2>
                  <span class="editorial subtitle">{{ vi().watching }} watched · {{ greenCount() }} green</span>
                </div>
                <div class="sites-table">
                  <div class="sites-row sites-head">
                    <span>Domain</span>
                    <span>Stack</span>
                    <span>Uptime</span>
                    <span>Response</span>
                    <span>Deploy</span>
                  </div>
                  @for (site of sites(); track site.domain) {
                    <div class="sites-row">
                      <span class="sites-domain">
                        <span class="status-dot" [attr.data-status]="site.status"></span>
                        <span class="num">{{ site.domain }}</span>
                      </span>
                      <span class="sites-stack">{{ site.stack }}</span>
                      <span class="num tnum">{{ site.uptime }}%</span>
                      <span class="num tnum">{{ site.response }}ms</span>
                      <span class="sites-deploy">
                        {{ site.lastDeploy }}
                        @if (site.warn) {
                          <span class="pill pill-warn">{{ site.warn }}</span>
                        }
                      </span>
                    </div>
                  }
                </div>
              </section>

              <!-- Activity stream -->
              <section class="block">
                <div class="block-header">
                  <h2 class="block-title">Activity</h2>
                  <span class="editorial subtitle">last few hours</span>
                </div>
                <div class="activity-list">
                  @for (item of activity(); track $index) {
                    <div class="activity-row" [attr.data-tone]="item.tone">
                      <span class="who-badge num">{{ item.who | uppercase }}</span>
                      <span class="activity-text">{{ item.text }}</span>
                      <span class="num activity-time">{{ item.time }}</span>
                    </div>
                  }
                </div>
              </section>
            }
            @case ('terminal') {
              <section class="block">
                <h2 class="block-title">Terminal</h2>
                <div class="terminal-output">
                  <pre>$ core dev health
18 repos │ clean │ synced

$ _</pre>
                </div>
              </section>
            }
            @case ('git') {
              <section class="block git-block">
                <div class="block-header git-header">
                  <h2 class="block-title">Source Control</h2>
                  @if (gitBranch(); as b) {
                    <span class="git-branch-pill">
                      <span class="git-branch-name">{{ b.branch || '(detached)' }}</span>
                      @if (b.ahead > 0) { <span class="git-ahead">↑{{ b.ahead }}</span> }
                      @if (b.behind > 0) { <span class="git-behind">↓{{ b.behind }}</span> }
                    </span>
                  }
                  <button class="btn btn-ghost btn-sm" (click)="refreshGit()" [disabled]="gitBusy()" title="Refresh status">
                    Refresh
                  </button>
                </div>

                <div class="git-grid">
                  <div class="git-list">
                    @if (gitEntries().length === 0) {
                      <div class="git-empty">working tree clean</div>
                    }
                    @for (e of gitEntries(); track e.path) {
                      <div
                        class="git-row"
                        [class.active]="gitSelectedFile() === e.path"
                        [class.staged]="e.staged"
                        [class.unstaged]="e.unstaged"
                        [class.untracked]="e.untracked"
                        (click)="selectGitFile(e.path)"
                      >
                        <span class="git-status-flag">{{ gitFileLabel(e) }}</span>
                        <span class="git-row-path">{{ e.path }}</span>
                        @if (e.staged && !e.unstaged) {
                          <button class="git-row-btn" (click)="unstageFile(e.path, $event)" title="Unstage">−</button>
                        } @else {
                          <button class="git-row-btn" (click)="stageFile(e.path, $event)" title="Stage">+</button>
                        }
                      </div>
                    }
                  </div>

                  <div class="git-diff-pane">
                    @if (gitSelectedFile(); as p) {
                      <div class="git-diff-header">
                        <span class="git-diff-path">{{ p }}</span>
                      </div>
                      <pre class="git-diff-body">{{ gitDiff() }}</pre>
                    } @else {
                      <div class="git-diff-empty">Select a file to view its diff</div>
                    }
                  </div>
                </div>

                <div class="git-commit-bar">
                  <input
                    type="text"
                    class="git-commit-input"
                    placeholder="Commit message…"
                    [value]="gitCommitMessage()"
                    (input)="gitCommitMessage.set($any($event.target).value)"
                    (keydown.enter)="commitStaged()"
                  />
                  <button class="btn btn-secondary btn-sm" (click)="stageAll()" [disabled]="gitBusy()" title="Stage all changes">
                    Stage all
                  </button>
                  <button
                    class="btn btn-primary btn-sm"
                    (click)="commitStaged()"
                    [disabled]="gitBusy() || !hasStaged() || !gitCommitMessage().trim()"
                    title="Commit staged"
                  >
                    Commit
                  </button>
                </div>

                @if (gitMessage(); as msg) {
                  <div class="git-message">{{ msg }}</div>
                }
              </section>
            }
            @case ('search') {
              <section class="block search-block">
                <div class="block-header search-header">
                  <h2 class="block-title">Search</h2>
                  <span class="editorial subtitle">{{ workspaceRoot() }}</span>
                </div>
                <div class="search-toolbar">
                  <input
                    type="text"
                    class="search-input"
                    placeholder="Search workspace…"
                    [value]="searchQuery()"
                    (input)="searchQuery.set($any($event.target).value)"
                    (keydown.enter)="runSearch()"
                  />
                  <button class="btn btn-primary btn-sm" (click)="runSearch()" [disabled]="searchLoading()">
                    @if (searchLoading()) { <span>searching…</span> }
                    @else { <span>Search</span> }
                  </button>
                </div>

                @if (searchError(); as err) {
                  <div class="search-error">{{ err }}</div>
                }

                @if (searchResults().length === 0 && !searchError() && !searchLoading() && searchQuery()) {
                  <div class="search-empty">No matches</div>
                }

                @if (searchResults().length > 0) {
                  <div class="search-summary">
                    {{ searchResults().length }} match{{ searchResults().length === 1 ? '' : 'es' }}
                    @if (searchTruncated()) { <span>· truncated at 200 results</span> }
                  </div>
                  <div class="search-results">
                    @for (m of searchResults(); track $index) {
                      <button class="search-row" (click)="openSearchResult(m)">
                        <span class="search-path">{{ basename(m.path) }}</span>
                        <span class="search-line">:{{ m.line }}</span>
                        <span class="search-text">{{ m.text }}</span>
                        <span class="search-fullpath">{{ m.path }}</span>
                      </button>
                    }
                  </div>
                }
              </section>
            }
            @case ('explorer') {
              <section class="block explorer-block">
                <div class="block-header explorer-header">
                  <h2 class="block-title">Explorer</h2>
                  <div class="breadcrumb">
                    @for (seg of pathSegments(); track seg.path; let isLast = $last) {
                      <button class="crumb" (click)="loadDir(seg.path)">{{ seg.name }}</button>
                      @if (!isLast) {
                        <span class="crumb-sep">/</span>
                      }
                    }
                  </div>
                </div>

                <div class="explorer-grid" [class.has-file]="openFiles().length > 0">
                  <!-- Directory listing -->
                  <div class="explorer-tree">
                    <div class="tree-row up" (click)="navigateUp()" title="Up one directory">
                      <span class="tree-icon">⤴</span>
                      <span class="tree-name">..</span>
                    </div>
                    @if (explorerLoading()) {
                      <div class="tree-row loading">loading…</div>
                    }
                    @for (entry of dirEntries(); track entry.name) {
                      <div
                        class="tree-row"
                        [class.dir]="entry.is_dir"
                        [class.file]="!entry.is_dir"
                        [class.active]="!entry.is_dir && activeFile()?.path === currentPath() + '/' + entry.name"
                        (click)="openFileFromTree(entry.name, entry.is_dir)"
                      >
                        <span class="tree-icon">{{ entry.is_dir ? '▸' : '·' }}</span>
                        <span class="tree-name">{{ entry.name }}</span>
                      </div>
                    }
                    @if (!explorerLoading() && dirEntries().length === 0) {
                      <div class="tree-row empty">(empty)</div>
                    }
                  </div>

                  <!-- Tabs + editor -->
                  @if (openFiles().length > 0) {
                    <div class="explorer-viewer">
                      <!-- Tab bar -->
                      <div class="tab-bar">
                        <div class="tab-list">
                          @for (f of openFiles(); track f.path; let i = $index) {
                            <div
                              class="tab"
                              [class.active]="i === activeFileIdx()"
                              [title]="f.path"
                              (click)="selectTab(i)"
                              (auxclick)="closeTab(i, $event)"
                            >
                              <span class="tab-name">{{ basename(f.path) }}</span>
                              <span class="tab-dirty" [class.show]="f.dirty">●</span>
                              <button
                                class="tab-close"
                                title="Close tab"
                                (click)="closeTab(i, $event)"
                              >×</button>
                            </div>
                          }
                        </div>
                        <button
                          class="tab-close-all"
                          title="Close all tabs"
                          (click)="closeAllTabs()"
                          [disabled]="openFiles().length === 0"
                        >× all</button>
                      </div>

                      <!-- Active file metadata -->
                      @if (activeFile(); as f) {
                        <div class="viewer-header">
                          <span class="viewer-path">{{ f.path }}</span>
                          <span class="viewer-lang">{{ f.language }}</span>
                          @if (f.dirty) {
                            <span class="viewer-dirty" title="unsaved changes">●</span>
                          }
                          <button class="viewer-save" (click)="saveActiveTab()" title="Save (⌘S)">Save</button>
                        </div>

                        <!-- Monaco — single instance, switches model per tab -->
                        <div class="viewer-monaco">
                          <lethean-monaco
                            #editorRef
                            [attr.path]="f.path"
                            [attr.language]="f.language"
                            [attr.value]="f.content"
                            theme="vs-dark"
                            [attr.font-size]="settings().editorFontSize"
                            [attr.tab-size]="settings().editorTabSize"
                            [attr.word-wrap]="settings().editorWordWrap ? 'on' : 'off'"
                            [attr.line-numbers]="settings().editorLineNumbers ? 'on' : 'off'"
                            [attr.minimap]="settings().editorMinimap ? '' : null"
                            [attr.render-whitespace]="settings().editorRenderWhitespace"
                            (lethean-editor-change)="onEditorChange($any($event).detail.value)"
                            (lethean-editor-save)="onEditorSave($any($event).detail.value)"
                          ></lethean-monaco>
                        </div>
                      }
                    </div>
                  }
                </div>
              </section>
            }
            @case ('ts') {
              <section class="block ts-block">
                <div class="block-header ts-header">
                  <h2 class="block-title">TypeScript</h2>
                  <span class="editorial subtitle">TS / Deno / JS project discovery · 115 projects across the canon. Click a script → output streams in /process.</span>
                </div>
                <div class="ts-toolbar">
                  <input type="text" class="ts-filter" placeholder="filter by name, framework, package manager…"
                         [value]="tsFilter()"
                         (input)="tsFilter.set($any($event.target).value)" />
                  <button class="btn btn-ghost btn-sm" (click)="loadTSProjects()" [disabled]="tsLoading()">
                    @if (tsLoading()) { <span>scanning…</span> } @else { <span>Re-scan</span> }
                  </button>
                </div>

                <div class="ts-body">
                  <div class="ts-side">
                    <h3>{{ tsVisible().length }} of {{ tsProjects().length }}</h3>
                    @for (p of tsVisible(); track p.path) {
                      <button class="ts-row"
                              [class.active]="tsSelected()?.path === p.path"
                              (click)="selectTSProject(p)">
                        <span class="ts-name">
                          {{ p.name }}
                          @if (p.deno) { <span class="ts-tag deno">deno</span> }
                          @if (p.workspace) { <span class="ts-tag ws">ws</span> }
                        </span>
                        <span class="ts-meta">
                          <code>{{ p.package_manager }}</code>
                          @for (fw of p.frameworks.slice(0, 3); track fw) {
                            <span class="ts-fw">{{ fw }}</span>
                          }
                        </span>
                      </button>
                    }
                  </div>

                  <div class="ts-main">
                    @if (tsSelected(); as sel) {
                      <div class="ts-detail">
                        <h3>{{ sel.name }} <span class="ts-version">{{ sel.version }}</span></h3>
                        <code class="ts-path">{{ sel.path }}</code>
                        @if (sel.description) { <p class="ts-desc">{{ sel.description }}</p> }

                        <div class="ts-grid">
                          <div class="ts-cell">
                            <span class="ts-label">Package manager</span>
                            <code>{{ sel.package_manager }}</code>
                          </div>
                          <div class="ts-cell">
                            <span class="ts-label">Modified</span>
                            <code>{{ sel.modified }}</code>
                          </div>
                          <div class="ts-cell">
                            <span class="ts-label">tsconfig</span>
                            <span [class.ok]="sel.has_tsconfig">{{ sel.has_tsconfig ? '✓' : '—' }}</span>
                          </div>
                          <div class="ts-cell">
                            <span class="ts-label">node_modules</span>
                            <span [class.ok]="sel.has_node_modules">{{ sel.has_node_modules ? '✓' : '—' }}</span>
                          </div>
                          <div class="ts-cell">
                            <span class="ts-label">lockfile</span>
                            <span [class.ok]="sel.has_lockfile">{{ sel.has_lockfile ? '✓' : '—' }}</span>
                          </div>
                          <div class="ts-cell">
                            <span class="ts-label">workspace root</span>
                            <span [class.ok]="sel.workspace">{{ sel.workspace ? '✓' : '—' }}</span>
                          </div>
                        </div>

                        @if (sel.frameworks.length > 0) {
                          <h4>Frameworks</h4>
                          <div class="ts-fw-list">
                            @for (fw of sel.frameworks; track fw) {
                              <span class="ts-fw-pill">{{ fw }}</span>
                            }
                          </div>
                        }

                        @if (sel.scripts.length > 0) {
                          <h4>{{ sel.deno ? 'Tasks' : 'Scripts' }}</h4>
                          <div class="ts-scripts">
                            @for (s of sel.scripts; track s.name) {
                              <button class="ts-script" (click)="runTSScript(sel, s.name)" [title]="s.cmd">
                                <span class="ts-script-name">{{ s.name }}</span>
                                <span class="ts-script-cmd"><code>{{ s.cmd.length > 60 ? s.cmd.slice(0, 60) + '…' : s.cmd }}</code></span>
                              </button>
                            }
                          </div>
                        } @else {
                          <p class="ts-empty">No scripts defined.</p>
                        }
                      </div>
                    } @else {
                      <div class="ts-empty-pane">No project selected.</div>
                    }
                  </div>
                </div>
              </section>
            }
            @case ('php') {
              <section class="block php-block">
                <div class="block-header php-header">
                  <h2 class="block-title">PHP</h2>
                  <span class="editorial subtitle">Laravel project discovery + tooling · Surface over <code>core/php</code>.</span>
                </div>
                @if (phpError(); as err) {
                  <div class="php-error">{{ err }}</div>
                }
                <div class="php-body">
                  <div class="php-side">
                    <h3>Projects ({{ phpProjects().length }})</h3>
                    @if (phpLoading() && phpProjects().length === 0) {
                      <div class="php-empty">Scanning…</div>
                    }
                    @for (p of phpProjects(); track p.path) {
                      <button class="php-row"
                              [class.active]="phpSelected()?.path === p.path"
                              (click)="selectPHPProject(p.path)">
                        <span class="php-name">
                          {{ p.name }}
                          @if (p.frankenphp) { <span class="php-tag">FrankenPHP</span> }
                        </span>
                        <span class="php-url">{{ p.app_url || p.path }}</span>
                      </button>
                    }
                  </div>

                  <div class="php-main">
                    @if (phpSelected(); as sel) {
                      <div class="php-detail">
                        <h3>{{ sel.name }}</h3>
                        <code class="php-path">{{ sel.path }}</code>

                        <div class="php-grid">
                          <div class="php-cell">
                            <span class="php-label">App name</span>
                            <span>{{ sel.app_name || '—' }}</span>
                          </div>
                          <div class="php-cell">
                            <span class="php-label">App URL</span>
                            <span><code>{{ sel.app_url || '—' }}</code></span>
                          </div>
                          <div class="php-cell">
                            <span class="php-label">Domain</span>
                            <span><code>{{ sel.domain || '—' }}</code></span>
                          </div>
                          <div class="php-cell">
                            <span class="php-label">Package manager</span>
                            <span><code>{{ sel.package_mgr }}</code></span>
                          </div>
                        </div>

                        <h4>Detected services</h4>
                        <div class="php-services">
                          @for (s of sel.services; track s) {
                            <span class="php-service">{{ s }}</span>
                          }
                          @if (sel.services.length === 0) { <span class="php-empty">none</span> }
                        </div>

                        <h4>Project state</h4>
                        <div class="php-state-grid">
                          <span class="php-state" [class.ok]="sel.has_env" [class.warn]="!sel.has_env">.env {{ sel.has_env ? '✓' : '⚠' }}</span>
                          <span class="php-state" [class.ok]="sel.has_env_example">env.example {{ sel.has_env_example ? '✓' : '—' }}</span>
                          <span class="php-state" [class.ok]="sel.has_vendor" [class.warn]="!sel.has_vendor">vendor/ {{ sel.has_vendor ? '✓' : '⚠' }}</span>
                          <span class="php-state" [class.ok]="sel.has_composer_lock">composer.lock {{ sel.has_composer_lock ? '✓' : '—' }}</span>
                          <span class="php-state" [class.ok]="sel.has_node_modules">node_modules/ {{ sel.has_node_modules ? '✓' : '—' }}</span>
                          <span class="php-state" [class.ok]="sel.has_package_lock">package-lock {{ sel.has_package_lock ? '✓' : '—' }}</span>
                        </div>

                        @if (phpScripts(); as scr) {
                          @if (scr.composer_scripts.length > 0) {
                            <h4>composer scripts <span class="php-grid-meta">({{ scr.composer_scripts.length }})</span></h4>
                            <div class="php-script-grid">
                              @for (s of scr.composer_scripts; track s.name) {
                                <button class="php-script-card" (click)="runPHPScript(sel.path, 'composer', {name: s.name})" [title]="s.command">
                                  <span class="php-script-name">{{ s.name }}</span>
                                  @if (s.lines > 1) { <span class="php-script-lines">+{{ s.lines - 1 }}</span> }
                                  <span class="php-script-cmd">{{ s.command }}</span>
                                </button>
                              }
                            </div>
                          }
                          @if (scr.artisan_scripts.length > 0) {
                            <h4>artisan <span class="php-grid-meta">({{ scr.artisan_scripts.length }} canonical)</span></h4>
                            <div class="php-script-grid">
                              @for (s of scr.artisan_scripts; track s.name) {
                                <button class="php-script-card" (click)="runPHPScript(sel.path, 'artisan', {args: s.artisan_args})" [title]="s.command">
                                  <span class="php-script-name">{{ s.name }}</span>
                                  <span class="php-script-cmd">{{ s.command }}</span>
                                </button>
                              }
                            </div>
                          }
                          <div class="php-hint">Click any script — runs in <code>{{ sel.path }}</code> and auto-jumps to /process.</div>
                        } @else if (phpScriptsLoading()) {
                          <div class="php-hint">Loading scripts…</div>
                        }
                      </div>
                    } @else if (!phpLoading()) {
                      <div class="php-empty-pane">No project selected.</div>
                    }
                  </div>
                </div>
              </section>
            }
            @case ('devops') {
              <section class="block dvo-block">
                <div class="block-header dvo-header">
                  <h2 class="block-title">DevOps</h2>
                  <span class="editorial subtitle">Secret scanning + Ansible playbooks · Surface over <code>core/go-devops</code>.</span>
                </div>
                <div class="dvo-toolbar">
                  <div class="dvo-tabs">
                    <button class="dvo-tab" [class.active]="devopsTab() === 'secrets'" (click)="devopsTab.set('secrets')">
                      Secrets <span class="dvo-tab-count">{{ devopsFindings().length || '—' }}</span>
                    </button>
                    <button class="dvo-tab" [class.active]="devopsTab() === 'playbooks'" (click)="devopsTab.set('playbooks')">
                      Playbooks <span class="dvo-tab-count">{{ devopsPlaybooks().length }}</span>
                    </button>
                  </div>
                </div>

                <div class="dvo-body">
                  @if (devopsTab() === 'secrets') {
                    <div class="dvo-scan-controls">
                      <select class="dvo-input" [value]="devopsScanner()" (change)="devopsScanner.set($any($event.target).value)">
                        <option value="regex">regex (built-in, no deps)</option>
                        <option value="gitleaks">gitleaks (~150 patterns, requires binary)</option>
                      </select>
                      <span class="dvo-target">target: <code>{{ workspaceRoot() }}</code></span>
                      <button class="btn btn-primary btn-sm" (click)="runDevopsSecretScan()" [disabled]="devopsScanRunning()">
                        @if (devopsScanRunning()) { <span>scanning…</span> } @else { <span>Scan</span> }
                      </button>
                    </div>
                    @if (devopsScanError(); as err) {
                      <div class="dvo-error">{{ err }}</div>
                    }
                    @if (devopsRules().length > 0) {
                      <div class="dvo-rule-summary">
                        @for (r of devopsRules(); track r.rule) {
                          <span class="dvo-rule-pill">{{ r.rule }} <span class="dvo-rule-count">{{ r.count }}</span></span>
                        }
                      </div>
                    }
                    <div class="dvo-findings">
                      @for (f of devopsFindings(); track $index) {
                        <button class="dvo-finding" (click)="openDevopsFinding(f)">
                          <span class="dvo-rule">{{ f.rule }}</span>
                          <span class="dvo-file"><code>{{ f.file }}</code><span class="dvo-line">:{{ f.line }}</span></span>
                          <span class="dvo-snippet"><code>{{ f.snippet }}</code></span>
                        </button>
                      }
                      @if (devopsFindings().length === 0 && !devopsScanRunning() && !devopsScanError()) {
                        <div class="dvo-empty">No scan run yet — click Scan.</div>
                      }
                    </div>
                  } @else {
                    @if (devopsPlaybooksLoading()) {
                      <div class="dvo-empty">Loading playbooks…</div>
                    } @else if (devopsPlaybooks().length === 0) {
                      <div class="dvo-empty">No playbooks found in ~/Code/DevOps/playbooks/ or core/go-devops/playbooks/.</div>
                    } @else {
                      <table class="dvo-table">
                        <thead><tr><th>name</th><th>description</th><th>size</th><th>root</th></tr></thead>
                        <tbody>
                          @for (p of devopsPlaybooks(); track p.path) {
                            <tr class="dvo-row" (click)="openPlaybook(p)">
                              <td><code>{{ p.name }}</code></td>
                              <td>{{ p.description || '—' }}</td>
                              <td><code>{{ p.size_bytes }}b</code></td>
                              <td><code>{{ p.root }}</code></td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    }
                  }
                </div>
              </section>
            }
            @case ('forge') {
              <section class="block frg-block">
                <div class="block-header frg-header">
                  <h2 class="block-title">Forge</h2>
                  <span class="editorial subtitle">
                    @if (forgeStatus()?.authenticated) {
                      <code>{{ forgeStatus()?.base }}</code> · authenticated as <strong>{{ forgeStatus()?.as }}</strong>
                    } @else if (forgeStatus()?.configured) {
                      <code>{{ forgeStatus()?.base }}</code> · token rejected — see status hint
                    } @else {
                      No forge token configured. Set FORGE_TOKEN env or write to ~/.claude/secrets/forge_token.
                    }
                  </span>
                </div>
                @if (forgeError(); as err) {
                  <div class="frg-error">{{ err }}</div>
                }
                @if (forgeStatus()?.hint) {
                  <div class="frg-hint">{{ forgeStatus()?.hint }}</div>
                }

                <div class="frg-body">
                  <div class="frg-orgs-side">
                    <h3>Orgs</h3>
                    @for (o of forgeOrgs(); track o.name) {
                      <button class="frg-org-row" [class.active]="forgeSelectedOrg() === o.name" (click)="loadForgeRepos(o.name)">
                        {{ o.name }}
                      </button>
                    }
                    <h3 style="margin-top: 14px;">Notifications</h3>
                    @for (n of forgeNotifications().slice(0, 8); track n.id) {
                      <a class="frg-note-row" [class.unread]="n.unread" [href]="n.url" target="_blank">
                        <span class="frg-note-type">{{ n.type }}</span>
                        <span class="frg-note-title">{{ n.title }}</span>
                        <span class="frg-note-repo">{{ n.repo }}</span>
                      </a>
                    }
                    @if (forgeNotifications().length === 0) {
                      <div class="frg-empty">No unread notifications.</div>
                    }
                  </div>

                  <div class="frg-main">
                    <div class="frg-repos-bar">
                      <span class="frg-org-label">{{ forgeSelectedOrg() || '—' }} · {{ forgeRepos().length }} repos</span>
                      <select class="frg-repo-picker" [value]="forgeSelectedRepo()" (change)="loadForgeRepo($any($event.target).value)">
                        <option value="">(pick a repo)</option>
                        @for (r of forgeRepos(); track r.name) {
                          <option [value]="r.name">{{ r.name }}</option>
                        }
                      </select>
                    </div>

                    @if (forgeSelectedRepo()) {
                      <div class="frg-tabs">
                        <button class="frg-tab" [class.active]="forgeTab() === 'issues'" (click)="forgeTab.set('issues')">Issues <span class="frg-tab-count">{{ forgeIssues().length }}</span></button>
                        <button class="frg-tab" [class.active]="forgeTab() === 'pulls'" (click)="forgeTab.set('pulls')">PRs <span class="frg-tab-count">{{ forgePulls().length }}</span></button>
                      </div>

                      @if (forgeTab() === 'issues') {
                        @if (forgeIssues().length === 0) {
                          <div class="frg-empty-pane">No open issues in {{ forgeSelectedOrg() }}/{{ forgeSelectedRepo() }}</div>
                        } @else {
                          <table class="frg-table">
                            <thead><tr><th>#</th><th>title</th><th>state</th><th>author</th><th>updated</th></tr></thead>
                            <tbody>
                              @for (i of forgeIssues(); track i.number) {
                                <tr>
                                  <td><a [href]="i.html_url" target="_blank"><code>#{{ i.number }}</code></a></td>
                                  <td class="frg-title">{{ i.title }}</td>
                                  <td><span class="frg-state {{ i.state }}">{{ i.state }}</span></td>
                                  <td><code>{{ i.author }}</code></td>
                                  <td><code>{{ i.updated_at | slice:0:10 }}</code></td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        }
                      } @else if (forgeTab() === 'pulls') {
                        @if (forgePulls().length === 0) {
                          <div class="frg-empty-pane">No open PRs.</div>
                        } @else {
                          <table class="frg-table">
                            <thead><tr><th>#</th><th>title</th><th>state</th><th>head→base</th><th>author</th><th>updated</th></tr></thead>
                            <tbody>
                              @for (p of forgePulls(); track p.number) {
                                <tr>
                                  <td><a [href]="p.html_url" target="_blank"><code>#{{ p.number }}</code></a></td>
                                  <td class="frg-title">{{ p.title }}@if (p.draft) { <span class="frg-draft">draft</span> }</td>
                                  <td><span class="frg-state {{ p.state }}">{{ p.state }}</span></td>
                                  <td><code>{{ p.head }}→{{ p.base }}</code></td>
                                  <td><code>{{ p.author }}</code></td>
                                  <td><code>{{ p.updated_at | slice:0:10 }}</code></td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        }
                      }
                    } @else {
                      <div class="frg-empty-pane">Pick a repo to view its issues + PRs.</div>
                    }
                  </div>
                </div>
              </section>
            }
            @case ('tenant') {
              <section class="block tnt-block">
                <div class="block-header tnt-header">
                  <h2 class="block-title">Tenant</h2>
                  <span class="editorial subtitle">Multi-tenancy + entitlements over <code>core/go-tenant</code> · PHP-API consumer with local cache.</span>
                </div>

                @if (tenantStatus(); as status) {
                  <div class="tnt-status" [class.online]="status.online" [class.offline]="!status.online">
                    <div class="tnt-status-row">
                      <span class="tnt-status-pill">{{ status.online ? 'online' : 'offline' }}</span>
                      <span class="tnt-status-detail">
                        @if (status.online) { Connected to <code>{{ status.api_url }}</code> }
                        @else if (status.registered) { Service registered — no PHP API configured }
                        @else { Service not registered }
                      </span>
                      <button class="btn btn-ghost btn-sm" (click)="loadTenantStatus()">Refresh</button>
                    </div>
                    <div class="tnt-status-hint">{{ status.hint }}</div>
                  </div>
                }

                <div class="tnt-body">
                  <div class="tnt-card">
                    <h3>Workspace lookup</h3>
                    <div class="tnt-form-row">
                      <input class="tnt-input" type="text" placeholder="workspace slug (e.g. lethean)"
                             [value]="tenantWorkspaceLookup()"
                             (input)="tenantWorkspaceLookup.set($any($event.target).value)"
                             (keyup.enter)="tenantLookupWorkspace()" />
                      <button class="btn btn-primary btn-sm" (click)="tenantLookupWorkspace()">Lookup</button>
                    </div>
                    @if (tenantWorkspaceError(); as err) {
                      <div class="tnt-error">{{ err }}</div>
                    }
                    @if (tenantWorkspaceResult(); as ws) {
                      <pre class="tnt-result">{{ formatLocaleContent(ws) }}</pre>
                    }
                  </div>

                  <div class="tnt-card">
                    <h3>Authenticated user</h3>
                    <button class="btn btn-ghost btn-sm" (click)="tenantLookupUser()">Get user</button>
                    @if (tenantUserResult(); as user) {
                      <pre class="tnt-result">{{ formatLocaleContent(user) }}</pre>
                    }
                  </div>

                  <div class="tnt-card">
                    <h3>Entitlement check (Can)</h3>
                    <div class="tnt-form-grid">
                      <label>
                        <span>Workspace slug</span>
                        <input class="tnt-input" type="text" [value]="tenantCanForm().workspace" (input)="tenantCanField('workspace', $any($event.target).value)" />
                      </label>
                      <label>
                        <span>Feature code</span>
                        <input class="tnt-input" type="text" [value]="tenantCanForm().feature" (input)="tenantCanField('feature', $any($event.target).value)" placeholder="pages / api_calls / models" />
                      </label>
                      <label>
                        <span>Quantity</span>
                        <input class="tnt-input num" type="number" min="1" [value]="tenantCanForm().quantity" (input)="tenantCanField('quantity', $any($event.target).value)" />
                      </label>
                    </div>
                    <button class="btn btn-primary btn-sm" (click)="runTenantCan()">Check entitlement</button>
                    @if (tenantCanError(); as err) {
                      <div class="tnt-error">{{ err }}</div>
                    }
                    @if (tenantCanResult(); as r) {
                      <div class="tnt-can-result" [class.allowed]="r.allowed" [class.denied]="!r.allowed">
                        <div class="tnt-can-verdict">
                          <span class="tnt-can-pill">{{ r.allowed ? 'ALLOW' : 'DENY' }}</span>
                          <span>{{ r.feature }} × {{ tenantCanForm().quantity }} on {{ r.workspace }}</span>
                        </div>
                        @if (r.reason) { <div class="tnt-can-reason">{{ r.reason }}</div> }
                        @if (r.used !== undefined || r.limit !== undefined) {
                          <div class="tnt-can-meta">used {{ r.used ?? '—' }} / limit {{ r.limit ?? '∞' }}{{ r.remaining !== undefined ? ' · remaining ' + r.remaining : '' }}</div>
                        }
                      </div>
                    }
                  </div>
                </div>
              </section>
            }
            @case ('store') {
              <section class="block str-block">
                <div class="block-header str-header">
                  <h2 class="block-title">Store</h2>
                  <span class="editorial subtitle">SQLite KV store + ~/.core/* config files. The IDE's persistent layer surfaced.</span>
                </div>
                <div class="str-toolbar">
                  <div class="str-tabs">
                    <button class="str-tab" [class.active]="storeTab() === 'groups'" (click)="storeTab.set('groups')">
                      KV Groups <span class="str-tab-count">{{ storeGroups().length }}</span>
                    </button>
                    <button class="str-tab" [class.active]="storeTab() === 'files'" (click)="storeTab.set('files')">
                      Files <span class="str-tab-count">{{ storeFiles().length }}</span>
                    </button>
                  </div>
                  <button class="btn btn-ghost btn-sm" (click)="loadStore()">Refresh</button>
                </div>

                <div class="str-body">
                  @if (storeTab() === 'groups') {
                    <div class="str-side">
                      <h3>Namespaces ({{ storeGroups().length }})</h3>
                      @if (storeGroups().length === 0) {
                        <div class="str-empty">No KV namespaces. Store may be empty.</div>
                      }
                      @for (g of storeGroups(); track g.name) {
                        <button class="str-row"
                                [class.active]="storeSelectedGroup() === g.name"
                                (click)="selectStoreGroup(g.name)">
                          <span class="str-name">{{ g.name }}</span>
                          <span class="str-count">{{ g.count }}</span>
                        </button>
                      }
                    </div>
                    <div class="str-main">
                      @if (storeSelectedGroup(); as group) {
                        <div class="str-group-head">{{ group }} · {{ storeEntries().length }} entries</div>
                        @if (storeEntries().length === 0) {
                          <div class="str-empty-pane">Empty namespace.</div>
                        } @else {
                          <table class="str-table">
                            <thead><tr><th>key</th><th>value</th><th class="str-actions">·</th></tr></thead>
                            <tbody>
                              @for (e of storeEntries(); track e.key) {
                                <tr>
                                  <td><code>{{ e.key }}</code></td>
                                  <td><code>{{ e.value.length > 200 ? e.value.slice(0, 200) + '…' : e.value }}</code></td>
                                  <td class="str-actions">
                                    <button class="btn btn-ghost btn-sm" (click)="deleteStoreEntry(group, e.key)" title="Delete entry">×</button>
                                  </td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        }
                      } @else {
                        <div class="str-empty-pane">Pick a namespace to view its entries.</div>
                      }
                    </div>
                  } @else {
                    <div class="str-side str-files-side">
                      <h3>Config files ({{ storeFiles().length }})</h3>
                      @for (f of storeFiles(); track f.path) {
                        <button class="str-row"
                                [class.active]="storeSelectedFile()?.path === f.path"
                                (click)="selectStoreFile(f)">
                          <span class="str-file-name">{{ f.rel }}</span>
                          <span class="str-file-meta">{{ f.size_bytes }}b · {{ f.ext.replace('.','') }}</span>
                        </button>
                      }
                    </div>
                    <div class="str-main">
                      @if (storeSelectedFile(); as f) {
                        <div class="str-file-head">
                          <code class="str-file-path">{{ f.path }}</code>
                          <button class="btn btn-ghost btn-sm" (click)="openStoreFileInEditor(f)">Open in editor</button>
                        </div>
                        <pre class="str-file-preview">{{ f.preview }}</pre>
                      } @else {
                        <div class="str-empty-pane">Pick a file to preview.</div>
                      }
                    </div>
                  }
                </div>
              </section>
            }
            @case ('data') {
              <section class="block data-block">
                <div class="block-header data-header">
                  <h2 class="block-title">Data</h2>
                  <span class="editorial subtitle">Live ORM bridge over <code>core/orm</code> · Memium-backed v1 demo. Same dispatch path swaps to DuckDB / Postgres / Borg under the hood.</span>
                </div>
                @if (ormError(); as err) {
                  <div class="data-error">{{ err }}</div>
                }
                <div class="data-body">
                  <div class="data-tables-side">
                    <h3>Backend</h3>
                    <div class="data-backend-picker">
                      <button class="data-backend-btn" [class.active]="ormBackend().current === 'memium'" (click)="switchOrmBackend('memium')">
                        <span class="data-backend-name">Memium</span>
                        <span class="data-backend-meta">in-memory</span>
                      </button>
                      <button class="data-backend-btn" [class.active]="ormBackend().current === 'duckdb'" (click)="switchOrmBackend('duckdb')">
                        <span class="data-backend-name">DuckDB</span>
                        <span class="data-backend-meta">persistent</span>
                      </button>
                    </div>
                    @if (ormBackend().current === 'duckdb' && ormBackend().duck_path) {
                      <div class="data-backend-path"><code>{{ ormBackend().duck_path }}</code></div>
                    }

                    <h3 style="margin-top: 16px;">Tables</h3>
                    @for (t of ormTables(); track t.name) {
                      <button class="data-table-row" [class.active]="ormSelectedTable() === t.name" (click)="selectOrmTable(t.name)">
                        <span class="data-table-name">{{ t.name }}</span>
                        <span class="data-table-meta">{{ t.backend }} · pk: {{ t.pk.join(',') }}</span>
                      </button>
                    }
                  </div>

                  <div class="data-main">
                    @if (ormSelectedTable(); as tbl) {
                      <div class="data-toolbar">
                        <span class="data-count">{{ ormCount() }} rows in <strong>{{ tbl }}</strong></span>
                        <button class="btn btn-ghost btn-sm" (click)="refreshOrmRows()" [disabled]="ormLoading()">Refresh</button>
                      </div>

                      @if (ormTableSpec(tbl); as spec) {
                        <div class="data-form">
                          <h4>Insert row</h4>
                          <div class="data-form-grid">
                            @for (f of spec.fields; track f) {
                              @if (f !== 'id' && f !== 'created_at') {
                                <label class="data-form-label">
                                  <span>{{ f }}</span>
                                  <input class="data-input" type="text"
                                         [value]="ormDraftRow()[f] || ''"
                                         (input)="ormDraftField(f, $any($event.target).value)" />
                                </label>
                              }
                            }
                          </div>
                          <button class="btn btn-primary btn-sm" (click)="saveOrmDraft()">+ Save</button>
                          <span class="data-hint">id auto-assigned · created_at auto-stamped</span>
                        </div>
                      }

                      @if (ormRows().length === 0) {
                        <div class="data-empty">No rows.</div>
                      } @else {
                        <div class="data-grid-wrap">
                          <table class="data-grid">
                            <thead>
                              <tr>
                                @for (f of ormTableFields(tbl); track f) {
                                  <th>{{ f }}</th>
                                }
                                <th class="data-actions-col">·</th>
                              </tr>
                            </thead>
                            <tbody>
                              @for (r of ormRows(); track $index) {
                                <tr>
                                  @for (f of ormTableFields(tbl); track f) {
                                    <td><code>{{ r[f] }}</code></td>
                                  }
                                  <td class="data-actions-col">
                                    <button class="btn btn-ghost btn-sm" (click)="deleteOrmRow(r, tbl)" title="Delete row">×</button>
                                  </td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        </div>
                      }
                    } @else {
                      <div class="data-empty">No table selected.</div>
                    }
                  </div>
                </div>
              </section>
            }
            @case ('locales') {
              <section class="block i18n-block">
                <div class="block-header i18n-header">
                  <h2 class="block-title">Locales</h2>
                  <span class="editorial subtitle">Translation coverage across the canon. Surface over <code>core/go-i18n</code>.</span>
                </div>
                <div class="i18n-toolbar">
                  <span class="i18n-meta">
                    {{ i18nPackages().length }} packages · {{ i18nUniqueLocales().length }} locales seen: {{ i18nUniqueLocales().join(', ') || '—' }}
                  </span>
                  <button class="btn btn-ghost btn-sm" (click)="scanLocales()" [disabled]="i18nLoading()">
                    @if (i18nLoading()) { <span>scanning…</span> } @else { <span>Re-scan</span> }
                  </button>
                </div>
                @if (i18nError(); as err) {
                  <div class="i18n-error">{{ err }}</div>
                }
                <div class="i18n-body">
                  <div class="i18n-matrix">
                    <table>
                      <thead>
                        <tr>
                          <th class="i18n-pkg-col">Package</th>
                          <th class="i18n-baseline-col">en keys</th>
                          @for (loc of i18nUniqueLocales(); track loc) {
                            <th>{{ loc }}</th>
                          }
                        </tr>
                      </thead>
                      <tbody>
                        @for (p of i18nPackages(); track p.code) {
                          <tr>
                            <td class="i18n-pkg-name">{{ p.code }}</td>
                            <td class="i18n-baseline">{{ p.baseline_keys || '—' }}</td>
                            @for (loc of i18nUniqueLocales(); track loc) {
                              @if (i18nFindLocale(p, loc); as cell) {
                                <td class="i18n-cell present"
                                    [class.complete]="cell.missing_vs_en === 0"
                                    [class.partial]="cell.missing_vs_en > 0 && cell.keys < p.baseline_keys"
                                    [class.over]="cell.keys > p.baseline_keys && p.baseline_keys > 0"
                                    [class.active]="i18nSelectedCell()?.pkg === p.code && i18nSelectedCell()?.locale === loc"
                                    (click)="openLocaleCell(p.code, loc, cell.path)">
                                  <span class="i18n-cell-keys">{{ cell.keys }}</span>
                                  @if (cell.missing_vs_en > 0) {
                                    <span class="i18n-cell-gap">−{{ cell.missing_vs_en }}</span>
                                  } @else if (p.baseline_keys > 0 && cell.keys > p.baseline_keys) {
                                    <span class="i18n-cell-extra">+{{ cell.keys - p.baseline_keys }}</span>
                                  }
                                </td>
                              } @else {
                                <td class="i18n-cell missing">—</td>
                              }
                            }
                          </tr>
                        }
                        @if (i18nPackages().length === 0 && !i18nLoading()) {
                          <tr><td [attr.colspan]="2 + i18nUniqueLocales().length" class="i18n-empty">No locales found in workspace.</td></tr>
                        }
                      </tbody>
                    </table>
                  </div>

                  @if (i18nSelectedCell(); as sel) {
                    <div class="i18n-viewer">
                      <div class="i18n-viewer-head">
                        <span class="i18n-viewer-title">{{ sel.pkg }} · <strong>{{ sel.locale }}</strong></span>
                        <code class="i18n-viewer-path">{{ sel.path }}</code>
                      </div>
                      <pre class="i18n-viewer-body">{{ formatLocaleContent(i18nViewContent()) }}</pre>
                    </div>
                  }
                </div>
              </section>
            }
            @case ('updates') {
              <section class="block upd-block">
                <div class="block-header upd-header">
                  <h2 class="block-title">Updates</h2>
                  <span class="editorial subtitle">core-ide self-update + tool version tracking.</span>
                </div>
                @if (selfUpdate()) {
                  <div class="self-upd-card" [class.self-upd-card--update]="selfUpdate()?.update_available">
                    <div class="self-upd-row">
                      <div class="self-upd-icon">
                        @if (selfUpdate()?.update_available) {
                          <span title="Update available">⬇</span>
                        } @else if (selfUpdate()?.error) {
                          <span title="No release endpoint or fetch error">·</span>
                        } @else {
                          <span title="Up to date">✓</span>
                        }
                      </div>
                      <div class="self-upd-body">
                        <div class="self-upd-title">core-ide</div>
                        <div class="self-upd-meta">
                          current <code>{{ selfUpdate()?.current_version }}</code>
                          @if (selfUpdate()?.latest_version) {
                            · latest <a [href]="selfUpdate()?.release_url" target="_blank"><code>{{ selfUpdate()?.latest_version }}</code></a>
                          } @else if (selfUpdate()?.error) {
                            · <span class="self-upd-err">no release: {{ selfUpdate()?.error }}</span>
                          }
                          · channel <code>{{ selfUpdate()?.channel }}</code>
                          · {{ selfUpdate()?.platform }}
                        </div>
                        <div class="self-upd-meta self-upd-source">
                          source: <a [href]="selfUpdate()?.repo_url" target="_blank">{{ selfUpdate()?.repo_url }}</a>
                          <span class="self-upd-hint"> · override via <code>CORE_IDE_UPDATE_URL</code></span>
                        </div>
                      </div>
                      <div class="self-upd-actions">
                        <button class="btn btn-ghost btn-sm" (click)="loadSelfUpdate()" [disabled]="selfUpdateLoading()" title="Re-check">
                          @if (selfUpdateLoading()) { <span>…</span> } @else { <span>↻</span> }
                        </button>
                        @if (selfUpdate()?.update_available) {
                          <button class="btn btn-primary btn-sm" (click)="applySelfUpdate()" [disabled]="selfUpdateApplying()">
                            @if (selfUpdateApplying()) { <span>updating…</span> } @else { <span>Update</span> }
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
                <div class="upd-toolbar">
                  <span class="upd-summary">
                    @if (updatesNeedingAttention().length === 0) {
                      <span class="upd-allgood">✓ all installed tools up to date</span>
                    } @else {
                      <span class="upd-attn">⚠ {{ updatesNeedingAttention().length }} update{{ updatesNeedingAttention().length > 1 ? 's' : '' }} available</span>
                    }
                  </span>
                  <button class="btn btn-ghost btn-sm" (click)="refreshAllUpdates()" [disabled]="updatesLoading()">
                    @if (updatesLoading()) { <span>checking…</span> } @else { <span>Refresh all</span> }
                  </button>
                </div>
                <div class="upd-body">
                  <table class="upd-table">
                    <thead>
                      <tr>
                        <th>tool</th>
                        <th>local</th>
                        <th>latest</th>
                        <th>status</th>
                        <th class="upd-actions-col">·</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (t of updatesTools(); track t.key) {
                        <tr [class.upd-needs]="t.installed && !t.up_to_date && t.latest_version">
                          <td>
                            <div class="upd-name">{{ t.name }}</div>
                            <div class="upd-desc">{{ t.description }}</div>
                          </td>
                          <td>
                            @if (t.installed) {
                              <code>{{ t.local_version || '?' }}</code>
                            } @else {
                              <span class="upd-missing">not installed</span>
                            }
                          </td>
                          <td>
                            @if (t.latest_version) {
                              <a [href]="t.latest_url" target="_blank"><code>{{ t.latest_version }}</code></a>
                            } @else {
                              <span class="upd-unknown">—</span>
                            }
                          </td>
                          <td>
                            @if (!t.installed) {
                              <span class="upd-pill missing">missing</span>
                            } @else if (t.up_to_date) {
                              <span class="upd-pill ok">up to date</span>
                            } @else if (t.latest_version) {
                              <span class="upd-pill warn">update available</span>
                            } @else {
                              <span class="upd-pill unknown">no source</span>
                            }
                          </td>
                          <td class="upd-actions-col">
                            <button class="btn btn-ghost btn-sm" (click)="refreshUpdate(t.key)" title="Re-check this tool">↻</button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            }
            @case ('memory') {
              <section class="block mem-block">
                <div class="block-header mem-header">
                  <h2 class="block-title">Memory</h2>
                  <span class="editorial subtitle">Auto-memory at <code>{{ memoryDir() || '~/.claude/projects/.../memory/' }}</code> · {{ memoryEntries().length }} entries.</span>
                </div>
                @if (memoryRecent().length > 0) {
                  <div class="mem-recent-strip">
                    <div class="mem-recent-label">recent · last 7 days</div>
                    <div class="mem-recent-row">
                      @for (m of memoryRecent(); track m.path) {
                        <button class="mem-recent-pill" (click)="openMemoryEntry(m.path)" [title]="m.name + ' · ' + (m.description || '')">
                          <span class="mem-recent-type" [attr.data-type]="m.type || 'untyped'">{{ m.type || '?' }}</span>
                          <span class="mem-recent-name">{{ m.name.slice(0, 50) }}</span>
                          <span class="mem-recent-when">{{ formatRelative(m.modified) }}</span>
                        </button>
                      }
                    </div>
                  </div>
                }
                <div class="mem-toolbar">
                  <input class="input mem-filter" placeholder="filter (frontmatter) — Enter for full-text…" [value]="memoryFilter()" (input)="memoryFilter.set($any($event.target).value)" (keyup.enter)="runMemorySearch(memoryFilter())" />
                  @if (memorySearchActive()) {
                    <button class="btn btn-ghost btn-sm" (click)="exitMemorySearch()" title="Back to filter mode">× exit search</button>
                  }
                  <div class="mem-type-pills">
                    <button class="mem-type-pill" [class.active]="memoryTypeFilter() === null" (click)="memoryTypeFilter.set(null)">all <span class="mem-type-count">{{ memoryEntries().length }}</span></button>
                    @for (t of memoryTypeEntries(); track t.type) {
                      <button class="mem-type-pill" [class.active]="memoryTypeFilter() === t.type" (click)="memoryTypeFilter.set(t.type)">
                        {{ t.type }} <span class="mem-type-count">{{ t.count }}</span>
                      </button>
                    }
                  </div>
                  <select class="input mem-sort" [value]="memorySort()" (change)="memorySort.set($any($event.target).value); loadMemoryEntries()">
                    <option value="modified">sort: modified</option>
                    <option value="name">sort: name</option>
                    <option value="type">sort: type</option>
                  </select>
                </div>
                <div class="mem-body">
                  @if (memorySearchActive()) {
                    @if (memorySearchLoading()) {
                      <div class="mem-empty">Searching memory contents…</div>
                    } @else {
                      <div class="mem-list-summary">{{ memorySearchHits().length }} content matches for "{{ memoryFilter() }}"</div>
                      @for (h of memorySearchHits(); track $index) {
                        <button class="mem-search-hit" (click)="openMemoryEntry(h.path, h.line)" [title]="h.path + ':' + h.line">
                          <div class="mem-search-head">
                            @if (h.memory_type) {
                              <span class="mem-row-type" [attr.data-type]="h.memory_type">{{ h.memory_type }}</span>
                            }
                            <span class="mem-search-name">{{ h.memory_name || h.filename }}</span>
                            <span class="mem-search-line"><code>:{{ h.line }}</code></span>
                          </div>
                          <pre class="mem-search-match">{{ h.match }}</pre>
                        </button>
                      }
                    }
                  } @else if (memoryLoading() && memoryEntries().length === 0) {
                    <div class="mem-empty">Loading memories…</div>
                  } @else {
                    <div class="mem-list-summary">{{ memoryVisible().length }} matching</div>
                    @for (m of memoryVisible(); track m.path) {
                      <button class="mem-row" (click)="openMemoryEntry(m.path)" [title]="m.path">
                        <span class="mem-row-type" [attr.data-type]="m.type || 'untyped'">{{ m.type || 'untyped' }}</span>
                        <div class="mem-row-body">
                          <div class="mem-row-name">{{ m.name }}</div>
                          @if (m.description) {
                            <div class="mem-row-desc">{{ m.description }}</div>
                          }
                          <div class="mem-row-meta">
                            <code>{{ m.filename }}</code>
                            <span class="mem-row-size">· {{ m.size > 1024 ? (m.size / 1024 | number:'1.0-1') + 'k' : m.size + 'B' }}</span>
                            @if (m.modified) {
                              <span class="mem-row-mod">· {{ m.modified.slice(0, 10) }}</span>
                            }
                          </div>
                        </div>
                      </button>
                    }
                  }
                </div>
              </section>
            }
            @case ('stream') {
              <section class="block stream-block">
                <div class="block-header stream-header">
                  <h2 class="block-title">Stream</h2>
                  <span class="editorial subtitle">go-stream Hub inspector · in-process pub/sub.</span>
                </div>
                @if (streamStatus(); as st) {
                  <div class="stream-status-grid">
                    <div class="stream-stat">
                      <div class="stream-stat-label">running</div>
                      <div class="stream-stat-value" [class.stream-ok]="st.running" [class.stream-warn]="!st.running">
                        {{ st.running ? '✓ yes' : '· starting' }}
                      </div>
                    </div>
                    <div class="stream-stat">
                      <div class="stream-stat-label">peers</div>
                      <div class="stream-stat-value">{{ st.peer_count }}</div>
                    </div>
                    <div class="stream-stat">
                      <div class="stream-stat-label">channels</div>
                      <div class="stream-stat-value">{{ st.channel_count }}</div>
                    </div>
                    <div class="stream-stat">
                      <div class="stream-stat-label">heartbeat</div>
                      <div class="stream-stat-value">{{ st.config.heartbeat_ms / 1000 }}s</div>
                    </div>
                  </div>
                }
                <div class="stream-body">
                  <aside class="stream-channels">
                    <div class="stream-list-title">Channels ({{ streamChannels().length }})</div>
                    <button class="stream-channel-row" [class.active]="streamSelectedChannel() === null" (click)="loadStreamFrames(null)">
                      <span class="stream-channel-name"><em>(broadcast)</em></span>
                      <span class="stream-channel-meta">{{ streamBroadcastBufCount() }} fr</span>
                    </button>
                    @for (c of streamChannels(); track c.name) {
                      <button class="stream-channel-row" [class.active]="streamSelectedChannel() === c.name" (click)="loadStreamFrames(c.name)">
                        <span class="stream-channel-name">{{ c.name }}</span>
                        <span class="stream-channel-meta">
                          <span title="subscribers">{{ c.subscriber_count }} sub</span>
                          <span title="recent frames">· {{ c.recent_frames }} fr</span>
                        </span>
                      </button>
                    }
                    @if (streamChannels().length === 0) {
                      <div class="stream-empty">No channels yet — publish below to seed.</div>
                    }
                  </aside>
                  <main class="stream-frames">
                    <div class="stream-list-title">
                      Frames {{ streamSelectedChannel() ? '· ' + streamSelectedChannel() : '· (broadcast)' }}
                      <button class="btn btn-ghost btn-sm stream-refresh" (click)="loadStream()" [disabled]="streamLoading()">↻</button>
                    </div>
                    @if (streamFrames().length === 0) {
                      <div class="stream-empty">No frames captured for this channel yet.</div>
                    } @else {
                      <div class="stream-frame-list">
                        @for (f of streamFrames(); track $index; let i = $index) {
                          @let parsed = parseStreamFrame(f);
                          @let raw = streamFrameRawMode().has(i);
                          <div class="stream-frame" [class.stream-frame-json]="parsed.isJson">
                            <div class="stream-frame-head">
                              <span class="stream-frame-time">{{ f.timestamp.slice(11, 19) }}</span>
                              <span class="stream-frame-bytes">{{ f.frame_bytes }}B</span>
                              @if (parsed.isJson) {
                                <span class="stream-frame-tag">json</span>
                                <button class="stream-frame-toggle" (click)="toggleStreamFrameRaw(i)">{{ raw ? 'pretty' : 'raw' }}</button>
                              }
                              @if (parsed.clickablePath; as p) {
                                <button class="stream-frame-jump" (click)="openStreamFramePath(p)" [title]="'Open ' + p">↗ {{ p.split('/').slice(-2).join('/') }}</button>
                              }
                            </div>
                            @if (parsed.isJson && !raw) {
                              <pre class="stream-frame-pretty">{{ parsed.pretty }}</pre>
                            } @else {
                              <span class="stream-frame-text">{{ parsed.raw }}</span>
                            }
                          </div>
                        }
                      </div>
                    }
                  </main>
                </div>
                <div class="stream-publish">
                  <div class="stream-list-title">Publish test frame</div>
                  <div class="stream-publish-row">
                    <select class="input stream-mode-select" [value]="streamPublishMode()" (change)="streamPublishMode.set($any($event.target).value)">
                      <option value="publish">publish</option>
                      <option value="broadcast">broadcast</option>
                    </select>
                    @if (streamPublishMode() === 'publish') {
                      <input class="input stream-channel-input" placeholder="channel name" [value]="streamPublishChannel()" (input)="streamPublishChannel.set($any($event.target).value)" />
                    }
                    <input class="input stream-frame-input" placeholder="frame body (text or json)" [value]="streamPublishBody()" (input)="streamPublishBody.set($any($event.target).value)" (keyup.enter)="publishStreamFrame()" />
                    <button class="btn btn-primary btn-sm" (click)="publishStreamFrame()">Publish</button>
                  </div>
                </div>
              </section>
            }
            @case ('sessions') {
              <section class="block sess-block">
                <div class="block-header sess-header">
                  <h2 class="block-title">Sessions</h2>
                  <span class="editorial subtitle">Claude Code transcript inspector · {{ sessionProjects().length }} projects.</span>
                </div>
                <div class="sess-tabs">
                  <button class="sess-tab" [class.active]="sessionTab() === 'browse'" (click)="sessionTab.set('browse')">Browse</button>
                  <button class="sess-tab" [class.active]="sessionTab() === 'active'" (click)="sessionTab.set('active'); loadActiveSessions()">
                    Active
                    @if (sessionActive().length > 0) { <span class="sess-tab-count">{{ sessionActive().length }}</span> }
                  </button>
                  <button class="sess-tab" [class.active]="sessionTab() === 'search'" (click)="sessionTab.set('search')">Search</button>
                </div>
                @if (sessionTab() === 'browse') {
                <div class="sess-toolbar">
                  <input class="input sess-filter" placeholder="filter projects…" [value]="sessionFilter()" (input)="sessionFilter.set($any($event.target).value)" />
                  <button class="btn btn-ghost btn-sm" (click)="loadSessionProjects()" [disabled]="sessionLoading()">↻ refresh</button>
                </div>
                }
                @if (sessionTab() === 'active') {
                <div class="sess-toolbar">
                  <select class="input sess-filter" [value]="sessionActiveSinceMinutes()" (change)="sessionActiveSinceMinutes.set(+$any($event.target).value); loadActiveSessions()">
                    <option [value]="15">last 15 min</option>
                    <option [value]="60">last hour</option>
                    <option [value]="240">last 4 hours</option>
                    <option [value]="1440">last 24 hours</option>
                  </select>
                  <button class="btn btn-ghost btn-sm" (click)="loadActiveSessions()" [disabled]="sessionActiveLoading()">↻ refresh</button>
                </div>
                }
                @if (sessionTab() === 'search') {
                <div class="sess-toolbar">
                  <input class="input sess-filter" placeholder="search across sessions… (Enter)" [value]="sessionSearchQuery()" (input)="sessionSearchQuery.set($any($event.target).value)" (keyup.enter)="runSessionSearch()" />
                  <select class="input sess-filter" style="flex: 0 0 160px" [value]="sessionSearchScope()" (change)="sessionSearchScope.set($any($event.target).value)">
                    <option value="current">current project</option>
                    <option value="all">all projects</option>
                  </select>
                  <button class="btn btn-primary btn-sm" (click)="runSessionSearch()" [disabled]="sessionSearchLoading()">
                    @if (sessionSearchLoading()) { <span>searching…</span> } @else { <span>Search</span> }
                  </button>
                </div>
                }
                <div class="sess-body" [class.sess-active-mode]="sessionTab() === 'active' || sessionTab() === 'search'">
                  @if (sessionTab() === 'search') {
                    <aside class="sess-search-list">
                      <div class="sess-list-title">
                        Cross-session hits
                        @if (sessionSearchLoading()) { <span class="sess-spin">…</span> }
                      </div>
                      @if (sessionSearchHits().length === 0 && !sessionSearchLoading()) {
                        <div class="sess-empty">Type a query above and press Enter.</div>
                      }
                      @for (h of sessionSearchHits(); track $index) {
                        <button class="sess-search-hit" (click)="openSessionSearchHit(h)" [title]="'Open session ' + h.session_id">
                          <div class="sess-search-head">
                            <code class="sess-active-id">{{ h.session_id.slice(0, 8) }}</code>
                            <span class="sess-search-when">{{ h.timestamp.slice(0, 19).replace('T', ' ') }}</span>
                            @if (h.tool) { <span class="sess-search-tool">{{ h.tool }}</span> }
                          </div>
                          <pre class="sess-search-match">{{ h.match }}</pre>
                        </button>
                      }
                    </aside>
                  } @else if (sessionTab() === 'active') {
                    <aside class="sess-active-list">
                      <div class="sess-list-title">
                        Active sessions ({{ sessionActive().length }})
                        @if (sessionActiveLoading()) { <span class="sess-spin">…</span> }
                      </div>
                      @if (sessionActive().length === 0 && !sessionActiveLoading()) {
                        <div class="sess-empty">No sessions modified in the last {{ sessionActiveSinceMinutes() }}min.</div>
                      }
                      @for (a of sessionActive(); track a.path) {
                        <button class="sess-active-row" [class.active]="sessionSelected()?.path === a.path" (click)="openActiveSession(a)">
                          <div class="sess-active-head">
                            <code class="sess-active-id">{{ a.id.slice(0, 8) }}</code>
                            <span class="sess-active-age" [class.sess-active-fresh]="a.age_seconds < 60">{{ formatAge(a.age_seconds) }} ago</span>
                          </div>
                          <div class="sess-active-proj">{{ a.project_path }}</div>
                          <div class="sess-active-meta">
                            {{ a.size_bytes > 1024*1024 ? (a.size_bytes / 1048576 | number:'1.0-1') + 'M' : (a.size_bytes / 1024 | number:'1.0-0') + 'k' }}
                          </div>
                        </button>
                      }
                    </aside>
                  } @else {
                  <aside class="sess-projects">
                    <div class="sess-list-title">Projects ({{ sessionVisible().length }})</div>
                    @for (p of sessionVisible(); track p.name) {
                      <button class="sess-project-row" [class.active]="sessionSelectedProject() === p.path" (click)="selectSessionProject(p.path)">
                        <div class="sess-project-name" [title]="p.display_path">{{ p.display_path }}</div>
                        <div class="sess-project-meta">
                          <span>{{ p.session_count }} sess</span>
                          @if (p.latest_at) { <span>· {{ p.latest_at.slice(0, 10) }}</span> }
                        </div>
                      </button>
                    }
                  </aside>
                  <aside class="sess-list">
                    <div class="sess-list-title">
                      Sessions
                      @if (sessionLoading()) { <span class="sess-spin">…</span> }
                    </div>
                    @if (!sessionSelectedProject()) {
                      <div class="sess-empty">Pick a project to list its sessions.</div>
                    } @else if (sessions().length === 0 && !sessionLoading()) {
                      <div class="sess-empty">No sessions in this project.</div>
                    } @else {
                      @for (s of sessions(); track s.id) {
                        <button class="sess-row" [class.active]="sessionSelected()?.path === s.path" (click)="inspectSession(s.path)">
                          <div class="sess-row-id"><code>{{ s.id.slice(0, 8) }}</code></div>
                          <div class="sess-row-meta">
                            @if (s.start_time) { <span>{{ s.start_time.slice(5, 19).replace('T', ' ') }}</span> }
                            <span class="sess-row-size">{{ formatSessionSize(s.size_bytes) }}</span>
                          </div>
                        </button>
                      }
                    }
                  </aside>
                  }
                  <main class="sess-detail">
                    @if (!sessionSelected() && !sessionInspectLoading()) {
                      <div class="sess-empty">Pick a session to inspect.</div>
                    }
                    @if (sessionInspectLoading()) {
                      <div class="sess-empty">Parsing transcript…</div>
                    }
                    @if (sessionSelected(); as sel) {
                      <div class="sess-detail-head">
                        <div class="sess-detail-title">
                          <code>{{ sel.id }}</code>
                        </div>
                        <div class="sess-detail-sub">
                          {{ sel.start.slice(0, 19).replace('T', ' ') }} → {{ sel.end.slice(0, 19).replace('T', ' ') }}
                          · {{ sel.total_events }} events · duration {{ formatSessionDuration(sel.analytics?.duration_seconds || 0) }}
                          · {{ ((sel.analytics?.success_rate || 0) * 100).toFixed(1) }}% success
                        </div>
                      </div>
                      <div class="sess-stats-grid">
                        <div class="sess-stat">
                          <div class="sess-stat-label">events</div>
                          <div class="sess-stat-value">{{ sel.analytics?.event_count }}</div>
                        </div>
                        <div class="sess-stat">
                          <div class="sess-stat-label">active time</div>
                          <div class="sess-stat-value">{{ formatSessionDuration(sel.analytics?.active_seconds || 0) }}</div>
                        </div>
                        <div class="sess-stat">
                          <div class="sess-stat-label">in tokens</div>
                          <div class="sess-stat-value">{{ sel.analytics?.estimated_input_tokens?.toLocaleString() }}</div>
                        </div>
                        <div class="sess-stat">
                          <div class="sess-stat-label">out tokens</div>
                          <div class="sess-stat-value">{{ sel.analytics?.estimated_output_tokens?.toLocaleString() }}</div>
                        </div>
                      </div>
                      <div class="sess-tools-section">
                        <div class="sess-section-title">Tool counts</div>
                        <div class="sess-tools-grid">
                          @for (t of sessionToolEntries(sel.analytics?.tool_counts); track t.name) {
                            <div class="sess-tool-pill" [title]="(sel.analytics?.avg_latency_ms?.[t.name] || 0) + 'ms avg'">
                              <span class="sess-tool-name">{{ t.name }}</span>
                              <span class="sess-tool-count">{{ t.count }}</span>
                            </div>
                          }
                        </div>
                      </div>
                      <div class="sess-events-section">
                        <div class="sess-section-title">
                          Recent events
                          @if (sel.tail_offset > 0) { <span class="sess-tail-note">(showing last {{ sel.event_tail.length }} of {{ sel.total_events }})</span> }
                          <button class="btn btn-ghost btn-sm sess-live-toggle" [class.sess-live-active]="sessionLiveActive()" (click)="toggleSessionLive()" [title]="sessionLiveActive() ? 'Stop live polling' : 'Start polling for new events every 3s'">
                            @if (sessionLiveActive()) {
                              <span class="sess-live-pulse" [attr.data-tick]="sessionLiveHeartbeat() % 2"></span>
                              <span>live</span>
                            } @else {
                              <span>○ live</span>
                            }
                          </button>
                          @if (sessionLiveEvents().length > 0) {
                            <span class="sess-live-count">+{{ sessionLiveEvents().length }} new</span>
                          }
                          @if (sessionLiveDropped() > 0) {
                            <span class="sess-live-dropped" [title]="'Older events dropped to keep buffer at ' + 500">−{{ sessionLiveDropped() }} dropped</span>
                          }
                        </div>
                        <div class="sess-events-list">
                          @for (e of sel.event_tail; track $index) {
                            @let evPath = sessionEventPath(e);
                            <div class="sess-event" [class.sess-event-error]="!e.success && e.type === 'tool_use'" [class.sess-event-jumpable]="evPath !== null" (click)="evPath ? openSessionEventFile(e) : null" [title]="evPath ? 'Open ' + evPath + ' in editor' : ''">
                              <span class="sess-event-time">{{ e.timestamp.slice(11, 19) }}</span>
                              <span class="sess-event-type">{{ e.type }}</span>
                              @if (e.tool) { <span class="sess-event-tool">{{ e.tool }}</span> }
                              @if (e.duration_ms > 0) { <span class="sess-event-dur">{{ e.duration_ms }}ms</span> }
                              <span class="sess-event-input">{{ e.input }}</span>
                            </div>
                          }
                          @if (sessionLiveEvents().length > 0) {
                            <div class="sess-live-divider">live tail · {{ sessionLiveEvents().length }} events since toggle</div>
                            @for (e of sessionLiveEvents(); track $index) {
                              <div class="sess-event sess-event-live">
                                <span class="sess-event-time">{{ e.timestamp.slice(11, 19) }}</span>
                                <span class="sess-event-type">{{ e.type || (e.role || '') }}</span>
                                @if (e.tool) { <span class="sess-event-tool">{{ e.tool }}</span> } @else { <span class="sess-event-tool"></span> }
                                <span class="sess-event-dur"></span>
                                <span class="sess-event-input">{{ e.input }}</span>
                              </div>
                            }
                          }
                        </div>
                      </div>
                    }
                  </main>
                </div>
              </section>
            }
            @case ('process') {
              <section class="block proc-block">
                <div class="block-header proc-header">
                  <h2 class="block-title">Processes</h2>
                  <span class="editorial subtitle">Managed processes + daemon registry · Surface over <code>core/go-process</code>.</span>
                </div>
                <div class="proc-toolbar">
                  <div class="proc-tabs">
                    <button class="proc-tab" [class.active]="procTab() === 'managed'" (click)="procTab.set('managed')">
                      Managed <span class="proc-tab-count">{{ procManaged().length }}</span>
                    </button>
                    <button class="proc-tab" [class.active]="procTab() === 'daemons'" (click)="procTab.set('daemons')">
                      Daemons <span class="proc-tab-count">{{ procDaemons().length }}</span>
                    </button>
                  </div>
                  <button class="btn btn-ghost btn-sm" (click)="refreshProcesses()">Refresh</button>
                </div>

                <div class="proc-body">
                  @if (procTab() === 'managed') {
                    @if (procManaged().length === 0) {
                      <div class="proc-empty">No managed processes. Use <code>process_start</code> from the bridge or run a build.</div>
                    } @else {
                      <table class="proc-table">
                        <thead>
                          <tr>
                            <th>id</th>
                            <th>pid</th>
                            <th>command</th>
                            <th>status</th>
                            <th>started</th>
                            <th class="proc-actions-col">·</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (p of procManaged(); track p.id) {
                            <tr [class.active]="procSelected() === p.id" (click)="loadProcessOutput(p.id)" class="proc-row">
                              <td><code>{{ p.id.slice(0, 12) }}</code></td>
                              <td><code>{{ p.pid }}</code></td>
                              <td class="proc-cmd"><code>{{ p.command }} {{ (p.args || []).join(' ') }}</code></td>
                              <td><span class="proc-status sev-{{ p.status }}">{{ p.status }}</span></td>
                              <td><code>{{ p.started_at | slice:11:19 }}</code></td>
                              <td class="proc-actions-col">
                                @if (p.status === 'running') {
                                  <button class="btn btn-ghost btn-sm" (click)="signalProcess(p.id, 'term'); $event.stopPropagation()" title="SIGTERM">⏹</button>
                                  <button class="btn btn-ghost btn-sm" (click)="signalProcess(p.id, 'kill'); $event.stopPropagation()" title="SIGKILL">×</button>
                                } @else {
                                  <button class="btn btn-ghost btn-sm" (click)="removeProcess(p.id); $event.stopPropagation()" title="Remove">✕</button>
                                }
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                      @if (procSelected() && procOutput()) {
                        <div class="proc-output">
                          <div class="proc-output-head">Output · {{ procSelected() }}</div>
                          <pre>{{ procOutput() }}</pre>
                        </div>
                      }
                    }
                  } @else {
                    @if (procDaemons().length === 0) {
                      <div class="proc-empty">No daemons in <code>~/.core/daemons/</code>. Lethean services that register as daemons (lemma, vi, etc.) will appear here when running.</div>
                    } @else {
                      <table class="proc-table">
                        <thead>
                          <tr>
                            <th>code</th>
                            <th>daemon</th>
                            <th>pid</th>
                            <th>alive</th>
                            <th>health</th>
                            <th>project</th>
                            <th>started</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (d of procDaemons(); track d.pid) {
                            <tr>
                              <td><code>{{ d.code }}</code></td>
                              <td><code>{{ d.daemon }}</code></td>
                              <td><code>{{ d.pid }}</code></td>
                              <td><span class="proc-status" [class.sev-running]="d.alive" [class.sev-stopped]="!d.alive">{{ d.alive ? 'alive' : 'dead' }}</span></td>
                              <td>@if (d.health) { <a [href]="d.health" target="_blank">{{ d.health }}</a> } @else { — }</td>
                              <td><code>{{ d.project || '—' }}</code></td>
                              <td><code>{{ d.started | slice:0:19 }}</code></td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    }
                  }
                </div>
              </section>
            }
            @case ('lint') {
              <section class="block lint-block">
                <div class="block-header lint-header">
                  <h2 class="block-title">Lint</h2>
                  <span class="editorial subtitle">Pattern-based static analysis. Surface over <code>core/lint</code>.</span>
                </div>
                <div class="lint-toolbar">
                  <div class="lint-filters">
                    <button class="lint-chip" [class.active]="lintFilter() === 'all'" (click)="lintFilter.set('all')">
                      All <span class="lint-chip-count">{{ lintCounts().total }}</span>
                    </button>
                    @if (lintCounts().critical > 0) {
                      <button class="lint-chip critical" [class.active]="lintFilter() === 'critical'" (click)="lintFilter.set('critical')">
                        Critical <span class="lint-chip-count">{{ lintCounts().critical }}</span>
                      </button>
                    }
                    @if (lintCounts().high > 0) {
                      <button class="lint-chip high" [class.active]="lintFilter() === 'high'" (click)="lintFilter.set('high')">
                        High <span class="lint-chip-count">{{ lintCounts().high }}</span>
                      </button>
                    }
                    @if (lintCounts().medium > 0) {
                      <button class="lint-chip medium" [class.active]="lintFilter() === 'medium'" (click)="lintFilter.set('medium')">
                        Medium <span class="lint-chip-count">{{ lintCounts().medium }}</span>
                      </button>
                    }
                    @if (lintCounts().low > 0) {
                      <button class="lint-chip low" [class.active]="lintFilter() === 'low'" (click)="lintFilter.set('low')">
                        Low <span class="lint-chip-count">{{ lintCounts().low }}</span>
                      </button>
                    }
                    @if (lintCounts().info > 0) {
                      <button class="lint-chip info" [class.active]="lintFilter() === 'info'" (click)="lintFilter.set('info')">
                        Info <span class="lint-chip-count">{{ lintCounts().info }}</span>
                      </button>
                    }
                  </div>
                  <button class="btn btn-primary btn-sm" (click)="runLint()" [disabled]="lintRunning()">
                    @if (lintRunning()) { <span>scanning…</span> } @else { <span>Re-run</span> }
                  </button>
                </div>
                @if (lintError(); as err) {
                  <div class="lint-error">{{ err }}</div>
                }
                @if (lintBinary()) {
                  <div class="lint-meta">
                    {{ lintCounts().total }} issues · {{ lintDurationMs() }}ms · <code>{{ lintBinary() }}</code>
                  </div>
                }
                <div class="lint-list">
                  @for (i of lintVisible(); track $index) {
                    <button class="lint-row" [class]="'sev-' + i.severity" (click)="openLintIssue(i)">
                      <span class="lint-severity sev-{{ i.severity }}">{{ i.severity }}</span>
                      <span class="lint-rule">{{ i.rule_id }}</span>
                      <span class="lint-title">{{ i.title }}</span>
                      <span class="lint-loc">
                        <span class="lint-file">{{ i.file }}</span>
                        <span class="lint-line">:{{ i.line }}</span>
                      </span>
                    </button>
                  }
                  @if (lintVisible().length === 0 && !lintRunning() && !lintError()) {
                    <div class="lint-empty">
                      @if (lintCounts().total === 0) {
                        ✓ No issues found.
                      } @else {
                        No issues match the {{ lintFilter() }} filter.
                      }
                    </div>
                  }
                </div>
              </section>
            }
            @case ('containers') {
              <section class="block ctn-block">
                <div class="block-header ctn-header">
                  <h2 class="block-title">Containers</h2>
                  <span class="editorial subtitle">Runtimes detected on this host. Surface over <code>core/go-container</code>.</span>
                </div>

                <div class="ctn-toolbar">
                  <button class="btn btn-ghost btn-sm" (click)="loadContainers()" [disabled]="containerLoading()">
                    @if (containerLoading()) { <span>scanning…</span> } @else { <span>Re-scan</span> }
                  </button>
                  <span class="ctn-count">{{ containerList().length }} running · {{ containerRuntimes().length }} runtimes detected</span>
                </div>

                @if (containerError(); as err) {
                  <div class="ctn-error">{{ err }}</div>
                }

                <div class="ctn-body">
                  <div class="ctn-section">
                    <h3>Runtimes</h3>
                    <div class="ctn-runtime-grid">
                      @for (r of containerRuntimes(); track r.name) {
                        <div class="ctn-runtime-card" [class.unavailable]="!r.available">
                          <div class="ctn-runtime-head">
                            <span class="ctn-runtime-name">{{ r.name }}</span>
                            @if (r.available) {
                              <span class="ctn-pill available">available</span>
                            } @else {
                              <span class="ctn-pill missing">missing</span>
                            }
                          </div>
                          <p class="ctn-runtime-desc">{{ r.description }}</p>
                          @if (r.version) {
                            <code class="ctn-runtime-version">{{ r.version }}</code>
                          }
                          <div class="ctn-caps">
                            @if (r.hardware_isolated) { <span class="ctn-cap">⚙ hardware</span> }
                            @if (r.has_network_isolation) { <span class="ctn-cap">⌗ network</span> }
                            @if (r.has_volume_mounts) { <span class="ctn-cap">▢ mounts</span> }
                            @if (r.has_gpu) { <span class="ctn-cap">⚡ GPU</span> }
                            @if (r.has_encryption) { <span class="ctn-cap">🔒 encrypted</span> }
                            @if (r.sub_second_start) { <span class="ctn-cap">⚡ <1s start</span> }
                          </div>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="ctn-section">
                    <h3>Running containers</h3>
                    @if (containerList().length === 0) {
                      <div class="ctn-empty">Nothing running.</div>
                    } @else {
                      <div class="ctn-list">
                        @for (c of containerList(); track c.id) {
                          <div class="ctn-row" [class.active]="containerSelected() === c.id" (click)="loadContainerLogs(c.id, c.runtime)">
                            <span class="ctn-row-id">{{ c.id }}</span>
                            <span class="ctn-row-name">{{ c.name || '—' }}</span>
                            <span class="ctn-row-image">{{ c.image }}</span>
                            <span class="ctn-row-status">{{ c.status }}</span>
                            <span class="ctn-row-runtime">{{ c.runtime }}</span>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  @if (containerSelected() && containerLogs()) {
                    <div class="ctn-section">
                      <h3>Logs · {{ containerSelected() }}</h3>
                      <pre class="ctn-logs">{{ containerLogs() }}</pre>
                    </div>
                  }
                </div>
              </section>
            }
            @case ('build') {
              <section class="block build-block">
                <div class="block-header build-header">
                  <h2 class="block-title">Build</h2>
                  <span class="editorial subtitle">Surface over <code>core/go-build</code>. Detects your project, runs the build, streams output.</span>
                </div>
                <div class="build-toolbar">
                  <div class="build-meta">
                    @if (buildDetected(); as d) {
                      <span class="build-type-pill">{{ d.project_type }}</span>
                      <code class="build-cmd">{{ d.command }} {{ d.args.join(' ') }}</code>
                      @if (!d.core_bin_on_path) {
                        <span class="build-hint">core binary not on PATH — using fallback</span>
                      }
                    } @else {
                      <span class="build-hint">Detecting…</span>
                    }
                  </div>
                  <div class="build-actions">
                    <button class="btn btn-ghost btn-sm" (click)="detectBuild()" [disabled]="buildRunning()">Re-detect</button>
                    @if (!buildRunning()) {
                      <button class="btn btn-primary btn-sm" (click)="runBuild()" [disabled]="!buildDetected() || buildDetected()?.project_type === 'unknown'">
                        ▸ Build
                      </button>
                    } @else {
                      <button class="btn btn-ghost btn-sm" (click)="cancelBuild()">⏹ Cancel</button>
                    }
                  </div>
                </div>
                @if (buildError(); as err) {
                  <div class="build-error">{{ err }}</div>
                }
                <div class="build-log">
                  @if (buildLog()) {
                    <pre>{{ buildLog() }}</pre>
                  } @else if (buildRunning()) {
                    <pre class="build-running">building…</pre>
                  } @else {
                    <pre class="build-empty">Click ▸ Build to start. Output streams here.</pre>
                  }
                </div>
              </section>
            }
            @case ('plugin') {
              @if (activePlugin(); as ap) {
                <section class="block plugin-route-block">
                  <div class="block-header plugin-route-header">
                    <h2 class="block-title">{{ ap.record.menu?.label || ap.record.name }}</h2>
                    <span class="editorial subtitle">
                      Plugin · {{ ap.record.code }}
                      @if (ap.sub) { · <strong>{{ ap.sub }}</strong> }
                    </span>
                  </div>
                  <div class="plugin-route-body">
                    @if (ap.record.default_mode === 'native' && ap.record.native_tag === 'lethean-vi-plugin') {
                      <div class="plugin-panel-native">
                        <lethean-vi-plugin></lethean-vi-plugin>
                      </div>
                    } @else if (ap.record.entrypoint) {
                      <iframe class="plugin-route-frame"
                              [src]="safePluginRouteUrl(ap.record.entrypoint, ap.sub)"
                              sandbox="allow-scripts allow-same-origin allow-forms"
                              referrerpolicy="no-referrer"></iframe>
                    } @else {
                      <div class="placeholder-pane">
                        <p>This plugin doesn't have a runnable surface yet — passive plugin (theme / snippets / tool).</p>
                      </div>
                    }
                  </div>
                </section>
              }
            }
            @case ('settings') {
              <section class="block settings-block">
                <div class="block-header settings-header">
                  <h2 class="block-title">Settings</h2>
                  <span class="editorial subtitle">Tune the IDE to how you actually work. Changes save to <code>~/.core/config.yaml</code>.</span>
                </div>
                <div class="settings-toolbar">
                  <button class="btn btn-primary btn-sm" (click)="saveSettings()" [disabled]="!settingsDirty()">
                    Save changes
                  </button>
                  <button class="btn btn-ghost btn-sm" (click)="resetSettings()">
                    Reset to defaults
                  </button>
                  @if (settingsSaveMessage(); as msg) {
                    <span class="settings-saved">{{ msg }}</span>
                  }
                </div>

                <div class="settings-body">

                  <div class="settings-group">
                    <h3 class="settings-group-title">Editor</h3>
                    <p class="settings-group-hint">Live-applied to Monaco. No restart needed.</p>
                    <label class="settings-row">
                      <span class="settings-label">Font size</span>
                      <input type="number" min="8" max="32" step="0.5" class="settings-input num"
                             [value]="settings().editorFontSize"
                             (input)="updateSetting('editorFontSize', +($any($event.target).value))" />
                    </label>
                    <label class="settings-row">
                      <span class="settings-label">Tab size</span>
                      <input type="number" min="1" max="8" class="settings-input num"
                             [value]="settings().editorTabSize"
                             (input)="updateSetting('editorTabSize', +($any($event.target).value))" />
                    </label>
                    <label class="settings-row toggle">
                      <input type="checkbox"
                             [checked]="settings().editorWordWrap"
                             (change)="updateSetting('editorWordWrap', $any($event.target).checked)" />
                      <span class="settings-label">Word wrap</span>
                    </label>
                    <label class="settings-row toggle">
                      <input type="checkbox"
                             [checked]="settings().editorLineNumbers"
                             (change)="updateSetting('editorLineNumbers', $any($event.target).checked)" />
                      <span class="settings-label">Line numbers</span>
                    </label>
                    <label class="settings-row toggle">
                      <input type="checkbox"
                             [checked]="settings().editorMinimap"
                             (change)="updateSetting('editorMinimap', $any($event.target).checked)" />
                      <span class="settings-label">Minimap</span>
                    </label>
                    <label class="settings-row">
                      <span class="settings-label">Render whitespace</span>
                      <select class="settings-input"
                              [value]="settings().editorRenderWhitespace"
                              (change)="updateSetting('editorRenderWhitespace', $any($event.target).value)">
                        <option value="none">none</option>
                        <option value="boundary">boundary</option>
                        <option value="selection">selection</option>
                        <option value="trailing">trailing</option>
                        <option value="all">all</option>
                      </select>
                    </label>
                  </div>

                  <div class="settings-group">
                    <h3 class="settings-group-title">Workspace &amp; launch</h3>
                    <p class="settings-group-hint">Where the IDE starts when you open it.</p>
                    <label class="settings-row stacked">
                      <span class="settings-label">Workspace root</span>
                      <input type="text" class="settings-input"
                             [value]="settings().workspaceRoot"
                             (input)="updateSetting('workspaceRoot', $any($event.target).value)" />
                    </label>
                    <label class="settings-row">
                      <span class="settings-label">Default route on launch</span>
                      <select class="settings-input"
                              [value]="settings().defaultRoute"
                              (change)="updateSetting('defaultRoute', $any($event.target).value)">
                        <option value="dashboard">Control Panel</option>
                        <option value="explorer">Explorer</option>
                        <option value="search">Search</option>
                        <option value="git">Source Control</option>
                        <option value="terminal">Terminal</option>
                        <option value="repos">Repos</option>
                        <option value="marketplace">Marketplace</option>
                      </select>
                    </label>
                    <label class="settings-row toggle">
                      <input type="checkbox"
                             [checked]="settings().chatVisibleOnLaunch"
                             (change)="updateSetting('chatVisibleOnLaunch', $any($event.target).checked)" />
                      <span class="settings-label">Show Vi chat panel on launch</span>
                    </label>
                    <label class="settings-row stacked">
                      <span class="settings-label">Repo scan roots <span class="settings-hint">(one per line — re-scan triggers next time you open Repos)</span></span>
                      <textarea class="settings-input textarea" rows="6"
                                [value]="settings().reposRoots"
                                (input)="updateSetting('reposRoots', $any($event.target).value)"></textarea>
                    </label>
                  </div>

                  <div class="settings-group">
                    <h3 class="settings-group-title">Backend (restart required)</h3>
                    <p class="settings-group-hint">These settings affect the Go side and only take effect after restarting the IDE.</p>
                    <label class="settings-row stacked">
                      <span class="settings-label">Marketplace endpoint <span class="settings-hint">(blank = built-in fixture)</span></span>
                      <input type="text" class="settings-input"
                             [value]="settings().marketplaceEndpoint"
                             placeholder="https://api.lthn.sh"
                             (input)="updateSetting('marketplaceEndpoint', $any($event.target).value)" />
                    </label>
                    <label class="settings-row">
                      <span class="settings-label">Terminal SSH port</span>
                      <input type="number" min="1024" max="65535" class="settings-input num"
                             [value]="settings().terminalSshPort"
                             (input)="updateSetting('terminalSshPort', +($any($event.target).value))" />
                    </label>
                  </div>

                </div>
              </section>
            }
            @case ('repos') {
              <section class="block repos-block">
                <div class="block-header repos-header">
                  <h2 class="block-title">Repos</h2>
                  <span class="editorial subtitle">Aggregate git status across your Lethean workspace.</span>
                </div>
                <div class="repos-toolbar">
                  <div class="repos-filters">
                    <button class="repos-chip" [class.active]="reposFilter() === 'all'" (click)="reposFilter.set('all')">
                      All <span class="repos-chip-count">{{ reposCounts().total }}</span>
                    </button>
                    <button class="repos-chip" [class.active]="reposFilter() === 'dirty'" (click)="reposFilter.set('dirty')">
                      Dirty <span class="repos-chip-count">{{ reposCounts().dirty }}</span>
                    </button>
                    <button class="repos-chip" [class.active]="reposFilter() === 'ahead'" (click)="reposFilter.set('ahead')">
                      Ahead <span class="repos-chip-count">{{ reposCounts().ahead }}</span>
                    </button>
                    <button class="repos-chip" [class.active]="reposFilter() === 'behind'" (click)="reposFilter.set('behind')">
                      Behind <span class="repos-chip-count">{{ reposCounts().behind }}</span>
                    </button>
                  </div>
                  <button class="btn btn-primary btn-sm" (click)="loadRepos()" [disabled]="reposLoading()">
                    @if (reposLoading()) { <span>scanning…</span> } @else { <span>Re-scan</span> }
                  </button>
                </div>
                @if (reposError(); as err) {
                  <div class="repos-error">{{ err }}</div>
                }
                <div class="repos-grid">
                  @for (r of reposVisible(); track r.path) {
                    <button class="repos-card"
                            [class.dirty]="r.dirty"
                            [class.ahead]="r.ahead > 0"
                            [class.behind]="r.behind > 0"
                            (click)="openRepoInGit(r)"
                            [title]="r.path">
                      <div class="repos-card-head">
                        <span class="repos-card-name">{{ r.name }}</span>
                        <span class="repos-card-branch">{{ r.branch }}</span>
                      </div>
                      <div class="repos-card-state">
                        @if (r.staged > 0) { <span class="badge badge-staged">+{{ r.staged }}</span> }
                        @if (r.modified > 0) { <span class="badge badge-mod">~{{ r.modified }}</span> }
                        @if (r.untracked > 0) { <span class="badge badge-unt">?{{ r.untracked }}</span> }
                        @if (r.ahead > 0) { <span class="badge badge-ahead">↑{{ r.ahead }}</span> }
                        @if (r.behind > 0) { <span class="badge badge-behind">↓{{ r.behind }}</span> }
                        @if (!r.dirty && r.ahead === 0 && r.behind === 0) { <span class="badge badge-clean">clean</span> }
                      </div>
                      @if (r.error) { <div class="repos-card-error">{{ r.error }}</div> }
                    </button>
                  }
                  @if (reposVisible().length === 0 && !reposLoading() && !reposError()) {
                    <div class="repos-empty">
                      @if (reposCounts().total === 0) {
                        No repositories found. Re-scan to refresh.
                      } @else {
                        No repos match the {{ reposFilter() }} filter.
                      }
                    </div>
                  }
                </div>
              </section>
            }
            @case ('marketplace') {
              <section class="block market-block">
                <div class="block-header market-header">
                  <h2 class="block-title">Marketplace</h2>
                  <span class="editorial subtitle">Plugins, themes, and agents for your Lethean workspace.</span>
                </div>
                <div class="market-toolbar">
                  <input
                    type="text"
                    class="market-search-input"
                    placeholder="Search marketplace…"
                    [value]="marketQuery()"
                    (input)="marketQuery.set($any($event.target).value)"
                    (keyup.enter)="loadMarketplace()" />
                  <select class="market-category-select"
                          [value]="marketCategory()"
                          (change)="marketCategory.set($any($event.target).value); loadMarketplace()">
                    <option value="">All categories</option>
                    <option value="agents">Agents</option>
                    <option value="themes">Themes</option>
                    <option value="tools">Tools</option>
                    <option value="snippets">Snippets</option>
                  </select>
                  <button class="btn btn-primary btn-sm" (click)="loadMarketplace()" [disabled]="marketLoading()">
                    @if (marketLoading()) { <span>loading…</span> } @else { <span>Refresh</span> }
                  </button>
                </div>
                @if (marketError(); as err) {
                  <div class="market-error">{{ err }}</div>
                }
                @if (embeddedPlugin(); as ep) {
                  <div class="plugin-panel">
                    <div class="plugin-panel-header">
                      <span class="plugin-panel-title">▸ {{ ep.name }}</span>
                      <span class="plugin-panel-mode">{{ ep.mode }} mode</span>
                      <span class="plugin-panel-url">{{ ep.mode === 'native' ? '<' + ep.tag + '>' : ep.url }}</span>
                      <button class="btn btn-ghost btn-sm" (click)="closeEmbeddedPlugin()">Close</button>
                    </div>
                    @if (ep.mode === 'iframe') {
                      <iframe class="plugin-panel-frame"
                              [src]="safeEmbeddedPluginUrl()"
                              sandbox="allow-scripts allow-same-origin allow-forms"
                              referrerpolicy="no-referrer"></iframe>
                    } @else if (ep.mode === 'native' && ep.tag === 'lethean-vi-plugin') {
                      <div class="plugin-panel-native">
                        <lethean-vi-plugin></lethean-vi-plugin>
                      </div>
                    }
                  </div>
                }
                <div class="market-grid">
                  @for (m of marketModules(); track m.code) {
                    <article class="market-card" [class.installed]="isInstalled(m.code)">
                      <header class="market-card-head">
                        <h3 class="market-card-title">{{ m.name }}</h3>
                        <span class="market-card-cat">{{ m.category || 'misc' }}</span>
                      </header>
                      <div class="market-card-meta">
                        <code class="market-card-code">{{ m.code }}</code>
                        <span class="market-card-version">v{{ m.version || 'latest' }}</span>
                      </div>
                      @if (m.description) {
                        <div class="market-card-desc">{{ m.description }}</div>
                      }
                      @if (m.repo) {
                        <div class="market-card-repo">{{ m.repo }}</div>
                      }
                      <footer class="market-card-actions">
                        @if (isInstalled(m.code)) {
                          @if (hasNativeMode(m.code)) {
                            <button class="btn btn-primary btn-sm" (click)="runPluginNative(m.code)" title="Mount as native custom element (Mining-route)">
                              ⚡ Native
                            </button>
                          }
                          @if (pluginRunUrl(m.code); as runUrl) {
                            <button class="btn btn-ghost btn-sm" (click)="runPluginInline(m.code)" title="Mount as iframe panel inside the IDE">
                              ▸ Frame
                            </button>
                            <button class="btn btn-ghost btn-sm" (click)="runPlugin(m.code)" title="Open as separate window">
                              ↗ Window
                            </button>
                          }
                          <button class="btn btn-ghost btn-sm" (click)="removeModule(m.code)" [disabled]="marketBusy() === m.code">
                            @if (marketBusy() === m.code) { <span>removing…</span> } @else { <span>Remove</span> }
                          </button>
                          <span class="market-card-state">Installed</span>
                        } @else {
                          <button class="btn btn-primary btn-sm" (click)="installModule(m.code)" [disabled]="marketBusy() === m.code">
                            @if (marketBusy() === m.code) { <span>installing…</span> } @else { <span>Install</span> }
                          </button>
                        }
                      </footer>
                    </article>
                  }
                  @if (marketModules().length === 0 && !marketLoading() && !marketError()) {
                    <div class="market-empty">No packages found.</div>
                  }
                </div>
                @if (marketMessage(); as msg) {
                  <div class="market-message">{{ msg }}</div>
                }
              </section>
            }
            @default {
              <section class="block">
                <div class="block-header">
                  <h2 class="block-title">{{ titleForRoute() }}</h2>
                  <span class="editorial subtitle">{{ placeholderHint() }}</span>
                </div>
                <div class="placeholder-pane">
                  <p>This surface inherits the Lethean-3 design tokens but its detail design is pending. See <code>plans/project/lthn/desktop/RFC.md</code> for what's planned vs. shipped.</p>
                </div>
              </section>
            }
          }
        </div>

        <!-- Status bar (per Lethean-3 native handoff: 22px tall, mono, Vi state) -->
        <div class="status-bar num">
          <div class="status-left">
            <span class="status-item">
              <span class="vi-status-dot" [class.connected]="vi().connected"></span>
              {{ vi().connected ? 'Vi connected' : 'Vi reconnecting…' }} · {{ vi().latencyMs }}ms
            </span>
            <span class="status-sep">·</span>
            <span class="status-item">{{ vi().watching }} sites</span>
            <span class="status-sep">·</span>
            <span class="status-item">£0.00 / mo</span>
          </div>
          <div class="status-right">
            <span class="status-item">core-ide v0.1.0</span>
            <span class="status-sep">·</span>
            <span class="status-item">WebView2 · 124.0</span>
          </div>
        </div>
      </div>

      <!-- Right rail: chat panel — Cladius lives here. Hidden via close button; restored via toolbar Ask Vi. -->
      @if (chatVisible()) {
        <lethean-vi-panel
          status="listening"
          [attr.width]="380"
          placeholder="Talk to Cladius… ( /help for commands)"
          footer-note="Cladius reads only what you type. Bridge: 127.0.0.1:9877"
          (lethean-vi-send)="onChatSend($any($event).detail.text)"
          (lethean-vi-close)="hideChat()"
        >
          @for (msg of chatMessages(); track msg.id) {
            <lethean-vi-message [attr.who]="msg.who" [attr.size]="'chat'">
              {{ msg.text }}
            </lethean-vi-message>
          }
        </lethean-vi-panel>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .ide-layout {
      display: flex;
      height: 100%;
      background: var(--ink-1);
      color: var(--fg-1);
      font-family: var(--font-sans);
    }

    .ide-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    /* Toolbar (per Darwin profile: 52px unified toolbar) */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 52px;
      padding: 0 22px;
      background: color-mix(in oklch, var(--ink-1) 90%, transparent);
      border-bottom: 1px solid var(--line-1);
      backdrop-filter: blur(28px) saturate(160%);
      -webkit-backdrop-filter: blur(28px) saturate(160%);
    }

    .toolbar-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--fg-0);
      letter-spacing: -0.01em;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Buttons inherit .surface .btn from tokens.css; .btn-ghost / .btn-sm classes work directly. */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 10px;
      border-radius: var(--r-sm);
      font-weight: 500;
      font-size: 12px;
      letter-spacing: -0.005em;
      border: 1px solid transparent;
      transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
      white-space: nowrap;
    }

    .btn-ghost {
      background: transparent;
      color: var(--fg-2);
    }

    .btn-ghost:hover {
      background: var(--ink-3);
      color: var(--fg-0);
    }

    .btn-primary {
      background: var(--brand-500);
      color: var(--fg-0);
      border-color: var(--brand-400);
    }

    .btn-primary:hover {
      background: var(--brand-400);
    }

    .btn-secondary {
      background: var(--ink-3);
      color: var(--fg-0);
      border-color: var(--line-2);
    }

    .btn-secondary:hover {
      background: var(--ink-4);
    }

    .btn-sm {
      height: 24px;
      padding: 0 8px;
      font-size: 11.5px;
      border-radius: var(--r-xs);
    }

    .vi-pill {
      border: 1px solid var(--line-2);
    }

    .kbd {
      font-family: var(--font-mono);
      font-size: 10.5px;
      padding: 1px 5px;
      background: var(--ink-1);
      border: 1px solid var(--line-2);
      border-radius: 3px;
      color: var(--fg-2);
    }

    /* Content scroll area */
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    .block {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .block-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }

    .block-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--fg-0);
      letter-spacing: -0.005em;
      margin: 0;
    }

    .subtitle {
      font-size: 12.5px;
      color: var(--fg-3);
    }

    .editorial {
      font-family: var(--font-serif);
      font-style: italic;
      letter-spacing: -0.015em;
    }

    /* Brief grid (per native handoff: 3-col, 10px gap, 6px radius cards, 2px tone strip) */
    .brief-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .brief-card {
      position: relative;
      display: flex;
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-sm);
      overflow: hidden;
      transition: background 100ms ease, border-color 100ms ease;
    }

    .brief-card:hover {
      background: var(--ink-3);
      border-color: var(--line-2);
    }

    .tone-strip {
      width: 2px;
      flex-shrink: 0;
      background: var(--ink-5);
    }

    .brief-card[data-tone="warning"] .tone-strip { background: var(--warning-500); }
    .brief-card[data-tone="success"] .tone-strip { background: var(--success-500); }
    .brief-card[data-tone="info"] .tone-strip { background: var(--info-500); }
    .brief-card[data-tone="danger"] .tone-strip { background: var(--danger-500); }
    .brief-card[data-tone="neutral"] .tone-strip { background: var(--ink-5); }

    .brief-body {
      flex: 1;
      padding: 10px 12px 11px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }

    .brief-meta {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tone-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--ink-5);
    }

    .brief-card[data-tone="warning"] .tone-dot { background: var(--warning-500); }
    .brief-card[data-tone="success"] .tone-dot { background: var(--success-500); }
    .brief-card[data-tone="info"] .tone-dot { background: var(--info-500); }
    .brief-card[data-tone="danger"] .tone-dot { background: var(--danger-500); }

    .brief-time {
      font-family: var(--font-mono);
      font-size: 10.5px;
      color: var(--fg-3);
    }

    .brief-done {
      margin-left: auto;
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.05em;
      color: var(--success-400);
      padding: 1px 5px;
      border: 1px solid color-mix(in oklch, var(--success-500) 35%, transparent);
      border-radius: 3px;
    }

    .brief-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--fg-0);
      letter-spacing: -0.005em;
      margin: 0;
      line-height: 1.3;
    }

    .brief-text {
      font-size: 12px;
      color: var(--fg-2);
      line-height: 1.45;
      margin: 0;
    }

    .brief-actions {
      display: flex;
      gap: 6px;
      margin-top: auto;
      padding-top: 4px;
    }

    .brief-card.done {
      opacity: 0.7;
    }

    /* Sites data-table */
    .sites-table {
      display: flex;
      flex-direction: column;
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      overflow: hidden;
    }

    .sites-row {
      display: grid;
      grid-template-columns: 2fr 2fr 1fr 1fr 2fr;
      align-items: center;
      gap: 12px;
      padding: 8px 14px;
      font-size: 12.5px;
      border-top: 1px solid var(--line-1);
      color: var(--fg-1);
    }

    .sites-row:first-child {
      border-top: none;
    }

    .sites-head {
      font-family: var(--font-mono);
      font-size: 10.5px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--fg-4);
      padding-top: 9px;
      padding-bottom: 9px;
      background: color-mix(in oklch, var(--ink-1) 50%, transparent);
    }

    .sites-domain {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .num { font-family: var(--font-mono); }
    .tnum { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }

    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-dot[data-status="green"] { background: var(--success-500); }
    .status-dot[data-status="amber"] { background: var(--warning-500); }
    .status-dot[data-status="red"]   { background: var(--danger-500); }

    .sites-stack {
      color: var(--fg-3);
      font-size: 12px;
    }

    .sites-deploy {
      color: var(--fg-2);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 20px;
      padding: 0 8px;
      border-radius: var(--r-pill);
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.005em;
    }

    .pill-warn {
      background: color-mix(in oklch, var(--warning-500) 22%, var(--ink-2));
      color: var(--warning-400);
      border: 1px solid color-mix(in oklch, var(--warning-500) 35%, transparent);
    }

    /* Activity list */
    .activity-list {
      display: flex;
      flex-direction: column;
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      overflow: hidden;
    }

    .activity-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 14px;
      padding: 8px 14px;
      border-top: 1px solid var(--line-1);
      font-size: 12.5px;
    }

    .activity-row:first-child {
      border-top: none;
    }

    .who-badge {
      font-size: 10px;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      border-radius: 3px;
      background: var(--ink-3);
      color: var(--fg-3);
    }

    .activity-row[data-tone="success"] .who-badge {
      background: color-mix(in oklch, var(--success-500) 18%, var(--ink-3));
      color: var(--success-400);
    }

    .activity-row[data-tone="warning"] .who-badge {
      background: color-mix(in oklch, var(--warning-500) 18%, var(--ink-3));
      color: var(--warning-400);
    }

    .activity-text {
      color: var(--fg-1);
    }

    .activity-time {
      font-size: 11px;
      color: var(--fg-3);
    }

    /* Status bar (per native handoff: 22px tall, mono 10.5px, top-bordered) */
    .status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 22px;
      padding: 0 14px;
      background: color-mix(in oklch, var(--ink-0) 80%, transparent);
      border-top: 1px solid var(--line-1);
      font-size: 10.5px;
      color: var(--fg-3);
      flex-shrink: 0;
    }

    .status-left, .status-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .status-sep {
      color: var(--fg-4);
    }

    .vi-status-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--ink-5);
    }

    .vi-status-dot.connected {
      background: var(--success-500);
    }

    /* Source Control — git surface */
    .git-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .git-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .git-branch-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-2));
      border: 1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2));
      border-radius: 12px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--brand-200);
    }
    .git-ahead { color: var(--success-300); font-weight: 600; }
    .git-behind { color: var(--warn-300); font-weight: 600; }

    .git-grid {
      display: grid;
      grid-template-columns: 320px 1fr;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .git-list {
      border-right: 1px solid var(--line-1);
      overflow: auto;
      min-height: 0;
    }
    .git-empty {
      padding: 16px 18px;
      color: var(--fg-3);
      font-style: italic;
      font-size: 12px;
    }
    .git-row {
      display: grid;
      grid-template-columns: 28px 1fr 24px;
      gap: 6px;
      padding: 5px 12px 5px 14px;
      align-items: center;
      cursor: pointer;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--fg-1);
      border-bottom: 1px solid color-mix(in oklch, var(--line-1) 50%, transparent);
    }
    .git-row:hover { background: color-mix(in oklch, var(--brand-500) 8%, var(--ink-2)); }
    .git-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); color: var(--fg-0); }
    .git-row.staged .git-status-flag { color: var(--success-300); }
    .git-row.unstaged .git-status-flag { color: var(--warn-300); }
    .git-row.untracked .git-status-flag { color: var(--brand-300); }
    .git-status-flag {
      font-weight: 600;
      text-align: center;
      letter-spacing: 0.05em;
    }
    .git-row-path {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .git-row-btn {
      width: 22px; height: 22px;
      background: transparent;
      border: 1px solid var(--line-2);
      border-radius: 4px;
      color: var(--fg-3);
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      padding: 0;
    }
    .git-row-btn:hover { color: var(--fg-0); border-color: var(--brand-300); }

    .git-diff-pane {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }
    .git-diff-header {
      padding: 8px 14px;
      border-bottom: 1px solid var(--line-1);
      background: var(--ink-2);
      flex-shrink: 0;
    }
    .git-diff-path {
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--fg-1);
    }
    .git-diff-empty {
      padding: 32px 18px;
      color: var(--fg-4);
      font-style: italic;
      font-size: 12px;
      text-align: center;
    }
    .git-diff-body {
      flex: 1;
      overflow: auto;
      margin: 0;
      padding: 12px 14px;
      background: var(--ink-1);
      color: var(--fg-1);
      font-family: var(--font-mono);
      font-size: 11.5px;
      line-height: 1.5;
      white-space: pre;
      tab-size: 4;
      min-height: 0;
    }

    .git-commit-bar {
      display: flex;
      gap: 8px;
      padding: 10px 18px;
      border-top: 1px solid var(--line-1);
      background: var(--ink-2);
      flex-shrink: 0;
    }
    .git-commit-input {
      flex: 1;
      background: var(--ink-1);
      border: 1px solid var(--line-2);
      border-radius: 5px;
      padding: 6px 10px;
      color: var(--fg-0);
      font-family: var(--font-mono);
      font-size: 12px;
      outline: none;
    }
    .git-commit-input:focus { border-color: var(--brand-400); }
    .git-message {
      padding: 6px 18px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--fg-3);
      border-top: 1px solid color-mix(in oklch, var(--line-1) 50%, transparent);
      flex-shrink: 0;
    }

    /* Search — workspace ripgrep results */
    .search-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .search-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .search-toolbar {
      display: flex;
      gap: 8px;
      padding: 10px 18px;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .search-input {
      flex: 1;
      background: var(--ink-2);
      border: 1px solid var(--line-2);
      border-radius: 5px;
      padding: 6px 10px;
      color: var(--fg-0);
      font-family: var(--font-mono);
      font-size: 12px;
      outline: none;
    }
    .search-input:focus { border-color: var(--brand-400); }
    .search-error {
      padding: 10px 18px;
      background: color-mix(in oklch, var(--danger-500) 14%, var(--ink-2));
      color: var(--danger-300);
      font-size: 12px;
      flex-shrink: 0;
    }
    .search-empty, .search-summary {
      padding: 10px 18px;
      color: var(--fg-3);
      font-size: 11.5px;
      font-family: var(--font-mono);
      flex-shrink: 0;
    }
    .search-results {
      flex: 1;
      overflow: auto;
      min-height: 0;
    }
    .search-row {
      display: grid;
      grid-template-columns: auto auto 1fr auto;
      gap: 8px;
      padding: 5px 18px;
      width: 100%;
      background: transparent;
      border: 0;
      border-bottom: 1px solid color-mix(in oklch, var(--line-1) 50%, transparent);
      cursor: pointer;
      text-align: left;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--fg-1);
      align-items: baseline;
    }
    .search-row:hover { background: color-mix(in oklch, var(--brand-500) 8%, var(--ink-2)); }
    .search-path { color: var(--brand-200); font-weight: 500; }
    .search-line { color: var(--fg-3); }
    .search-text {
      color: var(--fg-1);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .search-fullpath {
      color: var(--fg-4);
      font-size: 10px;
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      direction: rtl;
      text-align: left;
    }

    /* Explorer — file tree + viewer */
    .explorer-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .explorer-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 6px;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--fg-3);
      flex-wrap: wrap;
    }
    .crumb {
      background: transparent;
      border: 0;
      color: var(--brand-200);
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
      font: inherit;
    }
    .crumb:hover { background: var(--ink-2); color: var(--brand-100); }
    .crumb-sep { color: var(--fg-4); }

    .explorer-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 280px 1fr;
      min-height: 0;
      overflow: hidden;
    }
    .explorer-grid:not(.has-file) { grid-template-columns: 1fr; }

    .explorer-tree {
      border-right: 1px solid var(--line-1);
      overflow: auto;
      padding: 6px 0;
      min-height: 0;
    }
    .tree-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 14px;
      font-size: 12.5px;
      font-family: var(--font-mono);
      color: var(--fg-1);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tree-row:hover { background: color-mix(in oklch, var(--brand-500) 10%, var(--ink-2)); }
    .tree-row.dir { color: var(--brand-200); }
    .tree-row.file { color: var(--fg-2); }
    .tree-row.file.active {
      background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2));
      color: var(--fg-0);
    }
    .tree-row.up { color: var(--fg-3); border-bottom: 1px solid var(--line-1); margin-bottom: 4px; }
    .tree-row.loading, .tree-row.empty { color: var(--fg-4); font-style: italic; cursor: default; }
    .tree-row.loading:hover, .tree-row.empty:hover { background: transparent; }
    .tree-icon { width: 12px; text-align: center; flex-shrink: 0; opacity: 0.7; }

    /* Tab bar */
    .tab-bar {
      display: flex;
      align-items: stretch;
      background: var(--ink-2);
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
      min-height: 30px;
    }
    .tab-list {
      flex: 1;
      display: flex;
      align-items: stretch;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .tab-list::-webkit-scrollbar { height: 3px; }
    .tab-list::-webkit-scrollbar-thumb { background: var(--line-2); }
    .tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px 6px 12px;
      border-right: 1px solid var(--line-1);
      cursor: pointer;
      max-width: 220px;
      min-width: 80px;
      user-select: none;
      font-size: 11.5px;
      font-family: var(--font-mono);
      color: var(--fg-2);
      background: var(--ink-2);
      flex-shrink: 0;
      position: relative;
    }
    .tab:hover { background: var(--ink-3); color: var(--fg-1); }
    .tab.active {
      background: var(--ink-1);
      color: var(--fg-0);
      box-shadow: inset 0 2px 0 0 var(--brand-400);
    }
    .tab-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tab-dirty {
      width: 8px;
      color: var(--brand-300);
      font-size: 13px;
      line-height: 1;
      visibility: hidden;
      flex-shrink: 0;
    }
    .tab-dirty.show { visibility: visible; }
    .tab-close {
      width: 16px;
      height: 16px;
      background: transparent;
      border: 0;
      border-radius: 3px;
      color: var(--fg-3);
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
    }
    .tab-close:hover {
      background: var(--ink-3);
      color: var(--fg-0);
    }
    .tab-close-all {
      padding: 0 12px;
      background: transparent;
      border: 0;
      border-left: 1px solid var(--line-1);
      color: var(--fg-3);
      font-size: 11px;
      font-family: var(--font-mono);
      cursor: pointer;
      flex-shrink: 0;
    }
    .tab-close-all:hover { color: var(--fg-0); background: var(--ink-3); }
    .tab-close-all:disabled { opacity: 0.3; cursor: default; }

    .explorer-viewer {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }
    .viewer-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 14px;
      border-bottom: 1px solid var(--line-1);
      background: var(--ink-2);
      flex-shrink: 0;
    }
    .viewer-path {
      flex: 1;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--fg-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      direction: rtl;
      text-align: left;
    }
    .viewer-lang {
      font-family: var(--font-mono);
      font-size: 10.5px;
      color: var(--fg-4);
      background: var(--ink-3);
      padding: 2px 6px;
      border-radius: 3px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .viewer-dirty {
      color: var(--brand-300);
      font-size: 16px;
      line-height: 1;
      margin-right: 4px;
    }
    .viewer-save {
      padding: 3px 10px;
      background: var(--brand-500);
      color: var(--fg-0);
      border: 1px solid var(--brand-400);
      border-radius: 4px;
      font: 500 11px / 1 inherit;
      cursor: pointer;
    }
    .viewer-save:hover {
      background: color-mix(in oklch, var(--brand-500) 90%, white);
    }
    .viewer-close {
      width: 22px;
      height: 22px;
      background: transparent;
      border: 1px solid var(--line-2);
      border-radius: 4px;
      color: var(--fg-3);
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
    }
    .viewer-close:hover { color: var(--fg-0); border-color: var(--line-1); }
    .viewer-monaco {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
    }
    .viewer-monaco lethean-monaco {
      flex: 1;
      min-height: 0;
      display: flex;
    }
    .viewer-body {
      flex: 1;
      margin: 0;
      padding: 14px 18px;
      overflow: auto;
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.55;
      color: var(--fg-1);
      background: var(--ink-1);
      white-space: pre;
      tab-size: 2;
      min-height: 0;
    }
    .viewer-body code { font: inherit; color: inherit; }

    /* Terminal placeholder (existing surface, tokenised) */
    .terminal-output {
      background: var(--ink-0);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      padding: 14px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--success-400);
    }

    .terminal-output pre {
      margin: 0;
    }

    /* Placeholder for untouched surfaces */
    .placeholder-pane {
      padding: 22px;
      background: var(--ink-2);
      border: 1px dashed var(--line-2);
      border-radius: var(--r-md);
      color: var(--fg-3);
      font-size: 13px;
    }

    .placeholder-pane code {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--fg-1);
      background: var(--ink-1);
      padding: 1px 6px;
      border-radius: 3px;
    }

    /* TS panel */
    .ts-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .ts-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ts-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ts-filter { flex: 1; background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-1); padding: 6px 10px; border-radius: 5px; font-size: 12px; }
    .ts-filter:focus { border-color: var(--brand-400); outline: none; }
    .ts-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .ts-side { width: 320px; border-right: 1px solid var(--line-1); padding: 12px 10px; overflow-y: auto; flex-shrink: 0; background: var(--ink-2); }
    .ts-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; padding: 0 4px; }
    .ts-row { display: flex; flex-direction: column; gap: 3px; align-items: flex-start; width: 100%; padding: 7px 9px; background: transparent; border: 1px solid transparent; border-radius: 5px; cursor: pointer; text-align: left; margin-bottom: 3px; }
    .ts-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-1)); }
    .ts-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-1)); border-color: var(--brand-400); }
    .ts-name { font-size: 12px; color: var(--fg-1); font-weight: 600; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .ts-tag { font-size: 8px; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.04em; }
    .ts-tag.deno { background: color-mix(in oklch, #34d399 20%, var(--ink-1)); color: #34d399; }
    .ts-tag.ws { background: color-mix(in oklch, #a78bfa 20%, var(--ink-1)); color: #a78bfa; }
    .ts-meta { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }
    .ts-fw { padding: 1px 5px; border-radius: 3px; background: var(--ink-1); color: var(--fg-3); font-size: 9px; }
    .ts-main { flex: 1; padding: 16px 20px; overflow-y: auto; min-width: 0; }
    .ts-detail h3 { font-size: 16px; color: var(--fg-1); margin: 0 0 4px; display: flex; align-items: baseline; gap: 8px; }
    .ts-detail h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 18px 0 8px; }
    .ts-version { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); font-weight: 400; }
    .ts-path { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); display: block; margin-bottom: 12px; }
    .ts-desc { color: var(--fg-2); font-size: 13px; line-height: 1.4; margin: 6px 0 14px; }
    .ts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 6px; }
    .ts-cell { display: flex; flex-direction: column; gap: 2px; padding: 7px 10px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 4px; }
    .ts-cell code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-1); }
    .ts-cell .ok { color: #34d399; }
    .ts-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); }
    .ts-fw-list { display: flex; flex-wrap: wrap; gap: 5px; }
    .ts-fw-pill { font-size: 11px; padding: 3px 9px; background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-1)); color: var(--brand-200); border-radius: 999px; font-family: var(--font-mono); }
    .ts-scripts { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 6px; }
    .ts-script { display: flex; flex-direction: column; gap: 3px; align-items: flex-start; padding: 8px 12px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 5px; cursor: pointer; text-align: left; }
    .ts-script:hover { border-color: var(--brand-400); background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .ts-script-name { font-family: var(--font-mono); font-size: 12px; color: var(--brand-200); }
    .ts-script-cmd { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .ts-empty, .ts-empty-pane { color: var(--fg-3); font-style: italic; font-size: 12px; padding: 8px; }
    .ts-empty-pane { padding: 30px; text-align: center; }

    /* PHP scripts grid (symmetric to TS scripts) */
    .php-script-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; margin: 6px 0 14px; }
    .php-script-card { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 6px; padding: 8px 10px; text-align: left; cursor: pointer; color: var(--fg-2); font: inherit; display: flex; flex-direction: column; gap: 3px; position: relative; }
    .php-script-card:hover { border-color: var(--brand-200); background: color-mix(in oklch, var(--brand-200) 6%, var(--ink-2)); }
    .php-script-name { font-size: 12px; font-weight: 600; color: var(--fg-1); font-family: var(--font-mono); }
    .php-script-lines { position: absolute; top: 6px; right: 8px; font-size: 9px; color: var(--brand-200); font-family: var(--font-mono); }
    .php-script-cmd { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .php-grid-meta { color: var(--fg-3); font-weight: normal; font-size: 11px; }

    /* PHP panel */
    .php-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .php-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .php-error { padding: 8px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 12px; }
    .php-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .php-side { width: 260px; border-right: 1px solid var(--line-1); padding: 14px 12px; overflow-y: auto; flex-shrink: 0; background: var(--ink-2); }
    .php-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; }
    .php-row { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; width: 100%; padding: 8px 10px; background: transparent; border: 1px solid transparent; border-radius: 5px; cursor: pointer; text-align: left; margin-bottom: 4px; }
    .php-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-1)); }
    .php-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-1)); border-color: var(--brand-400); }
    .php-name { font-size: 12px; color: var(--fg-1); font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .php-tag { font-size: 9px; padding: 1px 6px; border-radius: 3px; background: color-mix(in oklch, #a78bfa 18%, var(--ink-1)); color: #a78bfa; text-transform: uppercase; letter-spacing: 0.04em; }
    .php-url { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .php-main { flex: 1; padding: 16px 20px; overflow-y: auto; min-width: 0; }
    .php-empty, .php-empty-pane { color: var(--fg-3); font-style: italic; font-size: 12px; padding: 8px; }
    .php-empty-pane { padding: 30px; text-align: center; }
    .php-detail h3 { font-size: 16px; color: var(--fg-1); margin: 0 0 4px; }
    .php-detail h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 18px 0 8px; }
    .php-path { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); display: block; margin-bottom: 14px; }
    .php-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin-bottom: 6px; }
    .php-cell { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 4px; }
    .php-cell code { font-family: var(--font-mono); }
    .php-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); }
    .php-cell > span:not(.php-label) { font-size: 12px; color: var(--fg-1); }
    .php-services { display: flex; flex-wrap: wrap; gap: 6px; }
    .php-service { font-size: 11px; padding: 3px 9px; background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-1)); color: var(--brand-200); border-radius: 999px; font-family: var(--font-mono); }
    .php-state-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .php-state { font-size: 10px; font-family: var(--font-mono); padding: 3px 8px; border-radius: 4px; background: var(--ink-1); color: var(--fg-3); }
    .php-state.ok { background: color-mix(in oklch, #34d399 12%, var(--ink-1)); color: #34d399; }
    .php-state.warn { background: color-mix(in oklch, #fbbf24 12%, var(--ink-1)); color: #fbbf24; }
    .php-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .php-hint { font-size: 11px; color: var(--fg-3); font-style: italic; margin-top: 8px; }

    /* DevOps panel */
    .dvo-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .dvo-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .dvo-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .dvo-tabs { display: flex; gap: 4px; }
    .dvo-tab { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 12px; border-radius: 5px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .dvo-tab.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .dvo-tab-count { font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--ink-1); color: var(--fg-3); }
    .dvo-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
    .dvo-scan-controls { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--line-1); }
    .dvo-input { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-1); padding: 6px 10px; border-radius: 5px; font-size: 12px; min-width: 200px; }
    .dvo-target { font-size: 11px; color: var(--fg-3); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dvo-target code { font-family: var(--font-mono); color: var(--fg-2); }
    .dvo-error { color: #f87171; font-size: 12px; padding: 8px 12px; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-radius: 4px; margin-bottom: 10px; }
    .dvo-rule-summary { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
    .dvo-rule-pill { font-size: 10px; font-family: var(--font-mono); padding: 3px 8px; background: color-mix(in oklch, #fbbf24 12%, var(--ink-2)); color: #fbbf24; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px; }
    .dvo-rule-count { background: var(--ink-1); padding: 1px 6px; border-radius: 999px; color: #fbbf24; }
    .dvo-findings { display: flex; flex-direction: column; gap: 4px; }
    .dvo-finding { display: grid; grid-template-columns: 180px 1fr 200px; gap: 10px; align-items: baseline; padding: 7px 10px; background: transparent; border: 1px solid transparent; border-bottom: 1px solid var(--line-1); cursor: pointer; text-align: left; font-size: 12px; }
    .dvo-finding:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .dvo-rule { font-family: var(--font-mono); font-size: 11px; color: #fbbf24; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dvo-file { font-family: var(--font-mono); color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dvo-file code { font-family: inherit; }
    .dvo-line { color: var(--brand-200); }
    .dvo-snippet { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dvo-empty { padding: 30px; text-align: center; color: var(--fg-3); font-style: italic; font-size: 13px; }
    .dvo-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .dvo-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); background: var(--ink-2); }
    .dvo-table td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .dvo-table td code { font-family: var(--font-mono); color: var(--fg-2); font-size: 11px; }
    .dvo-row { cursor: pointer; }
    .dvo-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }

    /* Forge panel */
    .frg-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .frg-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .frg-header code { font-family: var(--font-mono); color: var(--fg-2); }
    .frg-error, .frg-hint { padding: 8px 18px; font-size: 12px; border-bottom: 1px solid var(--line-1); }
    .frg-error { color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); }
    .frg-hint { color: var(--fg-3); font-style: italic; background: color-mix(in oklch, #fbbf24 6%, transparent); font-family: var(--font-mono); font-size: 11px; word-break: break-all; }
    .frg-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .frg-orgs-side { width: 220px; border-right: 1px solid var(--line-1); padding: 14px 12px; overflow-y: auto; flex-shrink: 0; background: var(--ink-2); }
    .frg-orgs-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; }
    .frg-org-row { display: block; width: 100%; padding: 7px 10px; background: transparent; border: 1px solid transparent; border-radius: 5px; cursor: pointer; text-align: left; font-family: var(--font-mono); font-size: 12px; color: var(--fg-1); margin-bottom: 3px; }
    .frg-org-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-1)); }
    .frg-org-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-1)); border-color: var(--brand-400); }
    .frg-note-row { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; border-radius: 4px; text-decoration: none; color: var(--fg-2); margin-bottom: 4px; border: 1px solid transparent; }
    .frg-note-row:hover { background: var(--ink-1); border-color: var(--line-1); }
    .frg-note-row.unread { background: color-mix(in oklch, var(--brand-500) 8%, transparent); }
    .frg-note-type { font-size: 9px; text-transform: uppercase; color: var(--brand-200); letter-spacing: 0.04em; }
    .frg-note-title { font-size: 11px; color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .frg-note-repo { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); }
    .frg-empty, .frg-empty-pane { font-size: 11px; color: var(--fg-3); font-style: italic; padding: 10px 6px; }
    .frg-empty-pane { padding: 30px; text-align: center; }
    .frg-main { flex: 1; padding: 14px 18px; overflow-y: auto; min-width: 0; }
    .frg-repos-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--line-1); }
    .frg-org-label { font-family: var(--font-mono); font-size: 12px; color: var(--fg-2); }
    .frg-repo-picker { background: var(--ink-2); color: var(--fg-1); border: 1px solid var(--line-2); padding: 6px 10px; border-radius: 5px; font-size: 12px; min-width: 240px; }
    .frg-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
    .frg-tab { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 12px; border-radius: 5px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .frg-tab.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .frg-tab-count { font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--ink-1); color: var(--fg-3); }
    .frg-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .frg-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .frg-table td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .frg-table td code { font-family: var(--font-mono); color: var(--fg-2); font-size: 11px; }
    .frg-table a { color: var(--brand-200); text-decoration: none; }
    .frg-table a:hover { text-decoration: underline; }
    .frg-title { color: var(--fg-1); }
    .frg-draft { font-size: 9px; padding: 1px 6px; border-radius: 3px; background: var(--ink-1); color: var(--fg-3); margin-left: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
    .frg-state { font-family: var(--font-mono); font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .frg-state.open { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .frg-state.closed { background: color-mix(in oklch, #f87171 18%, var(--ink-1)); color: #f87171; }
    .frg-state.merged { background: color-mix(in oklch, #a78bfa 18%, var(--ink-1)); color: #a78bfa; }

    /* Tenant panel */
    .tnt-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .tnt-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .tnt-status { padding: 10px 18px; border-bottom: 1px solid var(--line-1); display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
    .tnt-status.online { background: color-mix(in oklch, #34d399 6%, transparent); }
    .tnt-status.offline { background: color-mix(in oklch, var(--fg-3) 6%, transparent); }
    .tnt-status-row { display: flex; align-items: center; gap: 10px; }
    .tnt-status-pill { font-size: 10px; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.06em; background: var(--ink-1); color: var(--fg-3); font-family: var(--font-mono); }
    .tnt-status.online .tnt-status-pill { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .tnt-status.offline .tnt-status-pill { background: color-mix(in oklch, #fbbf24 18%, var(--ink-1)); color: #fbbf24; }
    .tnt-status-detail { font-size: 12px; color: var(--fg-2); flex: 1; }
    .tnt-status-detail code { font-family: var(--font-mono); color: var(--fg-1); background: var(--ink-2); padding: 1px 6px; border-radius: 3px; }
    .tnt-status-hint { font-size: 11px; color: var(--fg-3); font-style: italic; padding-left: 4px; }
    .tnt-body { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; }
    .tnt-card { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
    .tnt-card h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0; }
    .tnt-form-row { display: flex; gap: 8px; }
    .tnt-form-grid { display: grid; grid-template-columns: 1fr 1fr 100px; gap: 8px; }
    .tnt-form-grid label { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: var(--fg-3); }
    .tnt-input { background: var(--ink-1); border: 1px solid var(--line-2); color: var(--fg-1); padding: 6px 9px; border-radius: 4px; font-size: 12px; font-family: var(--font-mono); flex: 1; }
    .tnt-input:focus { border-color: var(--brand-400); outline: none; }
    .tnt-input.num { width: 80px; flex: 0 0 80px; }
    .tnt-error { color: #f87171; font-size: 12px; padding: 6px 10px; background: color-mix(in oklch, #f87171 8%, var(--ink-1)); border-radius: 4px; font-family: var(--font-mono); }
    .tnt-result { font-family: var(--font-mono); font-size: 11px; line-height: 1.5; padding: 10px 12px; margin: 0; max-height: 280px; overflow-y: auto; background: var(--ink-1); border: 1px solid var(--line-1); border-radius: 5px; color: var(--fg-2); white-space: pre-wrap; }
    .tnt-can-result { padding: 10px 12px; border-radius: 6px; display: flex; flex-direction: column; gap: 4px; }
    .tnt-can-result.allowed { background: color-mix(in oklch, #34d399 8%, var(--ink-1)); border: 1px solid color-mix(in oklch, #34d399 30%, var(--line-1)); }
    .tnt-can-result.denied { background: color-mix(in oklch, #f87171 8%, var(--ink-1)); border: 1px solid color-mix(in oklch, #f87171 30%, var(--line-1)); }
    .tnt-can-verdict { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .tnt-can-pill { font-family: var(--font-mono); font-size: 10px; padding: 3px 10px; border-radius: 4px; font-weight: 700; }
    .tnt-can-result.allowed .tnt-can-pill { background: #34d399; color: #064e3b; }
    .tnt-can-result.denied .tnt-can-pill { background: #f87171; color: #7f1d1d; }
    .tnt-can-reason { font-size: 12px; color: var(--fg-2); font-style: italic; }
    .tnt-can-meta { font-size: 11px; color: var(--fg-3); font-family: var(--font-mono); }

    /* Store panel */
    .str-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .str-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .str-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .str-tabs { display: flex; gap: 4px; }
    .str-tab { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 12px; border-radius: 5px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .str-tab.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .str-tab-count { font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--ink-1); color: var(--fg-3); }
    .str-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .str-side { width: 280px; border-right: 1px solid var(--line-1); padding: 14px 12px; overflow-y: auto; flex-shrink: 0; background: var(--ink-2); }
    .str-files-side { width: 320px; }
    .str-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; }
    .str-row { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; width: 100%; padding: 7px 10px; background: transparent; border: 1px solid transparent; border-radius: 5px; cursor: pointer; text-align: left; margin-bottom: 4px; }
    .str-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-1)); }
    .str-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-1)); border-color: var(--brand-400); }
    .str-name { font-family: var(--font-mono); font-size: 12px; color: var(--fg-1); font-weight: 600; }
    .str-count { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); }
    .str-file-name { font-family: var(--font-mono); font-size: 11px; color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .str-file-meta { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); }
    .str-main { flex: 1; padding: 14px 18px; overflow-y: auto; min-width: 0; }
    .str-empty, .str-empty-pane { color: var(--fg-3); font-style: italic; font-size: 12px; padding: 8px; }
    .str-empty-pane { padding: 30px; text-align: center; }
    .str-group-head { font-family: var(--font-mono); font-size: 13px; color: var(--fg-1); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--line-1); }
    .str-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .str-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .str-table td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); vertical-align: top; }
    .str-table td code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); word-break: break-all; }
    .str-actions { width: 50px; text-align: right; }
    .str-file-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--line-1); }
    .str-file-path { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); overflow: hidden; text-overflow: ellipsis; }
    .str-file-preview { font-family: var(--font-mono); font-size: 11px; line-height: 1.5; padding: 12px 14px; margin: 0; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 5px; color: var(--fg-2); white-space: pre-wrap; max-height: 600px; overflow-y: auto; }

    /* Data panel */
    .data-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .data-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .data-error { padding: 10px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 13px; }
    .data-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .data-tables-side { width: 200px; border-right: 1px solid var(--line-1); padding: 14px 12px; overflow-y: auto; flex-shrink: 0; }
    .data-tables-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; }
    .data-backend-picker { display: flex; gap: 4px; margin-bottom: 6px; }
    .data-backend-btn { flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 6px 8px; background: var(--ink-2); border: 1px solid var(--line-2); border-radius: 5px; cursor: pointer; text-align: left; }
    .data-backend-btn:hover { border-color: var(--brand-400); }
    .data-backend-btn.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); }
    .data-backend-name { font-size: 11px; font-weight: 600; color: var(--fg-1); }
    .data-backend-meta { font-size: 9px; color: var(--fg-3); }
    .data-backend-path { font-size: 9px; color: var(--fg-3); margin-bottom: 8px; word-break: break-all; }
    .data-backend-path code { font-family: var(--font-mono); }
    .data-table-row { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; padding: 8px 10px; background: transparent; border: 1px solid transparent; border-radius: 6px; cursor: pointer; text-align: left; margin-bottom: 4px; }
    .data-table-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .data-table-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); }
    .data-table-name { font-family: var(--font-mono); font-size: 12px; color: var(--fg-1); font-weight: 600; }
    .data-table-meta { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }
    .data-main { flex: 1; padding: 14px 18px; overflow-y: auto; min-width: 0; }
    .data-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .data-count { font-size: 12px; color: var(--fg-2); }
    .data-form { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; }
    .data-form h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 10px; }
    .data-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; margin-bottom: 10px; }
    .data-form-label { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: var(--fg-3); }
    .data-input { background: var(--ink-1); border: 1px solid var(--line-2); color: var(--fg-1); padding: 6px 9px; border-radius: 4px; font-size: 12px; font-family: var(--font-mono); }
    .data-input:focus { border-color: var(--brand-400); outline: none; }
    .data-hint { font-size: 10px; color: var(--fg-3); margin-left: 10px; font-style: italic; }
    .data-grid-wrap { overflow-x: auto; border: 1px solid var(--line-1); border-radius: 8px; }
    .data-grid { width: 100%; border-collapse: collapse; font-size: 12px; }
    .data-grid th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); background: var(--ink-2); border-bottom: 1px solid var(--line-1); }
    .data-grid td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .data-grid td code { font-family: var(--font-mono); color: var(--fg-2); font-size: 11px; }
    .data-actions-col { width: 40px; text-align: center; }
    .data-empty { text-align: center; color: var(--fg-3); padding: 32px; font-style: italic; font-size: 13px; }

    /* Locales panel */
    .i18n-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .i18n-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .i18n-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .i18n-meta { font-size: 12px; color: var(--fg-3); }
    .i18n-error { padding: 10px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 13px; }
    .i18n-body { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 18px; }
    .i18n-matrix table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .i18n-matrix th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .i18n-matrix td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .i18n-pkg-col { min-width: 160px; }
    .i18n-baseline-col, .i18n-matrix th:not(.i18n-pkg-col):not(.i18n-baseline-col) { text-align: center; min-width: 70px; }
    .i18n-pkg-name { font-family: var(--font-mono); font-size: 12px; color: var(--fg-1); font-weight: 500; }
    .i18n-baseline { font-family: var(--font-mono); color: var(--fg-2); text-align: center; }
    .i18n-cell { font-family: var(--font-mono); text-align: center; cursor: pointer; transition: background 0.15s; }
    .i18n-cell.present { color: var(--fg-2); }
    .i18n-cell.present:hover { background: color-mix(in oklch, var(--brand-500) 10%, var(--ink-2)); }
    .i18n-cell.complete { background: color-mix(in oklch, #34d399 8%, transparent); }
    .i18n-cell.partial { background: color-mix(in oklch, #fbbf24 8%, transparent); }
    .i18n-cell.over { background: color-mix(in oklch, #93c5fd 8%, transparent); }
    .i18n-cell.active { background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-2)) !important; outline: 1px solid var(--brand-400); }
    .i18n-cell.missing { color: var(--fg-3); cursor: default; opacity: 0.4; }
    .i18n-cell-keys { font-weight: 500; }
    .i18n-cell-gap { font-size: 10px; color: #fbbf24; margin-left: 4px; }
    .i18n-cell-extra { font-size: 10px; color: #93c5fd; margin-left: 4px; }
    .i18n-empty { text-align: center; color: var(--fg-3); padding: 32px; font-style: italic; }
    .i18n-viewer { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; }
    .i18n-viewer-head { padding: 10px 14px; border-bottom: 1px solid var(--line-1); display: flex; gap: 10px; align-items: center; }
    .i18n-viewer-title { font-size: 13px; color: var(--fg-1); }
    .i18n-viewer-path { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); margin-left: auto; }
    .i18n-viewer-body { font-family: var(--font-mono); font-size: 11px; line-height: 1.5; padding: 14px 16px; margin: 0; max-height: 400px; overflow-y: auto; color: var(--fg-2); white-space: pre-wrap; }

    /* Memory panel */
    .mem-recent-strip { padding: 10px 18px; border-bottom: 1px solid var(--line-1); background: var(--ink-2); flex-shrink: 0; }
    .mem-recent-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin-bottom: 6px; }
    .mem-recent-row { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
    .mem-recent-pill { background: var(--ink-1); border: 1px solid var(--line-1); padding: 5px 10px; border-radius: 4px; cursor: pointer; color: var(--fg-2); font: inherit; display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
    .mem-recent-pill:hover { border-color: var(--brand-200); background: color-mix(in oklch, var(--brand-200) 6%, var(--ink-1)); }
    .mem-recent-type { font-size: 9px; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.04em; background: var(--ink-2); color: var(--fg-3); }
    .mem-recent-type[data-type="project"] { background: color-mix(in oklch, #34d399 18%, var(--ink-2)); color: #34d399; }
    .mem-recent-type[data-type="feedback"] { background: color-mix(in oklch, #fbbf24 18%, var(--ink-2)); color: #fbbf24; }
    .mem-recent-type[data-type="reference"] { background: color-mix(in oklch, #93c5fd 18%, var(--ink-2)); color: #93c5fd; }
    .mem-recent-type[data-type="user"] { background: color-mix(in oklch, #c4b5fd 18%, var(--ink-2)); color: #c4b5fd; }
    .mem-recent-type[data-type="design"] { background: color-mix(in oklch, #fb7185 18%, var(--ink-2)); color: #fb7185; }
    .mem-recent-name { font-size: 11px; color: var(--fg-1); }
    .mem-recent-when { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }
    .mem-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .mem-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .mem-header code { font-size: 10px; }
    .mem-toolbar { display: flex; gap: 12px; padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; align-items: center; flex-wrap: wrap; }
    .mem-filter { flex: 0 0 280px; }
    .mem-sort { flex: 0 0 150px; margin-left: auto; }
    .mem-type-pills { display: flex; flex-wrap: wrap; gap: 4px; }
    .mem-type-pill { background: var(--ink-2); border: 1px solid var(--line-1); color: var(--fg-2); padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; font: inherit; display: flex; gap: 6px; align-items: center; }
    .mem-type-pill:hover { border-color: var(--brand-200); }
    .mem-type-pill.active { background: var(--brand-200); color: var(--ink-1); border-color: var(--brand-200); }
    .mem-type-count { font-family: var(--font-mono); font-size: 10px; opacity: 0.7; }
    .mem-body { flex: 1; overflow-y: auto; padding: 12px 18px; }
    .mem-empty { padding: 24px; font-size: 13px; color: var(--fg-3); text-align: center; }
    .mem-list-summary { font-size: 10px; color: var(--fg-3); padding: 0 4px 8px; text-transform: uppercase; letter-spacing: 0.06em; }
    .mem-row { width: 100%; display: grid; grid-template-columns: 80px 1fr; gap: 12px; align-items: flex-start; padding: 10px 14px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 6px; margin-bottom: 6px; cursor: pointer; text-align: left; font: inherit; color: var(--fg-2); }
    .mem-row:hover { border-color: var(--brand-200); background: color-mix(in oklch, var(--brand-200) 4%, var(--ink-2)); }
    .mem-row-type { background: var(--ink-1); color: var(--fg-3); font-size: 9px; padding: 3px 7px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; text-align: center; align-self: start; margin-top: 2px; }
    .mem-row-type[data-type="project"] { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .mem-row-type[data-type="feedback"] { background: color-mix(in oklch, #fbbf24 18%, var(--ink-1)); color: #fbbf24; }
    .mem-row-type[data-type="reference"] { background: color-mix(in oklch, #93c5fd 18%, var(--ink-1)); color: #93c5fd; }
    .mem-row-type[data-type="user"] { background: color-mix(in oklch, #c4b5fd 18%, var(--ink-1)); color: #c4b5fd; }
    .mem-row-type[data-type="design"] { background: color-mix(in oklch, #fb7185 18%, var(--ink-1)); color: #fb7185; }
    .mem-row-body { min-width: 0; }
    .mem-row-name { font-size: 13px; font-weight: 600; color: var(--fg-1); }
    .mem-row-desc { font-size: 11px; color: var(--fg-2); margin-top: 4px; line-height: 1.4; }
    .mem-row-meta { font-size: 10px; color: var(--fg-3); margin-top: 4px; display: flex; gap: 6px; }
    .mem-row-meta code { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); }
    .mem-search-hit { width: 100%; display: flex; flex-direction: column; gap: 6px; padding: 10px 14px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 6px; margin-bottom: 6px; cursor: pointer; text-align: left; font: inherit; color: var(--fg-2); }
    .mem-search-hit:hover { border-color: var(--brand-200); background: color-mix(in oklch, var(--brand-200) 4%, var(--ink-2)); }
    .mem-search-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .mem-search-name { font-size: 12px; font-weight: 600; color: var(--fg-1); }
    .mem-search-line { color: var(--fg-3); }
    .mem-search-line code { font-family: var(--font-mono); font-size: 11px; }
    .mem-search-match { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); margin: 0; padding: 6px 8px; background: var(--ink-1); border-radius: 4px; white-space: pre-wrap; word-break: break-word; }

    /* Stream panel */
    .stream-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .stream-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .stream-status-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .stream-stat { background: var(--ink-2); padding: 10px 12px; border-radius: 6px; }
    .stream-stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--fg-3); }
    .stream-stat-value { font-size: 18px; font-weight: 500; color: var(--fg-1); margin-top: 4px; font-family: var(--font-mono); }
    .stream-ok { color: #34d399; }
    .stream-warn { color: #fbbf24; }
    .stream-body { display: grid; grid-template-columns: 240px 1fr; gap: 0; flex: 1; min-height: 0; overflow: hidden; }
    .stream-channels { border-right: 1px solid var(--line-1); overflow-y: auto; padding: 10px 0; }
    .stream-list-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); padding: 0 14px 8px; display: flex; justify-content: space-between; align-items: center; }
    .stream-refresh { padding: 2px 6px; font-size: 11px; }
    .stream-channel-row { width: 100%; padding: 8px 14px; background: transparent; border: 0; border-left: 2px solid transparent; text-align: left; cursor: pointer; color: var(--fg-2); font: inherit; display: flex; justify-content: space-between; align-items: center; }
    .stream-channel-row:hover { background: var(--ink-2); }
    .stream-channel-row.active { background: var(--ink-2); border-left-color: var(--brand-200); color: var(--fg-1); }
    .stream-channel-name { font-size: 12px; font-weight: 500; font-family: var(--font-mono); }
    .stream-channel-meta { font-size: 10px; color: var(--fg-3); display: flex; gap: 4px; }
    .stream-empty { padding: 18px; font-size: 12px; color: var(--fg-3); font-style: italic; text-align: center; }
    .stream-frames { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
    .stream-frame-list { flex: 1; overflow-y: auto; padding: 0 18px; font-family: var(--font-mono); font-size: 11px; }
    .stream-frame { padding: 6px 0; border-bottom: 1px solid var(--line-1); display: flex; flex-direction: column; gap: 4px; }
    .stream-frame-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .stream-frame-time { color: var(--fg-3); font-size: 11px; min-width: 60px; }
    .stream-frame-bytes { color: var(--brand-200); font-size: 11px; min-width: 40px; text-align: right; }
    .stream-frame-tag { background: color-mix(in oklch, var(--brand-200) 16%, var(--ink-1)); color: var(--brand-200); font-size: 9px; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.04em; }
    .stream-frame-toggle { background: var(--ink-1); border: 1px solid var(--line-1); color: var(--fg-3); font-size: 9px; padding: 1px 6px; border-radius: 3px; cursor: pointer; font-family: var(--font-mono); }
    .stream-frame-toggle:hover { color: var(--fg-1); border-color: var(--brand-200); }
    .stream-frame-jump { background: transparent; border: 1px solid var(--brand-200); color: var(--brand-200); font-size: 10px; padding: 1px 6px; border-radius: 3px; cursor: pointer; font-family: var(--font-mono); margin-left: auto; }
    .stream-frame-jump:hover { background: color-mix(in oklch, var(--brand-200) 14%, transparent); }
    .stream-frame-text { color: var(--fg-2); white-space: pre-wrap; word-break: break-all; font-size: 11px; }
    .stream-frame-pretty { color: var(--fg-2); white-space: pre; overflow-x: auto; font-size: 10px; padding: 6px 8px; background: var(--ink-1); border-radius: 4px; margin: 0; line-height: 1.4; }
    .stream-frame-json .stream-frame-time { color: var(--brand-200); }
    .stream-publish { padding: 14px 18px; border-top: 1px solid var(--line-1); flex-shrink: 0; }
    .stream-publish-row { display: flex; gap: 8px; align-items: center; }
    .stream-mode-select { width: 110px; flex-shrink: 0; }
    .stream-channel-input { width: 160px; flex-shrink: 0; }
    .stream-frame-input { flex: 1; }

    /* Sessions panel */
    .sess-tabs { display: flex; gap: 0; padding: 0 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .sess-tab { padding: 8px 14px; background: transparent; border: 0; border-bottom: 2px solid transparent; color: var(--fg-2); font: inherit; font-size: 12px; cursor: pointer; display: flex; gap: 6px; align-items: center; }
    .sess-tab:hover { color: var(--fg-1); }
    .sess-tab.active { color: var(--fg-1); border-bottom-color: var(--brand-200); }
    .sess-tab-count { font-family: var(--font-mono); font-size: 10px; color: var(--brand-200); background: var(--ink-2); padding: 1px 6px; border-radius: 3px; }
    .sess-active-mode { grid-template-columns: 320px 1fr !important; }
    .sess-active-list { border-right: 1px solid var(--line-1); overflow-y: auto; padding: 10px 0; }
    .sess-active-row { width: 100%; padding: 10px 14px; background: transparent; border: 0; border-left: 2px solid transparent; text-align: left; cursor: pointer; color: var(--fg-2); font: inherit; display: block; }
    .sess-active-row:hover { background: var(--ink-2); }
    .sess-active-row.active { background: var(--ink-2); border-left-color: var(--brand-200); }
    .sess-active-head { display: flex; justify-content: space-between; align-items: center; }
    .sess-active-id { font-family: var(--font-mono); font-size: 11px; color: var(--brand-200); }
    .sess-active-age { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }
    .sess-active-fresh { color: #34d399; font-weight: 500; }
    .sess-active-proj { font-size: 11px; color: var(--fg-1); margin-top: 4px; word-break: break-all; }
    .sess-active-meta { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); margin-top: 2px; }
    .sess-search-list { border-right: 1px solid var(--line-1); overflow-y: auto; padding: 10px 0; }
    .sess-search-hit { width: calc(100% - 20px); margin: 4px 10px; padding: 8px 12px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 6px; cursor: pointer; font: inherit; color: var(--fg-2); text-align: left; display: flex; flex-direction: column; gap: 6px; }
    .sess-search-hit:hover { border-color: var(--brand-200); }
    .sess-search-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .sess-search-when { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); }
    .sess-search-tool { font-size: 9px; padding: 1px 5px; border-radius: 3px; background: color-mix(in oklch, var(--brand-200) 16%, var(--ink-1)); color: var(--brand-200); text-transform: uppercase; letter-spacing: 0.04em; }
    .sess-search-match { font-family: var(--font-mono); font-size: 10px; color: var(--fg-2); margin: 0; padding: 6px 8px; background: var(--ink-1); border-radius: 4px; white-space: pre-wrap; word-break: break-all; }

    .sess-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .sess-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .sess-toolbar { display: flex; gap: 8px; padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; align-items: center; }
    .sess-filter { flex: 1; max-width: 320px; }
    .sess-body { display: grid; grid-template-columns: 240px 280px 1fr; gap: 0; flex: 1; min-height: 0; overflow: hidden; }
    .sess-projects, .sess-list { border-right: 1px solid var(--line-1); overflow-y: auto; padding: 10px 0; }
    .sess-list-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); padding: 0 14px 8px; }
    .sess-spin { color: var(--brand-200); }
    .sess-empty { padding: 18px; font-size: 12px; color: var(--fg-3); font-style: italic; text-align: center; }
    .sess-project-row, .sess-row { width: 100%; padding: 8px 14px; background: transparent; border: 0; border-left: 2px solid transparent; text-align: left; cursor: pointer; color: var(--fg-2); font: inherit; display: block; }
    .sess-project-row:hover, .sess-row:hover { background: var(--ink-2); }
    .sess-project-row.active, .sess-row.active { background: var(--ink-2); border-left-color: var(--brand-200); color: var(--fg-1); }
    .sess-project-name { font-size: 12px; font-weight: 500; word-break: break-all; }
    .sess-project-meta { font-size: 10px; color: var(--fg-3); margin-top: 2px; display: flex; gap: 6px; }
    .sess-row { display: grid; grid-template-columns: 80px 1fr; gap: 8px; align-items: center; }
    .sess-row-id code { font-size: 11px; color: var(--brand-200); }
    .sess-row-meta { font-size: 10px; color: var(--fg-3); display: flex; flex-direction: column; }
    .sess-row-size { color: var(--fg-2); font-family: var(--font-mono); }
    .sess-detail { overflow-y: auto; padding: 18px; }
    .sess-detail-head { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--line-1); }
    .sess-detail-title { font-size: 13px; }
    .sess-detail-title code { font-family: var(--font-mono); color: var(--brand-200); }
    .sess-detail-sub { font-size: 11px; color: var(--fg-3); margin-top: 4px; }
    .sess-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
    .sess-stat { background: var(--ink-2); padding: 10px 12px; border-radius: 6px; }
    .sess-stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--fg-3); }
    .sess-stat-value { font-size: 18px; font-weight: 500; color: var(--fg-1); margin-top: 4px; font-family: var(--font-mono); }
    .sess-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin-bottom: 8px; }
    .sess-tail-note { text-transform: none; letter-spacing: 0; font-style: italic; color: var(--fg-3); }
    .sess-tools-section { margin-bottom: 18px; }
    .sess-tools-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .sess-tool-pill { display: inline-flex; gap: 6px; align-items: center; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 4px; padding: 3px 8px; font-size: 11px; }
    .sess-tool-name { color: var(--fg-2); font-family: var(--font-mono); }
    .sess-tool-count { color: var(--brand-200); font-weight: 500; font-family: var(--font-mono); }
    .sess-events-section { margin-bottom: 18px; }
    .sess-events-list { background: var(--ink-2); border-radius: 6px; padding: 8px; max-height: 400px; overflow-y: auto; font-family: var(--font-mono); font-size: 10px; }
    .sess-event { display: grid; grid-template-columns: 60px 80px 100px 60px 1fr; gap: 6px; padding: 3px 6px; border-bottom: 1px solid var(--line-1); align-items: center; }
    .sess-event-jumpable { cursor: pointer; }
    .sess-event-jumpable:hover { background: color-mix(in oklch, var(--brand-200) 10%, transparent); }
    .sess-event-jumpable .sess-event-input { color: var(--brand-200); }
    .sess-event-error { background: color-mix(in oklch, #fbbf24 8%, transparent); }
    .sess-live-toggle { margin-left: auto; padding: 2px 8px; font-size: 10px; }
    .sess-live-active { background: color-mix(in oklch, #34d399 22%, var(--ink-1)); color: #34d399; border-color: #34d399; }
    .sess-live-count { font-size: 10px; color: #34d399; font-family: var(--font-mono); margin-left: 6px; }
    .sess-live-divider { padding: 6px 10px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #34d399; background: color-mix(in oklch, #34d399 8%, transparent); border-top: 1px solid color-mix(in oklch, #34d399 30%, transparent); border-bottom: 1px solid color-mix(in oklch, #34d399 30%, transparent); }
    .sess-event-live { background: color-mix(in oklch, #34d399 4%, transparent); border-left: 2px solid #34d399; }
    .sess-live-pulse { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #34d399; margin-right: 4px; transition: opacity 0.4s ease, transform 0.4s ease; }
    .sess-live-pulse[data-tick="0"] { opacity: 1; transform: scale(1); }
    .sess-live-pulse[data-tick="1"] { opacity: 0.4; transform: scale(0.7); }
    .sess-live-dropped { font-size: 10px; color: var(--fg-3); font-family: var(--font-mono); margin-left: 4px; opacity: 0.7; }
    .sess-event-time { color: var(--fg-3); }
    .sess-event-type { color: var(--brand-200); }
    .sess-event-tool { color: var(--fg-2); }
    .sess-event-dur { color: var(--fg-3); text-align: right; }
    .sess-event-input { color: var(--fg-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Updates panel */
    .self-upd-card { padding: 14px 18px; border-bottom: 1px solid var(--line-1); background: var(--ink-2); flex-shrink: 0; }
    .self-upd-card--update { background: color-mix(in oklch, #fbbf24 8%, var(--ink-2)); border-bottom-color: color-mix(in oklch, #fbbf24 30%, var(--line-1)); }
    .self-upd-row { display: flex; align-items: center; gap: 14px; }
    .self-upd-icon { font-size: 22px; color: var(--brand-200); width: 32px; text-align: center; }
    .self-upd-card--update .self-upd-icon { color: #fbbf24; }
    .self-upd-body { flex: 1; min-width: 0; }
    .self-upd-title { font-size: 14px; font-weight: 600; color: var(--fg-1); }
    .self-upd-meta { font-size: 11px; color: var(--fg-3); margin-top: 3px; }
    .self-upd-meta code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); padding: 0 4px; background: var(--ink-1); border-radius: 3px; }
    .self-upd-meta a { color: var(--brand-200); text-decoration: none; }
    .self-upd-meta a:hover { text-decoration: underline; }
    .self-upd-source { opacity: 0.7; }
    .self-upd-hint { color: var(--fg-3); font-style: italic; }
    .self-upd-err { color: #fbbf24; font-size: 10px; }
    .self-upd-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .upd-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .upd-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .upd-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .upd-allgood { color: #34d399; font-size: 12px; }
    .upd-attn { color: #fbbf24; font-size: 12px; font-weight: 500; }
    .upd-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
    .upd-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .upd-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .upd-table td { padding: 8px 10px; border-bottom: 1px solid var(--line-1); vertical-align: middle; }
    .upd-table td code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); }
    .upd-table a { color: var(--brand-200); text-decoration: none; }
    .upd-table a:hover { text-decoration: underline; }
    .upd-needs { background: color-mix(in oklch, #fbbf24 6%, transparent); }
    .upd-name { font-weight: 600; color: var(--fg-1); font-size: 12px; }
    .upd-desc { font-size: 10px; color: var(--fg-3); margin-top: 2px; }
    .upd-missing { font-size: 11px; color: var(--fg-3); font-style: italic; }
    .upd-unknown { color: var(--fg-3); }
    .upd-pill { font-family: var(--font-mono); font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .upd-pill.ok { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .upd-pill.warn { background: color-mix(in oklch, #fbbf24 18%, var(--ink-1)); color: #fbbf24; }
    .upd-pill.missing { background: color-mix(in oklch, var(--fg-3) 18%, var(--ink-1)); color: var(--fg-3); }
    .upd-pill.unknown { background: var(--ink-1); color: var(--fg-3); }
    .upd-actions-col { width: 50px; text-align: right; }

    /* Process panel */
    .proc-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .proc-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .proc-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .proc-tabs { display: flex; gap: 4px; }
    .proc-tab { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 12px; border-radius: 5px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .proc-tab:hover { border-color: var(--brand-400); }
    .proc-tab.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .proc-tab-count { font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--ink-1); color: var(--fg-3); }
    .proc-tab.active .proc-tab-count { color: var(--brand-200); }
    .proc-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
    .proc-empty { padding: 32px; text-align: center; color: var(--fg-3); font-style: italic; font-size: 13px; }
    .proc-empty code { font-family: var(--font-mono); color: var(--fg-2); background: var(--ink-2); padding: 1px 6px; border-radius: 3px; font-size: 12px; }
    .proc-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .proc-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); background: var(--ink-2); }
    .proc-table td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .proc-table td code { font-family: var(--font-mono); color: var(--fg-2); font-size: 11px; }
    .proc-row { cursor: pointer; }
    .proc-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .proc-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); }
    .proc-cmd { max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .proc-status { font-family: var(--font-mono); font-size: 10px; padding: 2px 8px; border-radius: 4px; background: var(--ink-1); color: var(--fg-3); text-transform: uppercase; letter-spacing: 0.04em; }
    .proc-status.sev-running { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .proc-status.sev-exited, .proc-status.sev-stopped { background: color-mix(in oklch, var(--fg-3) 18%, var(--ink-1)); color: var(--fg-3); }
    .proc-status.sev-failed, .proc-status.sev-killed { background: color-mix(in oklch, #f87171 18%, var(--ink-1)); color: #f87171; }
    .proc-actions-col { width: 80px; text-align: right; }
    .proc-output { margin-top: 14px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; }
    .proc-output-head { padding: 8px 14px; border-bottom: 1px solid var(--line-1); font-size: 11px; color: var(--fg-3); font-family: var(--font-mono); }
    .proc-output pre { font-family: var(--font-mono); font-size: 11px; line-height: 1.5; padding: 12px 14px; margin: 0; max-height: 320px; overflow-y: auto; color: var(--fg-2); white-space: pre-wrap; }

    /* Lint panel */
    .lint-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .lint-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .lint-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .lint-filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .lint-chip { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 10px; border-radius: 999px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .lint-chip:hover { border-color: var(--brand-400); }
    .lint-chip.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .lint-chip.critical.active { background: color-mix(in oklch, #f87171 26%, var(--ink-2)); border-color: #f87171; }
    .lint-chip.high.active { background: color-mix(in oklch, #fbbf24 22%, var(--ink-2)); border-color: #fbbf24; }
    .lint-chip-count { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); padding: 1px 6px; border-radius: 999px; background: var(--ink-1); }
    .lint-chip.active .lint-chip-count { color: var(--brand-200); }
    .lint-error { padding: 10px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 13px; }
    .lint-meta { padding: 6px 18px; font-size: 11px; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .lint-meta code { font-family: var(--font-mono); color: var(--fg-2); }
    .lint-list { flex: 1; overflow-y: auto; padding: 4px 18px 18px; }
    .lint-row {
      display: grid;
      grid-template-columns: 70px 110px 1fr auto;
      gap: 12px;
      align-items: baseline;
      width: 100%;
      padding: 7px 10px;
      background: transparent;
      border: 1px solid transparent;
      border-bottom: 1px solid var(--line-1);
      cursor: pointer;
      text-align: left;
      font-size: 12px;
      color: var(--fg-1);
    }
    .lint-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-2)); }
    .lint-severity {
      font-family: var(--font-mono);
      font-size: 10px;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--ink-1);
      color: var(--fg-3);
      letter-spacing: 0.04em;
    }
    .lint-severity.sev-critical { background: color-mix(in oklch, #f87171 22%, var(--ink-1)); color: #f87171; }
    .lint-severity.sev-high { background: color-mix(in oklch, #fbbf24 22%, var(--ink-1)); color: #fbbf24; }
    .lint-severity.sev-medium { background: color-mix(in oklch, #93c5fd 18%, var(--ink-1)); color: #93c5fd; }
    .lint-severity.sev-low { background: color-mix(in oklch, #34d399 14%, var(--ink-1)); color: #34d399; }
    .lint-severity.sev-info { background: var(--ink-1); color: var(--fg-3); }
    .lint-rule { font-family: var(--font-mono); font-size: 11px; color: var(--brand-200); }
    .lint-title { color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lint-loc { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); white-space: nowrap; }
    .lint-file { color: var(--fg-2); }
    .lint-line { color: var(--brand-200); }
    .lint-empty { padding: 40px; text-align: center; color: var(--fg-3); font-size: 13px; }

    /* Containers panel */
    .ctn-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .ctn-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ctn-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .ctn-count { font-size: 11px; color: var(--fg-3); }
    .ctn-error { padding: 10px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 13px; }
    .ctn-body { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 20px; }
    .ctn-section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-2); margin: 0 0 10px; }
    .ctn-runtime-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
    .ctn-runtime-card { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
    .ctn-runtime-card.unavailable { opacity: 0.5; }
    .ctn-runtime-head { display: flex; justify-content: space-between; align-items: center; }
    .ctn-runtime-name { font-weight: 600; font-size: 13px; color: var(--fg-1); text-transform: capitalize; }
    .ctn-runtime-desc { font-size: 11px; color: var(--fg-3); margin: 0; line-height: 1.4; }
    .ctn-runtime-version { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); background: var(--ink-1); padding: 2px 6px; border-radius: 3px; align-self: flex-start; }
    .ctn-pill { font-size: 10px; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.06em; }
    .ctn-pill.available { background: color-mix(in oklch, #34d399 14%, var(--ink-1)); color: #34d399; }
    .ctn-pill.missing { background: var(--ink-1); color: var(--fg-3); }
    .ctn-caps { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .ctn-cap { font-size: 10px; color: var(--fg-2); background: var(--ink-1); padding: 1px 7px; border-radius: 4px; }
    .ctn-list { display: flex; flex-direction: column; gap: 4px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 6px; padding: 4px; }
    .ctn-row { display: grid; grid-template-columns: 100px 200px 1fr 140px 70px; gap: 10px; padding: 8px 12px; align-items: center; cursor: pointer; border-radius: 4px; font-size: 12px; }
    .ctn-row:hover { background: var(--ink-1); }
    .ctn-row.active { background: color-mix(in oklch, var(--brand-500) 15%, var(--ink-1)); }
    .ctn-row-id { font-family: var(--font-mono); color: var(--fg-3); }
    .ctn-row-name { color: var(--fg-1); font-weight: 500; }
    .ctn-row-image { font-family: var(--font-mono); color: var(--fg-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ctn-row-status { color: var(--fg-2); }
    .ctn-row-runtime { font-size: 10px; text-transform: uppercase; color: var(--brand-200); }
    .ctn-empty { padding: 18px; text-align: center; color: var(--fg-3); font-style: italic; font-size: 13px; }
    .ctn-logs { background: var(--ink-0); border: 1px solid var(--line-1); border-radius: 6px; padding: 12px 14px; font-family: var(--font-mono); font-size: 11px; line-height: 1.5; color: var(--fg-2); white-space: pre-wrap; max-height: 300px; overflow-y: auto; margin: 0; }

    /* Build panel */
    .build-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .build-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .build-toolbar {
      display: flex;
      gap: 12px;
      padding: 10px 18px;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .build-meta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .build-type-pill {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--brand-200);
      background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-1));
      padding: 2px 10px;
      border-radius: 999px;
    }
    .build-cmd {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--fg-2);
      background: var(--ink-2);
      padding: 3px 8px;
      border-radius: 4px;
    }
    .build-hint { font-size: 11px; color: var(--fg-3); font-style: italic; }
    .build-actions { display: flex; gap: 6px; }
    .build-error {
      padding: 10px 18px;
      color: #f87171;
      background: color-mix(in oklch, #f87171 8%, var(--ink-2));
      border-bottom: 1px solid var(--line-1);
      font-size: 13px;
    }
    .build-log {
      flex: 1;
      overflow-y: auto;
      padding: 14px 18px;
      background: var(--ink-0);
    }
    .build-log pre {
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.5;
      color: var(--fg-2);
      white-space: pre-wrap;
      margin: 0;
    }
    .build-empty, .build-running { color: var(--fg-3); font-style: italic; }

    /* Plugin route — full-surface render of an installed plugin's UI */
    .plugin-route-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .plugin-route-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .plugin-route-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .plugin-route-frame { width: 100%; height: 100%; border: none; background: var(--ink-0); }
    .plugin-route-body .plugin-panel-native { flex: 1; overflow-y: auto; }

    /* Settings */
    .settings-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .settings-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .settings-toolbar {
      display: flex;
      gap: 10px;
      padding: 10px 18px;
      align-items: center;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .settings-saved {
      font-size: 12px;
      color: var(--brand-200);
      background: color-mix(in oklch, var(--brand-500) 10%, var(--ink-2));
      padding: 4px 10px;
      border-radius: var(--r-sm);
    }
    .settings-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .settings-group {
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .settings-group-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--fg-1);
      margin: 0;
      letter-spacing: 0.02em;
    }
    .settings-group-hint {
      font-size: 11px;
      color: var(--fg-3);
      margin: -4px 0 4px;
      font-style: italic;
    }
    .settings-row {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
      color: var(--fg-2);
    }
    .settings-row.stacked {
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
    }
    .settings-row.toggle {
      cursor: pointer;
    }
    .settings-row.toggle input[type="checkbox"] {
      width: 14px;
      height: 14px;
      accent-color: var(--brand-500);
    }
    .settings-label {
      flex: 1;
      color: var(--fg-1);
    }
    .settings-hint {
      color: var(--fg-3);
      font-weight: 400;
      font-style: italic;
      font-size: 11px;
      margin-left: 6px;
    }
    .settings-input {
      background: var(--ink-1);
      border: 1px solid var(--line-2);
      color: var(--fg-1);
      padding: 6px 10px;
      border-radius: var(--r-sm);
      font-size: 13px;
      font-family: var(--font-sans);
    }
    .settings-input:focus { border-color: var(--brand-400); outline: none; }
    .settings-input.num { width: 80px; font-family: var(--font-mono); }
    .settings-input.textarea {
      font-family: var(--font-mono);
      font-size: 12px;
      resize: vertical;
      min-height: 80px;
    }
    .settings-row select.settings-input { width: 200px; }
    .settings-row.stacked input.settings-input,
    .settings-row.stacked textarea.settings-input { width: 100%; }

    /* Repos dashboard */
    .repos-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .repos-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .repos-toolbar {
      display: flex;
      gap: 10px;
      padding: 12px 18px;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .repos-filters { display: flex; gap: 6px; }
    .repos-chip {
      background: var(--ink-2);
      border: 1px solid var(--line-2);
      color: var(--fg-2);
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: border-color 0.15s, background 0.15s;
    }
    .repos-chip:hover { border-color: var(--brand-400); }
    .repos-chip.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .repos-chip-count {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--fg-3);
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--ink-1);
    }
    .repos-chip.active .repos-chip-count { color: var(--brand-200); }
    .repos-error {
      padding: 10px 18px;
      color: #f87171;
      background: color-mix(in oklch, #f87171 8%, var(--ink-2));
      border-bottom: 1px solid var(--line-1);
      font-size: 13px;
    }
    .repos-grid {
      flex: 1;
      overflow-y: auto;
      padding: 14px 18px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 8px;
      align-content: start;
    }
    .repos-empty {
      grid-column: 1 / -1;
      text-align: center;
      color: var(--fg-3);
      padding: 32px;
      font-size: 13px;
    }
    .repos-card {
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s, transform 0.15s, background 0.15s;
    }
    .repos-card:hover {
      border-color: var(--brand-400);
      transform: translateY(-1px);
    }
    .repos-card.dirty { border-color: color-mix(in oklch, #fbbf24 60%, var(--line-1)); }
    .repos-card.behind { border-color: color-mix(in oklch, #f87171 50%, var(--line-1)); }
    .repos-card.ahead.dirty { border-color: color-mix(in oklch, #fbbf24 60%, var(--line-1)); }
    .repos-card-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    .repos-card-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--fg-1);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .repos-card-branch {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--fg-3);
      flex-shrink: 0;
    }
    .repos-card-state {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .badge {
      font-family: var(--font-mono);
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--ink-1);
      color: var(--fg-2);
    }
    .badge-staged { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .badge-mod { background: color-mix(in oklch, #fbbf24 18%, var(--ink-1)); color: #fbbf24; }
    .badge-unt { background: color-mix(in oklch, #93c5fd 18%, var(--ink-1)); color: #93c5fd; }
    .badge-ahead { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-1)); color: var(--brand-200); }
    .badge-behind { background: color-mix(in oklch, #f87171 18%, var(--ink-1)); color: #f87171; }
    .badge-clean { color: var(--fg-3); }
    .repos-card-error {
      font-size: 10px;
      color: #f87171;
      font-family: var(--font-mono);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Plugin embedded panel — Angular Render iframe-as-component */
    .plugin-panel {
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
      background: var(--ink-1);
    }
    .plugin-panel-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 18px;
      background: var(--ink-2);
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .plugin-panel-title { font-size: 13px; font-weight: 600; color: var(--fg-1); }
    .plugin-panel-url { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .plugin-panel-frame {
      width: 100%;
      height: 480px;
      border: none;
      background: var(--ink-0);
    }
    .plugin-panel-native {
      max-height: 480px;
      overflow-y: auto;
      background: var(--ink-0);
    }
    .plugin-panel-mode {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--brand-200);
      background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-1));
      padding: 2px 8px;
      border-radius: 999px;
    }

    /* Marketplace */
    .market-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .market-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .market-toolbar {
      display: flex;
      gap: 10px;
      padding: 12px 18px;
      align-items: center;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .market-search-input,
    .market-category-select {
      background: var(--ink-2);
      border: 1px solid var(--line-2);
      color: var(--fg-1);
      padding: 7px 10px;
      border-radius: var(--r-sm);
      font-size: 13px;
    }
    .market-search-input { flex: 1; }
    .market-search-input:focus,
    .market-category-select:focus { border-color: var(--brand-400); outline: none; }
    .market-error {
      padding: 10px 18px;
      color: #f87171;
      background: color-mix(in oklch, #f87171 8%, var(--ink-2));
      border-bottom: 1px solid var(--line-1);
      font-size: 13px;
    }
    .market-message {
      padding: 8px 18px;
      color: var(--fg-2);
      background: color-mix(in oklch, var(--brand-500) 8%, var(--ink-2));
      border-top: 1px solid var(--line-1);
      font-size: 12px;
    }
    .market-grid {
      flex: 1;
      overflow-y: auto;
      padding: 16px 18px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
      align-content: start;
    }
    .market-empty {
      grid-column: 1 / -1;
      text-align: center;
      color: var(--fg-3);
      padding: 32px;
      font-size: 13px;
    }
    .market-card {
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.15s, transform 0.15s;
    }
    .market-card:hover {
      border-color: var(--brand-400);
      transform: translateY(-1px);
    }
    .market-card.installed { border-color: color-mix(in oklch, var(--brand-500) 60%, var(--line-1)); }
    .market-card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .market-card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--fg-1);
      margin: 0;
      line-height: 1.3;
    }
    .market-card-cat {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--brand-200);
      background: color-mix(in oklch, var(--brand-500) 12%, var(--ink-1));
      padding: 2px 8px;
      border-radius: 999px;
      flex-shrink: 0;
    }
    .market-card-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--fg-3);
    }
    .market-card-code { font-family: var(--font-mono); color: var(--fg-2); }
    .market-card-version { font-family: var(--font-mono); }
    .market-card-desc {
      font-size: 12px;
      color: var(--fg-2);
      line-height: 1.4;
    }
    .market-card-repo {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--fg-3);
      word-break: break-all;
    }
    .market-card-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: auto;
      padding-top: 6px;
    }
    .market-card-state {
      font-size: 11px;
      color: var(--brand-200);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* Responsive: collapse brief grid on narrow viewports */
    @media (max-width: 1100px) {
      .brief-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 720px) {
      .brief-grid { grid-template-columns: 1fr; }
      .sites-row { grid-template-columns: 1fr 1fr; gap: 6px; }
      .sites-row > *:nth-child(n+3) { display: none; }
    }
  `]
})
export class IdeComponent implements OnInit, OnDestroy {
  private isBrowser: boolean;
  private timeEventCleanup?: () => void;

  @ViewChild('editorRef') editorRef?: ElementRef<HTMLElement>;

  currentRoute = signal('dashboard');
  currentTime = signal('');

  vi = signal<ViStatus>(emptyViStatus);
  briefs = signal<Brief[]>([]);
  sites = signal<Site[]>([]);
  activity = signal<ActivityItem[]>([]);

  // Chat — Cladius lives here. Backend wiring (claude_bridge upstream MCP)
  // lands next iter; for now messages echo locally so the UI is real.
  chatMessages = signal<{ id: number; who: 'vi' | 'you'; text: string }[]>([
    {
      id: 0,
      who: 'vi',
      text: "Hey — Cladius here. The chat surface is up. Backend wiring lands next iter; until then, messages echo locally. The MCP bridge at :9877 is fully active though, so real DOM/console/window/file/process control is already live.",
    },
  ]);
  private chatIdCounter = 1;

  viewKind = computed(() => {
    const route = this.currentRoute();
    if (route === 'dashboard') return 'control-panel';
    if (route === 'terminal') return 'terminal';
    if (route === 'explorer') return 'explorer';
    if (route === 'search') return 'search';
    if (route === 'git') return 'git';
    if (route === 'marketplace') return 'marketplace';
    if (route === 'repos') return 'repos';
    if (route === 'build') return 'build';
    if (route === 'containers') return 'containers';
    if (route === 'lint') return 'lint';
    if (route === 'process') return 'process';
    if (route === 'updates') return 'updates';
    if (route === 'sessions') return 'sessions';
    if (route === 'stream') return 'stream';
    if (route === 'memory') return 'memory';
    if (route === 'locales') return 'locales';
    if (route === 'data') return 'data';
    if (route === 'store') return 'store';
    if (route === 'tenant') return 'tenant';
    if (route === 'forge') return 'forge';
    if (route === 'devops') return 'devops';
    if (route === 'php') return 'php';
    if (route === 'ts') return 'ts';
    if (route === 'settings') return 'settings';
    if (route.startsWith('plugin:')) return 'plugin';
    return 'placeholder';
  });

  // Active plugin context — derived from the current route. plugin:vi
  // selects the Vi plugin's main page; plugin:vi:ask selects its 'ask'
  // sub-page. Drives the @case ('plugin') template + element rendering.
  activePlugin = computed(() => {
    const route = this.currentRoute();
    if (!route.startsWith('plugin:')) return null;
    const parts = route.split(':');
    const code = parts[1];
    const sub = parts[2] || '';
    const record = this.pluginMenus().find(p => p.code === code);
    if (!record) return null;
    return { code, sub, record };
  });

  // Source control state — wraps git via the MCP bridge
  gitBranch = signal<{ branch: string; ahead: number; behind: number } | null>(null);
  gitEntries = signal<{ path: string; index_status: string; worktree_status: string; staged: boolean; unstaged: boolean; untracked: boolean }[]>([]);
  gitSelectedFile = signal<string | null>(null);
  gitDiff = signal<string>('');
  gitCommitMessage = signal('');
  gitBusy = signal(false);
  gitMessage = signal<string | null>(null);

  // Workspace search — drives the Search route via /mcp/call workspace_search
  searchQuery = signal('');
  searchResults = signal<{ path: string; line: number; text: string }[]>([]);
  searchLoading = signal(false);
  searchError = signal<string | null>(null);
  searchTruncated = signal(false);

  // User settings — persisted under ui.settings.* in ~/.core/config.yaml.
  // Loaded once on launch, edited via the Settings panel, applied live to the
  // editor / explorer / repos / launch defaults.
  readonly defaultSettings = {
    editorFontSize: 12.5,
    editorTabSize: 2,
    editorWordWrap: false,
    editorLineNumbers: true,
    editorMinimap: false,
    editorRenderWhitespace: 'selection' as 'none' | 'boundary' | 'selection' | 'trailing' | 'all',
    workspaceRoot: '/Users/snider/Code/core/ide',
    defaultRoute: 'dashboard',
    reposRoots: '/Users/snider/Code/core\n/Users/snider/Code/lthn\n/Users/snider/Code/host-uk\n/Users/snider/Code/lab\n/Users/snider/Code/snider',
    chatVisibleOnLaunch: false,
    marketplaceEndpoint: '',
    terminalSshPort: 9876,
  };
  settings = signal({ ...this.defaultSettings });
  settingsDirty = signal(false);
  settingsSaveMessage = signal<string | null>(null);

  // Multi-repo dashboard — aggregate git status across workspace roots via repos_status
  reposAll = signal<{ name: string; path: string; branch: string; modified: number; untracked: number; staged: number; ahead: number; behind: number; dirty: boolean; error?: string }[]>([]);
  reposFilter = signal<'all' | 'dirty' | 'ahead' | 'behind'>('all');
  reposLoading = signal(false);
  reposError = signal<string | null>(null);
  reposLoadedOnce = false;
  reposVisible = computed(() => {
    const filter = this.reposFilter();
    const all = this.reposAll();
    if (filter === 'dirty') return all.filter(r => r.dirty);
    if (filter === 'ahead') return all.filter(r => r.ahead > 0);
    if (filter === 'behind') return all.filter(r => r.behind > 0);
    return all;
  });
  reposCounts = computed(() => {
    const all = this.reposAll();
    return {
      total: all.length,
      dirty: all.filter(r => r.dirty).length,
      ahead: all.filter(r => r.ahead > 0).length,
      behind: all.filter(r => r.behind > 0).length,
    };
  });

  // TS panel — TypeScript / Deno project discovery
  tsProjects = signal<{ path: string; name: string; version: string; description: string; package_manager: string; frameworks: string[]; scripts: { name: string; cmd: string }[]; deno: boolean; workspace: boolean; has_node_modules: boolean; has_lockfile: boolean; has_tsconfig: boolean; modified: string }[]>([]);
  tsSelected = signal<any | null>(null);
  tsLoading = signal(false);
  tsFilter = signal<string>('');
  tsVisible = computed(() => {
    const f = this.tsFilter().toLowerCase().trim();
    if (!f) return this.tsProjects();
    return this.tsProjects().filter(p =>
      (p.name || '').toLowerCase().includes(f) ||
      (p.frameworks || []).some(fw => fw.toLowerCase().includes(f)) ||
      (p.package_manager || '').toLowerCase().includes(f) ||
      p.path.toLowerCase().includes(f),
    );
  });

  // PHP panel — IDE surface over core/php
  phpProjects = signal<{ path: string; name: string; app_name: string; app_url: string; package_mgr: string; frankenphp: boolean }[]>([]);
  phpScripts = signal<{ composer_scripts: { name: string; command: string; lines: number; source: string }[]; artisan_scripts: { name: string; command: string; source: string; artisan_args: string[] }[]; has_artisan: boolean; has_composer: boolean } | null>(null);
  phpScriptsLoading = signal(false);
  phpSelected = signal<any | null>(null);
  phpLoading = signal(false);
  phpError = signal<string | null>(null);

  // DevOps panel — IDE surface over core/go-devops
  devopsTab = signal<'secrets' | 'playbooks'>('secrets');
  devopsScanner = signal<'regex' | 'gitleaks'>('regex');
  devopsFindings = signal<{ file: string; line: number; column: number; rule: string; snippet: string }[]>([]);
  devopsRules = signal<{ rule: string; count: number }[]>([]);
  devopsScanError = signal<string | null>(null);
  devopsScanRunning = signal(false);
  devopsPlaybooks = signal<{ name: string; path: string; root: string; size_bytes: number; modified: string; description: string }[]>([]);
  devopsPlaybooksLoading = signal(false);
  devopsBasePath = signal<string>('');

  // Forge panel — IDE surface over core/go-forge
  forgeStatus = signal<{ configured: boolean; authenticated: boolean; as: string; base: string; hint: string } | null>(null);
  forgeOrgs = signal<{ name: string; full_name: string; description: string }[]>([]);
  forgeSelectedOrg = signal<string>('');
  forgeRepos = signal<{ name: string; full_name: string; description: string; private: boolean; fork: boolean; stars: number; updated_at: string; html_url: string }[]>([]);
  forgeSelectedRepo = signal<string>('');
  forgeIssues = signal<{ number: number; title: string; state: string; comments: number; updated_at: string; html_url: string; author: string }[]>([]);
  forgePulls = signal<{ number: number; title: string; state: string; merged: boolean; draft: boolean; updated_at: string; html_url: string; author: string; base: string; head: string }[]>([]);
  forgeNotifications = signal<{ id: number; unread: boolean; pinned: boolean; updated_at: string; title: string; type: string; url: string; state: string; repo: string }[]>([]);
  forgeError = signal<string | null>(null);
  forgeLoading = signal(false);
  forgeTab = signal<'issues' | 'pulls' | 'notifications'>('issues');

  // Tenant panel — IDE surface over core/go-tenant
  tenantStatus = signal<{ registered: boolean; online: boolean; api_url: string; api_token_set: boolean; hint: string } | null>(null);
  tenantWorkspaceLookup = signal<string>('');
  tenantWorkspaceResult = signal<any>(null);
  tenantWorkspaceError = signal<string | null>(null);
  tenantUserResult = signal<any>(null);
  tenantCanForm = signal<{ workspace: string; feature: string; quantity: number }>({ workspace: '', feature: '', quantity: 1 });
  tenantCanResult = signal<{ allowed: boolean; reason: string; feature: string; workspace: string; used?: number; limit?: number; remaining?: number } | null>(null);
  tenantCanError = signal<string | null>(null);

  // Store panel — IDE surface over go-store
  storeTab = signal<'groups' | 'files'>('groups');
  storeGroups = signal<{ name: string; count: number }[]>([]);
  storeSelectedGroup = signal<string | null>(null);
  storeEntries = signal<{ key: string; value: string }[]>([]);
  storeFiles = signal<{ path: string; rel: string; name: string; ext: string; size_bytes: number; modified: string; preview: string }[]>([]);
  storeSelectedFile = signal<{ path: string; preview: string } | null>(null);

  // Data panel — IDE surface over core/orm
  ormBackend = signal<{ current: string; duck_path: string; available: string[] }>({ current: 'memium', duck_path: '', available: [] });
  ormTables = signal<{ name: string; pk: string[]; fields: string[]; medium: string; backend: string }[]>([]);
  ormSelectedTable = signal<string | null>(null);
  ormRows = signal<Record<string, any>[]>([]);
  ormCount = signal<number>(0);
  ormError = signal<string | null>(null);
  ormLoading = signal(false);
  ormDraftRow = signal<Record<string, string>>({});

  // Locales panel — IDE surface over core/go-i18n
  i18nPackages = signal<{ code: string; path: string; has_english: boolean; baseline_keys: number; locales: { name: string; path: string; keys: number; missing_vs_en: number }[] }[]>([]);
  i18nUniqueLocales = signal<string[]>([]);
  i18nLoading = signal(false);
  i18nError = signal<string | null>(null);
  i18nSelectedCell = signal<{ pkg: string; locale: string; path: string } | null>(null);
  i18nViewContent = signal<any>(null);

  // Updates panel — tool version tracking
  updatesTools = signal<{ key: string; name: string; description: string; installed: boolean; local_version?: string; latest_version?: string; latest_url?: string; up_to_date: boolean; github_repo?: string; error?: string }[]>([]);
  updatesLoading = signal(false);
  updatesNeedingAttention = computed(() => this.updatesTools().filter(t => t.installed && !t.up_to_date && t.latest_version));
  // Self-update — wraps dappco.re/go/update for the IDE binary itself
  selfUpdate = signal<{ current_version: string; repo_url: string; channel: string; platform: string; configured: boolean; checked: boolean; owner?: string; repo?: string; latest_version?: string; release_url?: string; update_available?: boolean; error?: string } | null>(null);
  selfUpdateLoading = signal(false);
  selfUpdateApplying = signal(false);

  // Memory panel — browse ~/.claude/memory/
  memoryEntries = signal<{ name: string; description: string; type: string; filename: string; path: string; size: number; modified?: string }[]>([]);
  memoryTypeCounts = signal<Record<string, number>>({});
  memoryDir = signal('');
  memoryLoading = signal(false);
  memoryFilter = signal('');
  memoryTypeFilter = signal<string | null>(null);
  memorySort = signal<'modified' | 'name' | 'type'>('modified');
  memorySearchHits = signal<{ filename: string; path: string; line: number; match: string; memory_name?: string; memory_type?: string }[]>([]);
  memorySearchActive = signal(false);
  memorySearchLoading = signal(false);
  // Last 7 days of memories — quick-access strip at the top of /memory.
  memoryRecent = computed(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.memoryEntries()
      .filter(m => {
        if (!m.modified) return false;
        const t = Date.parse(m.modified);
        return !isNaN(t) && t >= cutoff;
      })
      .slice(0, 30); // already sorted by modified desc when sort=modified
  });

  formatRelative(iso: string | undefined): string {
    if (!iso) return '';
    const t = Date.parse(iso);
    if (isNaN(t)) return '';
    const delta = (Date.now() - t) / 1000;
    if (delta < 60) return 'just now';
    if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    if (delta < 604800) return `${Math.floor(delta / 86400)}d ago`;
    return iso.slice(0, 10);
  }

  memoryVisible = computed(() => {
    const f = this.memoryFilter().trim().toLowerCase();
    const t = this.memoryTypeFilter();
    return this.memoryEntries().filter(m => {
      if (t !== null && (m.type || 'untyped') !== t) return false;
      if (!f) return true;
      return (m.name + ' ' + m.description + ' ' + m.filename).toLowerCase().includes(f);
    });
  });

  // Stream panel — wraps dappco.re/go/stream Hub
  streamStatus = signal<{ running: boolean; peer_count: number; channel_count: number; subscriber_counts: Record<string, number>; config: { heartbeat_ms: number; pong_timeout_ms: number; write_timeout_ms: number } } | null>(null);
  streamChannels = signal<{ name: string; subscriber_count: number; recent_frames: number }[]>([]);
  streamBroadcastBufCount = signal(0);
  streamSelectedChannel = signal<string | null>(null);
  streamFrames = signal<{ channel?: string; timestamp: string; frame_text: string; frame_bytes: number }[]>([]);
  streamPublishChannel = signal('');
  streamPublishBody = signal('');
  streamPublishMode = signal<'publish' | 'broadcast'>('publish');
  streamLoading = signal(false);

  // Sessions panel — wraps dappco.re/go/session for Claude Code transcript inspection
  sessionProjects = signal<{ name: string; display_path: string; path: string; session_count: number; latest_at?: string }[]>([]);
  sessionSelectedProject = signal<string | null>(null);
  sessions = signal<{ id: string; path: string; start_time?: string; end_time?: string; event_count: number; size_bytes: number }[]>([]);
  sessionSelected = signal<any | null>(null);
  sessionLiveActive = signal(false);
  sessionLiveOffset = signal(0);
  sessionLiveEvents = signal<{ timestamp: string; type?: string; role?: string; tool?: string; input?: string }[]>([]);
  sessionLiveDropped = signal(0);
  sessionLiveHeartbeat = signal(0);
  sessionLiveLastPoll = signal<string | null>(null);
  private sessionLiveTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly SESSION_LIVE_CAP = 500;
  sessionLoading = signal(false);
  sessionInspectLoading = signal(false);
  sessionFilter = signal('');
  sessionTab = signal<'browse' | 'active' | 'search'>('browse');
  sessionSearchQuery = signal('');
  sessionSearchHits = signal<{ session_id: string; timestamp: string; tool: string; match: string }[]>([]);
  sessionSearchLoading = signal(false);
  sessionSearchScope = signal<'current' | 'all'>('current');
  sessionActive = signal<{ id: string; path: string; project: string; project_path: string; size_bytes: number; modified: string; age_seconds: number }[]>([]);
  sessionActiveLoading = signal(false);
  sessionActiveSinceMinutes = signal(60);
  sessionVisible = computed(() => {
    const f = this.sessionFilter().trim().toLowerCase();
    if (!f) return this.sessionProjects();
    return this.sessionProjects().filter(p =>
      p.display_path.toLowerCase().includes(f) ||
      p.name.toLowerCase().includes(f),
    );
  });

  // Process panel — IDE surface over core/go-process Service + daemon registry
  procManaged = signal<{ id: string; command: string; args: string[]; dir: string; status: string; started_at: string; exit_code: number; duration_ms: number; pid: number }[]>([]);
  procDaemons = signal<{ code: string; daemon: string; pid: number; health: string; project: string; binary: string; started: string; alive: boolean }[]>([]);
  procTab = signal<'managed' | 'daemons'>('managed');
  procSelected = signal<string | null>(null);
  procOutput = signal<string>('');
  procPollTimer?: ReturnType<typeof setInterval>;

  // Lint panel — IDE surface over core/lint
  lintIssues = signal<{ rule_id: string; title: string; severity: string; file: string; line: number; match: string; fix: string }[]>([]);
  lintCounts = signal<{ critical: number; high: number; medium: number; low: number; info: number; total: number }>({ critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 });
  lintRunning = signal(false);
  lintError = signal<string | null>(null);
  lintFilter = signal<'all' | 'critical' | 'high' | 'medium' | 'low' | 'info'>('all');
  lintBinary = signal<string>('');
  lintDurationMs = signal<number>(0);
  lintBasePath = signal<string>('');
  lintVisible = computed(() => {
    const filter = this.lintFilter();
    const all = this.lintIssues();
    if (filter === 'all') return all;
    return all.filter(i => i.severity === filter);
  });

  // Containers panel — IDE surface over go-container's runtime detection.
  containerRuntimes = signal<{ name: string; available: boolean; version?: string; path?: string; description: string; has_gpu: boolean; has_network_isolation: boolean; has_volume_mounts: boolean; has_encryption: boolean; hardware_isolated: boolean; sub_second_start: boolean }[]>([]);
  containerList = signal<{ id: string; name?: string; image: string; status: string; runtime: string; created?: string }[]>([]);
  containerLoading = signal(false);
  containerError = signal<string | null>(null);
  containerSelected = signal<string | null>(null);
  containerLogs = signal<string>('');

  // Build panel — IDE surface over go-build's pipeline.
  buildDetected = signal<{ project_type: string; command: string; args: string[]; core_bin_on_path: boolean } | null>(null);
  buildProcessId = signal<string | null>(null);
  buildLog = signal<string>('');
  buildRunning = signal(false);
  buildError = signal<string | null>(null);
  private buildPollTimer?: ReturnType<typeof setInterval>;

  // Plugin menus — installed marketplace modules that declare a Menu
  // contribute to the IDE sidebar's "Plugins" group. The IDE frame
  // literally is the union of installed plugin menus (CoreApp pattern).
  pluginMenus = signal<{ code: string; name: string; native_tag?: string; default_mode?: string; entrypoint?: string; menu?: { label: string; icon_svg?: string; subpages?: { label: string; path: string }[] } }[]>([]);

  // Embedded plugin panel — when set, the marketplace block shows the
  // plugin's web interface inside the IDE. Three modes:
  //   - 'iframe': sandboxed by origin via <iframe>, plugin runs unchanged
  //   - 'native': plugin's custom element mounted directly in host DOM,
  //               talks to plugin API via fetch (Mining-route pattern)
  //   - detached window (no embed) — see runPlugin()
  embeddedPlugin = signal<{ code: string; name: string; url: string; mode: 'iframe' | 'native'; tag?: string } | null>(null);

  // Marketplace — drives the Marketplace route via /mcp/call pkg_*
  marketQuery = signal('');
  marketCategory = signal('');
  marketModules = signal<{ code: string; name: string; version?: string; repo?: string; category?: string; entrypoint?: string; description?: string }[]>([]);
  marketInstalled = signal<{ code: string; name: string; version: string; entry_point?: string }[]>([]);
  marketLoading = signal(false);
  marketBusy = signal<string | null>(null);
  marketError = signal<string | null>(null);
  marketMessage = signal<string | null>(null);
  marketLoadedOnce = false;

  // Workspace explorer state — drives the Explorer view via /mcp/call
  workspaceRoot = signal('/Users/snider/Code/core/ide');
  currentPath = signal('/Users/snider/Code/core/ide');
  dirEntries = signal<{ name: string; is_dir: boolean; type: string }[]>([]);
  explorerLoading = signal(false);

  // Multi-file editor — each open file gets its own tab + Monaco model.
  openFiles = signal<{ path: string; content: string; language: string; dirty: boolean }[]>([]);
  activeFileIdx = signal<number>(-1);
  activeFile = computed(() => {
    const idx = this.activeFileIdx();
    const files = this.openFiles();
    return idx >= 0 && idx < files.length ? files[idx] : null;
  });

  // Chat panel visibility — close button hides; toolbar Ask Vi pill brings back.
  chatVisible = signal(true);

  pathSegments = computed(() => {
    const p = this.currentPath();
    const parts = p.split('/').filter(Boolean);
    const segs: { name: string; path: string }[] = [{ name: '/', path: '/' }];
    let acc = '';
    for (const part of parts) {
      acc += '/' + part;
      segs.push({ name: part, path: acc });
    }
    return segs;
  });

  greenCount = computed(() => this.sites().filter((s) => s.status === 'green').length);

  briefSubtitle = computed(() => {
    const all = this.briefs();
    const open = all.filter((b) => !b.done).length;
    if (all.length === 0) return 'loading…';
    return open === 0 ? 'all caught up' : `${open} open · ${all.length - open} closed today`;
  });

  constructor(@Inject(PLATFORM_ID) platformId: Object, private sanitizer: DomSanitizer) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // safeEmbeddedPluginUrl bypasses Angular's URL sanitization for the
  // plugin's iframe src. The iframe runs the plugin in its own browsing
  // context — origin isolation is the sandbox boundary, not Angular's
  // string-blocking. (Plugins served from /plugin/<code>/ are 127.0.0.1
  // origin; Angular still strips the URL without bypassSecurityTrust.)
  safeEmbeddedPluginUrl(): SafeResourceUrl | null {
    const ep = this.embeddedPlugin();
    if (!ep) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(ep.url);
  }

  safePluginRouteUrl(base: string, sub: string): SafeResourceUrl {
    const url = sub ? base.replace(/\/$/, '') + '/' + sub : base;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngOnInit() {
    if (!this.isBrowser) return;

    import('@wailsio/runtime').then(({ Events }) => {
      this.timeEventCleanup = Events.On('time', (time: { data: string }) => {
        this.currentTime.set(time.data);
      });
    });

    loadViData()
      .then((snap) => {
        this.vi.set(snap.status);
        this.briefs.set(snap.briefs);
        this.sites.set(snap.sites);
        this.activity.set(snap.activity);
      })
      .catch((err) => {
        console.warn('[vi] loadViData failed:', err);
      });

    // Restore persisted UI state from ~/.core/config.yaml. Failure (no
    // config yet) is silent — we just keep the defaults.
    this.loadUIState();

    // Load installed-plugin menus so the sidebar's Plugins group renders
    // immediately. Re-runs after install/remove via reloadPluginMenus().
    void this.loadPluginMenus();
  }

  ngOnDestroy() {
    this.timeEventCleanup?.();
    // Best-effort flush of any pending save before component teardown.
    this.flushUIState();
  }

  private uiSaveTimer?: ReturnType<typeof setTimeout>;
  private uiSaveSuppressed = true; // suppress saves during initial load

  private async loadUIState() {
    try {
      const res = await fetch('http://127.0.0.1:9877/internal/ui-state');
      const data = await res.json();
      const ui = (data?.ui ?? {}) as Record<string, any>;

      // Restore user settings first — they shape downstream defaults.
      // dappco.re/go/config lowercases YAML keys (editorFontSize → editorfontsize),
      // so look up each default key by both its camelCase form and its all-lowercase
      // form when merging the persisted blob back in.
      if (ui['settings'] && typeof ui['settings'] === 'object') {
        const loaded = ui['settings'] as Record<string, any>;
        const merged: Record<string, any> = { ...this.defaultSettings };
        for (const key of Object.keys(this.defaultSettings)) {
          const lk = key.toLowerCase();
          if (key in loaded) merged[key] = loaded[key];
          else if (lk in loaded) merged[key] = loaded[lk];
        }
        this.settings.set(merged as any);
      }
      const s = this.settings();
      // Apply launch-time settings before per-session ui state overrides.
      this.workspaceRoot.set(s.workspaceRoot);
      this.currentPath.set(s.workspaceRoot);
      this.currentRoute.set(s.defaultRoute);
      this.chatVisible.set(s.chatVisibleOnLaunch);

      if (typeof ui['chat_visible'] === 'boolean') this.chatVisible.set(ui['chat_visible']);
      if (typeof ui['route'] === 'string') this.currentRoute.set(ui['route'] as string);
      if (typeof ui['workspace_root'] === 'string') {
        this.workspaceRoot.set(ui['workspace_root']);
        this.currentPath.set(ui['workspace_root']);
      }
      if (Array.isArray(ui['open_files'])) {
        const files: string[] = (ui['open_files'] as any[]).filter((p) => typeof p === 'string');
        // Re-open the persisted tabs in order.
        for (const path of files) {
          const data = await this.bridgeCall('file_read', { path });
          if (!data.ok) continue;
          const lang = await this.bridgeCall('lang_detect', { path });
          this.openFiles.update((arr) => [
            ...arr,
            {
              path,
              content: typeof data.value === 'string' ? data.value : JSON.stringify(data.value, null, 2),
              language: (lang.language as string) || 'plaintext',
              dirty: false,
            },
          ]);
        }
        if (typeof ui['active_tab_idx'] === 'number') {
          const idx = ui['active_tab_idx'] as number;
          if (idx >= 0 && idx < this.openFiles().length) this.activeFileIdx.set(idx);
        } else if (this.openFiles().length > 0) {
          this.activeFileIdx.set(0);
        }
      }
    } catch (e) {
      console.warn('[ui-state] load failed (likely first run):', e);
    } finally {
      // After initial load, allow change-driven saves.
      this.uiSaveSuppressed = false;
    }
  }

  /** Schedule a debounced UI-state save; coalesces rapid changes. */
  saveUIState() {
    if (this.uiSaveSuppressed) return;
    if (this.uiSaveTimer) clearTimeout(this.uiSaveTimer);
    this.uiSaveTimer = setTimeout(() => this.flushUIState(), 400);
  }

  private flushUIState() {
    if (this.uiSaveSuppressed) return;
    if (this.uiSaveTimer) {
      clearTimeout(this.uiSaveTimer);
      this.uiSaveTimer = undefined;
    }
    const state = {
      chat_visible: this.chatVisible(),
      route: this.currentRoute(),
      workspace_root: this.workspaceRoot(),
      open_files: this.openFiles().map((f) => f.path),
      active_tab_idx: this.activeFileIdx(),
      settings: this.settings(),
    };
    fetch('http://127.0.0.1:9877/internal/ui-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
      keepalive: true,
    }).catch((e) => console.warn('[ui-state] save failed:', e));
  }

  onRouteChange(route: string) {
    this.currentRoute.set(route);
    if (route === 'explorer' && this.dirEntries().length === 0) {
      void this.loadDir(this.currentPath());
    }
    if (route === 'git') {
      void this.refreshGit();
    }
    if (route === 'marketplace' && !this.marketLoadedOnce) {
      void this.loadMarketplace();
    }
    if (route.startsWith('plugin:')) {
      // Plugin route — make sure menus are loaded so we can render
      // the active plugin's frame.
      if (this.pluginMenus().length === 0) void this.loadPluginMenus();
    }
    if (route === 'repos' && !this.reposLoadedOnce) {
      void this.loadRepos();
    }
    if (route === 'build' && !this.buildDetected()) {
      void this.detectBuild();
    }
    if (route === 'containers' && this.containerRuntimes().length === 0) {
      void this.loadContainers();
    }
    if (route === 'lint' && this.lintIssues().length === 0 && !this.lintRunning() && !this.lintError()) {
      void this.runLint();
    }
    if (route === 'updates' && this.updatesTools().length === 0) {
      void this.loadUpdates();
      void this.loadSelfUpdate();
    }
    if (route === 'sessions' && this.sessionProjects().length === 0) {
      void this.loadSessionProjects();
    }
    if (route === 'sessions' && this.sessionTab() === 'active' && this.sessionActive().length === 0) {
      void this.loadActiveSessions();
    }
    if (route === 'stream') {
      void this.loadStream();
    }
    if (route === 'memory' && this.memoryEntries().length === 0) {
      void this.loadMemoryEntries();
    }
    if (route === 'process') {
      void this.refreshProcesses();
      // Auto-refresh every 2s while on the panel
      if (this.procPollTimer) clearInterval(this.procPollTimer);
      this.procPollTimer = setInterval(() => void this.refreshProcesses(), 2000);
    } else if (this.procPollTimer) {
      clearInterval(this.procPollTimer);
      this.procPollTimer = undefined;
    }
    if (route === 'locales' && this.i18nPackages().length === 0 && !this.i18nLoading()) {
      void this.scanLocales();
    }
    if (route === 'data' && this.ormTables().length === 0 && !this.ormLoading()) {
      void this.loadOrm();
    }
    if (route === 'store') {
      void this.loadStore();
    }
    if (route === 'tenant' && !this.tenantStatus()) {
      void this.loadTenantStatus();
    }
    if (route === 'forge' && !this.forgeStatus()) {
      void this.loadForge();
    }
    if (route === 'devops' && this.devopsPlaybooks().length === 0) {
      void this.loadDevopsPlaybooks();
    }
    if (route === 'php' && this.phpProjects().length === 0) {
      void this.loadPHPProjects();
    }
    if (route === 'ts' && this.tsProjects().length === 0) {
      void this.loadTSProjects();
    }
    this.saveUIState();
  }

  // TS panel — TypeScript / Deno surface
  async loadTSProjects() {
    this.tsLoading.set(true);
    try {
      const res = await this.bridgeCall('ts_detect', {});
      if (res.ok) {
        this.tsProjects.set(res.value?.projects || []);
        if ((res.value?.projects || []).length > 0 && !this.tsSelected()) {
          this.tsSelected.set(res.value.projects[0]);
        }
      }
    } finally {
      this.tsLoading.set(false);
    }
  }

  selectTSProject(p: any) {
    this.tsSelected.set(p);
  }

  async runTSScript(p: { path: string; package_manager: string }, scriptName: string) {
    const res = await this.bridgeCall('ts_script', {
      path: p.path,
      script: scriptName,
      package_manager: p.package_manager,
    });
    if (res.ok) {
      this.currentRoute.set('process');
      this.saveUIState();
    }
  }

  // PHP panel — core/php surface
  async loadPHPProjects() {
    this.phpLoading.set(true);
    this.phpError.set(null);
    try {
      const res = await this.bridgeCall('php_detect', {});
      if (res.ok) {
        const projects = res.value?.projects || [];
        this.phpProjects.set(projects);
        if (projects.length > 0 && !this.phpSelected()) {
          await this.selectPHPProject(projects[0].path);
        }
      } else {
        this.phpError.set(res.error || 'php_detect failed');
      }
    } finally {
      this.phpLoading.set(false);
    }
  }

  async selectPHPProject(path: string) {
    const res = await this.bridgeCall('php_project', { path });
    if (res.ok) {
      this.phpSelected.set(res.value);
      void this.loadPHPScripts(path);
    } else {
      this.phpError.set(res.error || 'php_project failed');
    }
  }

  async loadPHPScripts(path: string) {
    this.phpScriptsLoading.set(true);
    this.phpScripts.set(null);
    try {
      const res = await this.bridgeCall('php_scripts', { path });
      if (res.ok) this.phpScripts.set(res.value);
    } finally {
      this.phpScriptsLoading.set(false);
    }
  }

  async runPHPScript(path: string, mode: 'composer' | 'artisan' | 'raw', extra: { name?: string; args?: string[]; command?: string }) {
    const params: Record<string, unknown> = { path, mode, ...extra };
    const res = await this.bridgeCall('php_run', params);
    if (res.ok) {
      this.currentRoute.set('process');
      void this.refreshProcesses();
    }
  }

  async openPHPArtisan(path: string, target: string) {
    // Spawn `php artisan <target>` in the project root via process_start
    const res = await this.bridgeCall('process_start', {
      command: 'sh',
      args: ['-c', `cd '${path}' && php artisan ${target}`],
    });
    if (res.ok) {
      // Jump to /process so user can watch output
      this.currentRoute.set('process');
      this.saveUIState();
    } else {
      this.phpError.set(res.error || 'artisan run failed');
    }
  }

  // DevOps panel — core/go-devops surface
  async runDevopsSecretScan() {
    if (this.devopsScanRunning()) return;
    this.devopsScanRunning.set(true);
    this.devopsScanError.set(null);
    this.devopsFindings.set([]);
    this.devopsRules.set([]);
    const tool = this.devopsScanner() === 'gitleaks' ? 'devops_gitleaks' : 'devops_secrets_scan';
    const path = this.workspaceRoot();
    this.devopsBasePath.set(path);
    try {
      const res = await this.bridgeCall(tool, { path });
      if (res.ok) {
        const v = res.value || {};
        this.devopsFindings.set(v.findings || []);
        this.devopsRules.set(v.rules || []);
      } else {
        this.devopsScanError.set(res.error || 'scan failed');
      }
    } catch (e: any) {
      this.devopsScanError.set('devops bridge error: ' + (e?.message || String(e)));
    } finally {
      this.devopsScanRunning.set(false);
    }
  }

  async loadDevopsPlaybooks() {
    this.devopsPlaybooksLoading.set(true);
    const res = await this.bridgeCall('devops_playbooks', {});
    if (res.ok) {
      this.devopsPlaybooks.set(res.value?.playbooks || []);
    }
    this.devopsPlaybooksLoading.set(false);
  }

  async openDevopsFinding(f: { file: string; line: number }) {
    const base = this.devopsBasePath() || this.workspaceRoot();
    const fullPath = f.file.startsWith('/') ? f.file : (base.replace(/\/$/, '') + '/' + f.file);
    await this.openSearchResult({ path: fullPath, line: f.line });
  }

  async openPlaybook(p: { path: string }) {
    await this.openSearchResult({ path: p.path, line: 1 });
  }

  // Forge panel — core/go-forge surface
  async loadForge() {
    this.forgeLoading.set(true);
    this.forgeError.set(null);
    try {
      const [statusRes, orgsRes, notesRes] = await Promise.all([
        this.bridgeCall('forge_status', {}),
        this.bridgeCall('forge_orgs', {}),
        this.bridgeCall('forge_notifications', {}),
      ]);
      if (statusRes.ok) this.forgeStatus.set(statusRes.value);
      if (orgsRes.ok) {
        const orgs = orgsRes.value?.orgs || [];
        this.forgeOrgs.set(orgs);
        if (orgs.length > 0 && !this.forgeSelectedOrg()) {
          this.forgeSelectedOrg.set(orgs[0].name);
          await this.loadForgeRepos(orgs[0].name);
        }
      }
      if (notesRes.ok) this.forgeNotifications.set(notesRes.value?.notifications || []);
    } catch (e: any) {
      this.forgeError.set('forge bridge error: ' + (e?.message || String(e)));
    } finally {
      this.forgeLoading.set(false);
    }
  }

  async loadForgeRepos(org: string) {
    this.forgeSelectedOrg.set(org);
    this.forgeSelectedRepo.set('');
    this.forgeIssues.set([]);
    this.forgePulls.set([]);
    const res = await this.bridgeCall('forge_repos', { org });
    if (res.ok) this.forgeRepos.set(res.value?.repos || []);
    else this.forgeError.set(res.error || 'forge_repos failed');
  }

  async loadForgeRepo(repo: string) {
    this.forgeSelectedRepo.set(repo);
    const owner = this.forgeSelectedOrg();
    const [issuesRes, pullsRes] = await Promise.all([
      this.bridgeCall('forge_issues', { owner, repo }),
      this.bridgeCall('forge_pulls', { owner, repo }),
    ]);
    if (issuesRes.ok) this.forgeIssues.set(issuesRes.value?.issues || []);
    if (pullsRes.ok) this.forgePulls.set(pullsRes.value?.pulls || []);
  }

  // Tenant panel — core/go-tenant surface
  async loadTenantStatus() {
    const res = await this.bridgeCall('tenant_status', {});
    if (res.ok) {
      this.tenantStatus.set(res.value);
    }
  }

  async tenantLookupWorkspace() {
    const slug = this.tenantWorkspaceLookup().trim();
    if (!slug) return;
    this.tenantWorkspaceError.set(null);
    this.tenantWorkspaceResult.set(null);
    const res = await this.bridgeCall('tenant_workspace', { slug });
    if (res.ok) {
      this.tenantWorkspaceResult.set(res.value);
    } else {
      this.tenantWorkspaceError.set(res.error || 'workspace lookup failed');
    }
  }

  async tenantLookupUser() {
    this.tenantUserResult.set(null);
    const res = await this.bridgeCall('tenant_user', {});
    if (res.ok) {
      this.tenantUserResult.set(res.value);
    } else {
      this.tenantUserResult.set({ error: res.error || 'user lookup failed' });
    }
  }

  tenantCanField(field: 'workspace' | 'feature' | 'quantity', value: string) {
    this.tenantCanForm.update(f => ({
      ...f,
      [field]: field === 'quantity' ? Math.max(1, parseInt(value) || 1) : value,
    }));
  }

  async runTenantCan() {
    const form = this.tenantCanForm();
    if (!form.workspace || !form.feature) return;
    this.tenantCanError.set(null);
    this.tenantCanResult.set(null);
    const res = await this.bridgeCall('tenant_can', {
      workspace_slug: form.workspace,
      feature: form.feature,
      quantity: form.quantity,
    });
    if (res.ok) {
      this.tenantCanResult.set(res.value);
    } else {
      this.tenantCanError.set(res.error || 'entitlement check failed');
    }
  }

  // Store panel — go-store surface
  async loadStore() {
    const [groupsRes, filesRes] = await Promise.all([
      this.bridgeCall('store_groups', {}),
      this.bridgeCall('store_files', {}),
    ]);
    if (groupsRes.ok) this.storeGroups.set(groupsRes.value?.groups || []);
    if (filesRes.ok) this.storeFiles.set(filesRes.value?.files || []);
  }

  async selectStoreGroup(name: string) {
    this.storeSelectedGroup.set(name);
    const res = await this.bridgeCall('store_entries', { group: name, limit: 200 });
    if (res.ok) {
      this.storeEntries.set(res.value?.entries || []);
    }
  }

  async deleteStoreEntry(group: string, key: string) {
    const res = await this.bridgeCall('store_delete', { group, key });
    if (res.ok) {
      await this.selectStoreGroup(group);
      await this.loadStore();
    }
  }

  selectStoreFile(file: { path: string; preview: string }) {
    this.storeSelectedFile.set(file);
  }

  async openStoreFileInEditor(file: { path: string }) {
    await this.openSearchResult({ path: file.path, line: 1 });
  }

  // Data panel — core/orm surface
  async loadOrm() {
    this.ormLoading.set(true);
    this.ormError.set(null);
    try {
      const [tablesRes, backendRes] = await Promise.all([
        this.bridgeCall('orm_tables', {}),
        this.bridgeCall('orm_backend', {}),
      ]);
      if (!tablesRes.ok) {
        this.ormError.set(tablesRes.error || 'orm_tables failed');
        return;
      }
      if (backendRes.ok) {
        this.ormBackend.set(backendRes.value);
      }
      const tables = tablesRes.value?.tables || [];
      this.ormTables.set(tables);
      if (tables.length > 0 && !this.ormSelectedTable()) {
        this.ormSelectedTable.set(tables[0].name);
      }
      await this.refreshOrmRows();
    } catch (e: any) {
      this.ormError.set('orm bridge error: ' + (e?.message || String(e)));
    } finally {
      this.ormLoading.set(false);
    }
  }

  async switchOrmBackend(name: string) {
    this.ormError.set(null);
    const res = await this.bridgeCall('orm_backend', { name });
    if (res.ok) {
      this.ormBackend.set({ ...this.ormBackend(), current: res.value?.current, duck_path: res.value?.duck_path });
      // Tables surface includes "backend" — reload so the badge updates.
      const tablesRes = await this.bridgeCall('orm_tables', {});
      if (tablesRes.ok) this.ormTables.set(tablesRes.value?.tables || []);
      await this.refreshOrmRows();
    } else {
      this.ormError.set(res.error || 'switch failed');
    }
  }

  async refreshOrmRows() {
    const table = this.ormSelectedTable();
    if (!table) return;
    const [getRes, countRes] = await Promise.all([
      this.bridgeCall('orm_get', { table, limit: 100 }),
      this.bridgeCall('orm_count', { table }),
    ]);
    if (getRes.ok) {
      this.ormRows.set(Array.isArray(getRes.value) ? getRes.value : []);
    } else {
      this.ormError.set(getRes.error || 'orm_get failed');
    }
    if (countRes.ok) {
      this.ormCount.set(typeof countRes.value === 'number' ? countRes.value : 0);
    }
  }

  selectOrmTable(name: string) {
    this.ormSelectedTable.set(name);
    this.ormDraftRow.set({});
    void this.refreshOrmRows();
  }

  ormDraftField(field: string, value: string) {
    this.ormDraftRow.update(r => ({ ...r, [field]: value }));
  }

  async saveOrmDraft() {
    const table = this.ormSelectedTable();
    if (!table) return;
    const draft = this.ormDraftRow();
    if (!draft['id']) {
      // Auto-assign next id for the demo Note table
      const maxId = this.ormRows().reduce((m, r) => Math.max(m, Number(r['id']) || 0), 0);
      draft['id'] = String(maxId + 1);
    }
    if (!draft['created_at']) {
      draft['created_at'] = new Date().toISOString();
    }
    // Coerce id to number; keep strings for everything else
    const row: Record<string, any> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (k === 'id') row[k] = Number(v);
      else row[k] = v;
    }
    const res = await this.bridgeCall('orm_save', { table, row });
    if (res.ok) {
      this.ormDraftRow.set({});
      await this.refreshOrmRows();
    } else {
      this.ormError.set(res.error || 'save failed');
    }
  }

  ormTableSpec(name: string) {
    return this.ormTables().find(t => t.name === name) || null;
  }

  ormTableFields(name: string | null): string[] {
    if (!name) return [];
    return this.ormTableSpec(name)?.fields || [];
  }

  async deleteOrmRow(row: Record<string, any>, table: string) {
    const tableSpec = this.ormTableSpec(table);
    if (!tableSpec) return;
    const pkField = tableSpec.pk[0];
    const res = await this.bridgeCall('orm_delete', { table, field: pkField, value: row[pkField] });
    if (res.ok) {
      await this.refreshOrmRows();
    } else {
      this.ormError.set(res.error || 'delete failed');
    }
  }

  // Locales panel — core/go-i18n surface
  async scanLocales() {
    if (this.i18nLoading()) return;
    this.i18nLoading.set(true);
    this.i18nError.set(null);
    try {
      const res = await this.bridgeCall('i18n_scan', {});
      if (res.ok) {
        this.i18nPackages.set(res.value?.packages || []);
        this.i18nUniqueLocales.set(res.value?.unique_locales || []);
      } else {
        this.i18nError.set(res.error || 'i18n_scan failed');
      }
    } catch (e: any) {
      this.i18nError.set('i18n bridge error: ' + (e?.message || String(e)));
    } finally {
      this.i18nLoading.set(false);
    }
  }

  async openLocaleCell(pkg: string, locale: string, path: string) {
    this.i18nSelectedCell.set({ pkg, locale, path });
    this.i18nViewContent.set('Loading…');
    const res = await this.bridgeCall('i18n_view', { path });
    if (res.ok) {
      this.i18nViewContent.set(res.value?.content);
    } else {
      this.i18nViewContent.set('Error: ' + (res.error || 'i18n_view failed'));
    }
  }

  // Pretty-print a JSON tree for the cell drill-down view.
  formatLocaleContent(content: any): string {
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }

  i18nFindLocale(pkg: { locales: { name: string; keys: number; missing_vs_en: number; path: string }[] }, locale: string) {
    return pkg.locales.find(l => l.name === locale) || null;
  }

  // Updates panel
  async loadUpdates() {
    this.updatesLoading.set(true);
    try {
      const res = await this.bridgeCall('updates_list', {});
      if (res.ok) this.updatesTools.set(res.value?.tools || []);
    } finally {
      this.updatesLoading.set(false);
    }
  }

  async refreshUpdate(key: string) {
    this.updatesLoading.set(true);
    try {
      const res = await this.bridgeCall('updates_refresh', { key });
      if (res.ok) {
        const fresh = res.value?.tools || [];
        // Merge: replace the single refreshed tool back into the array
        const map = new Map(this.updatesTools().map(t => [t.key, t]));
        for (const t of fresh) map.set(t.key, t);
        this.updatesTools.set(Array.from(map.values()));
      }
    } finally {
      this.updatesLoading.set(false);
    }
  }

  async refreshAllUpdates() {
    this.updatesLoading.set(true);
    try {
      const res = await this.bridgeCall('updates_refresh', {});
      if (res.ok) this.updatesTools.set(res.value?.tools || []);
    } finally {
      this.updatesLoading.set(false);
    }
  }

  async loadSelfUpdate() {
    this.selfUpdateLoading.set(true);
    try {
      const res = await this.bridgeCall('selfupdate_status', {});
      if (res.ok) this.selfUpdate.set(res.value || null);
    } finally {
      this.selfUpdateLoading.set(false);
    }
  }

  async applySelfUpdate() {
    if (!confirm('Download and replace core-ide binary in place? You will need to quit and relaunch.')) return;
    this.selfUpdateApplying.set(true);
    try {
      const res = await this.bridgeCall('selfupdate_apply', {});
      if (res.ok) {
        alert(`Updated to ${res.value?.updated_to}. Quit and relaunch core-ide.`);
        await this.loadSelfUpdate();
      } else {
        alert(`Self-update failed: ${res.error}`);
      }
    } finally {
      this.selfUpdateApplying.set(false);
    }
  }

  // Memory panel
  async loadMemoryEntries() {
    this.memoryLoading.set(true);
    try {
      const res = await this.bridgeCall('memory_list', { sort: this.memorySort() });
      if (res.ok) {
        this.memoryEntries.set(res.value?.memories || []);
        this.memoryTypeCounts.set(res.value?.type_counts || {});
        this.memoryDir.set(res.value?.dir || '');
      }
    } finally {
      this.memoryLoading.set(false);
    }
  }

  async openMemoryEntry(path: string, line: number = 1) {
    await this.openSearchResult({ path, line });
  }

  async runMemorySearch(query: string) {
    const q = query.trim();
    if (q.length < 2) {
      this.memorySearchHits.set([]);
      this.memorySearchActive.set(false);
      return;
    }
    this.memorySearchLoading.set(true);
    this.memorySearchActive.set(true);
    try {
      const res = await this.bridgeCall('memory_search', { query: q });
      if (res.ok) this.memorySearchHits.set(res.value?.hits || []);
    } finally {
      this.memorySearchLoading.set(false);
    }
  }

  exitMemorySearch() {
    this.memorySearchActive.set(false);
    this.memorySearchHits.set([]);
  }

  memoryTypeEntries(): { type: string; count: number }[] {
    return Object.entries(this.memoryTypeCounts())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Stream panel
  async loadStream() {
    this.streamLoading.set(true);
    try {
      const status = await this.bridgeCall('stream_status', {});
      if (status.ok) this.streamStatus.set(status.value);
      const channels = await this.bridgeCall('stream_channels', {});
      if (channels.ok) {
        this.streamChannels.set(channels.value?.channels || []);
        this.streamBroadcastBufCount.set(channels.value?.broadcast_buf || 0);
      }
      const sel = this.streamSelectedChannel();
      if (sel !== null) {
        await this.loadStreamFrames(sel);
      }
    } finally {
      this.streamLoading.set(false);
    }
  }

  async loadStreamFrames(channel: string | null) {
    this.streamSelectedChannel.set(channel);
    const params: Record<string, string> = {};
    if (channel) params['channel'] = channel;
    const res = await this.bridgeCall('stream_recent', params);
    if (res.ok) this.streamFrames.set((res.value?.frames || []).slice().reverse());
  }

  // Frame parsing: try to JSON-parse; if it works, pretty-print + extract a
  // clickable path if one exists. Falls back to raw text. Cached on the frame
  // itself to avoid re-parsing on every render tick.
  parseStreamFrame(frame: { frame_text: string }): { isJson: boolean; pretty?: string; raw: string; clickablePath?: string } {
    const raw = frame.frame_text;
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return { isJson: false, raw };
    }
    try {
      const parsed = JSON.parse(trimmed);
      let clickablePath: string | undefined;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const candidate = parsed['path'] || parsed['file'] || parsed['file_path'];
        if (typeof candidate === 'string' && candidate.startsWith('/')) {
          clickablePath = candidate;
        }
      }
      return {
        isJson: true,
        pretty: JSON.stringify(parsed, null, 2),
        raw,
        clickablePath,
      };
    } catch {
      return { isJson: false, raw };
    }
  }

  streamFrameRawMode = signal<Set<number>>(new Set());
  toggleStreamFrameRaw(idx: number) {
    const s = new Set(this.streamFrameRawMode());
    if (s.has(idx)) s.delete(idx); else s.add(idx);
    this.streamFrameRawMode.set(s);
  }

  async openStreamFramePath(path: string) {
    await this.openSearchResult({ path, line: 1 });
  }

  async publishStreamFrame() {
    const mode = this.streamPublishMode();
    const channel = this.streamPublishChannel().trim();
    const frame = this.streamPublishBody();
    if (mode === 'publish' && !channel) return;
    const res = await this.bridgeCall('stream_publish', { mode, channel, frame });
    if (res.ok) {
      this.streamPublishBody.set('');
      await this.loadStream();
    }
  }

  async loadActiveSessions() {
    this.sessionActiveLoading.set(true);
    try {
      const res = await this.bridgeCall('session_active_list', { since_minutes: this.sessionActiveSinceMinutes() });
      if (res.ok) this.sessionActive.set(res.value?.active || []);
    } finally {
      this.sessionActiveLoading.set(false);
    }
  }

  async openActiveSession(entry: { path: string; id: string }) {
    // Inspect uses the file size from sessions(); for active mode we don't
    // have that, so seed manually.
    this.stopSessionLive();
    this.sessionLiveEvents.set([]);
    this.sessionLiveDropped.set(0);
    this.sessionLiveHeartbeat.set(0);
    this.sessionInspectLoading.set(true);
    try {
      const res = await this.bridgeCall('session_inspect', { path: entry.path, limit: 200 });
      if (res.ok) {
        this.sessionSelected.set(res.value);
        // Use the most recent active list size as the offset baseline.
        const active = this.sessionActive().find(a => a.path === entry.path);
        this.sessionLiveOffset.set(active?.size_bytes || 0);
      }
    } finally {
      this.sessionInspectLoading.set(false);
    }
  }

  async runSessionSearch() {
    const q = this.sessionSearchQuery().trim();
    if (q.length < 2) {
      this.sessionSearchHits.set([]);
      return;
    }
    // Resolve project_dir: 'current' uses the currently-selected project on
    // Browse tab, falling back to the largest active. 'all' iterates every
    // project_dir from the projects list and merges hits.
    let projects: string[] = [];
    if (this.sessionSearchScope() === 'all') {
      projects = this.sessionProjects().map(p => p.path);
    } else {
      const current = this.sessionSelectedProject();
      if (current) {
        projects = [current];
      } else if (this.sessionProjects().length > 0) {
        projects = [this.sessionProjects()[0].path];
      }
    }
    if (projects.length === 0) return;
    this.sessionSearchLoading.set(true);
    try {
      const allHits: { session_id: string; timestamp: string; tool: string; match: string }[] = [];
      for (const project_dir of projects) {
        const res = await this.bridgeCall('session_search', { project_dir, query: q });
        if (res.ok && res.value?.hits) {
          allHits.push(...res.value.hits);
        }
      }
      allHits.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      this.sessionSearchHits.set(allHits);
    } finally {
      this.sessionSearchLoading.set(false);
    }
  }

  async openSessionSearchHit(hit: { session_id: string }) {
    // Find the session in any project's session list. If we haven't loaded
    // sessions for the matching project yet, scan all projects.
    const direct = this.sessions().find(s => s.id === hit.session_id);
    if (direct) {
      this.sessionTab.set('browse');
      void this.inspectSession(direct.path);
      return;
    }
    // Look across all projects for the matching session id.
    for (const proj of this.sessionProjects()) {
      const res = await this.bridgeCall('session_list', { project_dir: proj.path });
      if (!res.ok) continue;
      const match = (res.value?.sessions || []).find((s: { id: string }) => s.id === hit.session_id);
      if (match) {
        this.sessionTab.set('browse');
        await this.selectSessionProject(proj.path);
        void this.inspectSession(match.path);
        return;
      }
    }
  }

  formatAge(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
  }

  // Sessions panel — Claude Code transcript inspector
  async loadSessionProjects() {
    this.sessionLoading.set(true);
    try {
      const res = await this.bridgeCall('session_projects_list', {});
      if (res.ok) this.sessionProjects.set(res.value?.projects || []);
    } finally {
      this.sessionLoading.set(false);
    }
  }

  async selectSessionProject(projectPath: string) {
    this.sessionSelectedProject.set(projectPath);
    this.sessions.set([]);
    this.sessionSelected.set(null);
    this.sessionLoading.set(true);
    try {
      const res = await this.bridgeCall('session_list', { project_dir: projectPath });
      if (res.ok) this.sessions.set(res.value?.sessions || []);
    } finally {
      this.sessionLoading.set(false);
    }
  }

  async inspectSession(path: string) {
    this.stopSessionLive();
    this.sessionLiveEvents.set([]);
    this.sessionLiveDropped.set(0);
    this.sessionLiveHeartbeat.set(0);
    this.sessionLiveLastPoll.set(null);
    this.sessionInspectLoading.set(true);
    try {
      const res = await this.bridgeCall('session_inspect', { path, limit: 200 });
      if (res.ok) {
        this.sessionSelected.set(res.value);
        // Seed offset from the file size we know about so live-tail picks
        // up only NEW events from this point forward.
        const size = (this.sessions().find(s => s.path === path)?.size_bytes) || 0;
        this.sessionLiveOffset.set(size);
      }
    } finally {
      this.sessionInspectLoading.set(false);
    }
  }

  toggleSessionLive() {
    if (this.sessionLiveActive()) {
      this.stopSessionLive();
    } else {
      this.startSessionLive();
    }
  }

  startSessionLive() {
    const sel = this.sessionSelected();
    if (!sel?.path) return;
    this.sessionLiveActive.set(true);
    void this.pollSessionLive();
    this.sessionLiveTimer = setInterval(() => {
      void this.pollSessionLive();
    }, 3000);
  }

  stopSessionLive() {
    if (this.sessionLiveTimer) {
      clearInterval(this.sessionLiveTimer);
      this.sessionLiveTimer = null;
    }
    this.sessionLiveActive.set(false);
  }

  async pollSessionLive() {
    const sel = this.sessionSelected();
    if (!sel?.path) return;
    const res = await this.bridgeCall('session_tail', {
      path: sel.path,
      since_offset: this.sessionLiveOffset(),
      limit: 200,
    });
    if (!res.ok) return;
    // Heartbeat ticks on every successful poll so the UI shows pulse
    // even when no events arrive. Wraps at 1000 for stable comparison.
    this.sessionLiveHeartbeat.update(n => (n + 1) % 1000);
    this.sessionLiveLastPoll.set(new Date().toISOString());
    const events = (res.value?.events || []).filter((e: { timestamp?: string }) => !!e.timestamp);
    if (events.length > 0) {
      const wasAtBottom = this.isLiveTailAtBottom();
      let combined = [...this.sessionLiveEvents(), ...events];
      // Cap the buffer; track drops for the UI indicator.
      const cap = IdeComponent.SESSION_LIVE_CAP;
      if (combined.length > cap) {
        const drop = combined.length - cap;
        this.sessionLiveDropped.update(n => n + drop);
        combined = combined.slice(drop);
      }
      this.sessionLiveEvents.set(combined);
      if (wasAtBottom) {
        // Defer to next tick so the DOM has rendered the new events.
        setTimeout(() => this.scrollLiveTailToBottom(), 0);
      }
    }
    if (typeof res.value?.next_offset === 'number') {
      this.sessionLiveOffset.set(res.value.next_offset);
    }
  }

  private isLiveTailAtBottom(): boolean {
    const list = document.querySelector('.sess-events-list') as HTMLElement | null;
    if (!list) return true;
    return list.scrollTop + list.clientHeight >= list.scrollHeight - 40;
  }

  private scrollLiveTailToBottom() {
    const list = document.querySelector('.sess-events-list') as HTMLElement | null;
    if (list) list.scrollTop = list.scrollHeight;
  }

  formatSessionSize(b: number): string {
    if (b < 1024) return `${b}B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}k`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)}M`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(2)}G`;
  }

  formatSessionDuration(seconds: number): string {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h${m}m`;
    if (m > 0) return `${m}m${s}s`;
    return `${s}s`;
  }

  sessionToolEntries(counts: Record<string, number> | undefined): { name: string; count: number }[] {
    if (!counts) return [];
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Pull a clickable file path out of an event's input string. Read /
  // Edit / Write tools store the path as a leading absolute path
  // (sometimes with a trailing " (edit)" or " (123 bytes)" suffix).
  // Bash inputs are full command strings — skip those.
  sessionEventPath(e: { tool?: string; input?: string }): string | null {
    if (!e?.tool || !e?.input) return null;
    const tool = e.tool;
    if (tool !== 'Read' && tool !== 'Edit' && tool !== 'Write') return null;
    const m = e.input.match(/^(\/[^\s]+)/);
    return m ? m[1] : null;
  }

  async openSessionEventFile(e: { tool?: string; input?: string }) {
    const path = this.sessionEventPath(e);
    if (!path) return;
    await this.openSearchResult({ path, line: 1 });
  }

  // Process panel — go-process surface
  async refreshProcesses() {
    try {
      const [managedRes, daemonsRes] = await Promise.all([
        this.bridgeCall('process_managed_list', {}),
        this.bridgeCall('process_daemons_list', {}),
      ]);
      if (managedRes.ok) this.procManaged.set(managedRes.value?.processes || []);
      if (daemonsRes.ok) this.procDaemons.set(daemonsRes.value?.daemons || []);
    } catch (e) {
      console.warn('[process] refresh error:', e);
    }
  }

  async loadProcessOutput(id: string) {
    this.procSelected.set(id);
    this.procOutput.set('Loading…');
    const res = await this.bridgeCall('process_output', { id });
    if (res.ok) {
      this.procOutput.set(typeof res.value === 'string' ? res.value : JSON.stringify(res.value, null, 2));
    } else {
      this.procOutput.set('Error: ' + (res.error || 'output failed'));
    }
  }

  async signalProcess(id: string, signal: 'term' | 'kill' | 'hup' | 'int') {
    const res = await this.bridgeCall('process_managed_signal', { id, signal });
    if (res.ok) {
      await this.refreshProcesses();
    }
  }

  async removeProcess(id: string) {
    const res = await this.bridgeCall('process_managed_remove', { id });
    if (res.ok) {
      if (this.procSelected() === id) {
        this.procSelected.set(null);
        this.procOutput.set('');
      }
      await this.refreshProcesses();
    }
  }

  // Lint panel — core/lint surface
  async runLint() {
    if (this.lintRunning()) return;
    this.lintRunning.set(true);
    this.lintError.set(null);
    try {
      const res = await this.bridgeCall('lint_run', { path: this.workspaceRoot() });
      if (res.ok) {
        const v = res.value || {};
        const issues = Array.isArray(v.issues) ? v.issues : [];
        this.lintIssues.set(issues);
        const counts = v.counts || {};
        this.lintCounts.set({
          critical: counts.critical || 0,
          high: counts.high || 0,
          medium: counts.medium || 0,
          low: counts.low || 0,
          info: counts.info || 0,
          total: v.total || issues.length,
        });
        this.lintBinary.set(v.binary_path || '');
        this.lintDurationMs.set(v.duration_ms || 0);
        this.lintBasePath.set(v.path || this.workspaceRoot());
      } else {
        this.lintError.set(res.error || 'lint_run failed');
      }
    } catch (e: any) {
      this.lintError.set('lint bridge error: ' + (e?.message || String(e)));
    } finally {
      this.lintRunning.set(false);
    }
  }

  // openLintIssue resolves the issue's relative file path against the
  // workspace root, opens the file in a Monaco tab, jumps to the line.
  async openLintIssue(issue: { file: string; line: number }) {
    const base = this.lintBasePath() || this.workspaceRoot();
    const fullPath = issue.file.startsWith('/') ? issue.file : (base.replace(/\/$/, '') + '/' + issue.file);
    // Reuse the existing search-result open path so behaviour is consistent.
    await this.openSearchResult({ path: fullPath, line: issue.line });
  }

  // Containers panel — go-container surface
  async loadContainers() {
    this.containerLoading.set(true);
    this.containerError.set(null);
    try {
      const [detectRes, listRes] = await Promise.all([
        this.bridgeCall('container_detect', {}),
        this.bridgeCall('container_list', {}),
      ]);
      if (detectRes.ok) {
        this.containerRuntimes.set(detectRes.value?.runtimes || []);
      } else {
        this.containerError.set(detectRes.error || 'detect failed');
      }
      if (listRes.ok) {
        this.containerList.set(listRes.value?.containers || []);
      }
    } catch (e: any) {
      this.containerError.set('container bridge error: ' + (e?.message || String(e)));
    } finally {
      this.containerLoading.set(false);
    }
  }

  async loadContainerLogs(id: string, runtime: string) {
    this.containerSelected.set(id);
    this.containerLogs.set('Loading…');
    const res = await this.bridgeCall('container_logs', { id, runtime, tail: 200 });
    if (res.ok) {
      this.containerLogs.set(res.value?.logs || '(no output)');
    } else {
      this.containerLogs.set('Error: ' + (res.error || 'logs failed'));
    }
  }

  // Build panel — IDE surface over go-build
  async detectBuild() {
    this.buildError.set(null);
    try {
      const res = await this.bridgeCall('build_detect', { path: this.workspaceRoot() });
      if (res.ok) {
        this.buildDetected.set(res.value);
      } else {
        this.buildError.set(res.error || 'detect failed');
      }
    } catch (e: any) {
      this.buildError.set('build detect error: ' + (e?.message || String(e)));
    }
  }

  async runBuild() {
    if (this.buildRunning()) return;
    this.buildError.set(null);
    this.buildLog.set('');
    this.buildRunning.set(true);
    try {
      const res = await this.bridgeCall('build_run', { path: this.workspaceRoot() });
      if (!res.ok) {
        this.buildError.set(res.error || 'build_run failed');
        this.buildRunning.set(false);
        return;
      }
      // process_start returns the spawned id at top level (`id` field), and
      // the build_run wrapper passes it through.
      const pid = res.id || res.process_id || res.value?.process_id;
      if (!pid) {
        this.buildError.set('build kicked off but no process id returned');
        this.buildRunning.set(false);
        return;
      }
      this.buildProcessId.set(pid);
      this.buildLog.set(`$ ${res.build_command} ${(res.build_args || []).join(' ')}\n\n`);
      // Poll output every 500ms; existing process_output bridge tool returns
      // accumulated stdout/stderr.
      if (this.buildPollTimer) clearInterval(this.buildPollTimer);
      this.buildPollTimer = setInterval(() => void this.pollBuildLog(), 500);
    } catch (e: any) {
      this.buildError.set('build run error: ' + (e?.message || String(e)));
      this.buildRunning.set(false);
    }
  }

  async pollBuildLog() {
    const pid = this.buildProcessId();
    if (!pid) return;
    try {
      // process_output returns {ok:true, value:"<accumulated stdout/stderr>"}.
      const outRes = await this.bridgeCall('process_output', { id: pid });
      if (outRes.ok) {
        const baseLog = this.buildLog().split('\n\n')[0] + '\n\n';
        const text = typeof outRes.value === 'string' ? outRes.value : '';
        this.buildLog.set(baseLog + text);
      }
      // process_list tells us when the process has exited.
      const listRes = await this.bridgeCall('process_list', {});
      if (listRes.ok && Array.isArray(listRes.value)) {
        const proc = listRes.value.find((p: any) => p.id === pid);
        if (proc && proc.status === 'exited') {
          this.buildRunning.set(false);
          if (this.buildPollTimer) {
            clearInterval(this.buildPollTimer);
            this.buildPollTimer = undefined;
          }
          const code = proc.exit_code;
          const tail = code === 0 ? '\n\n✓ Build succeeded' : `\n\n✗ Build failed (exit ${code})`;
          if (!this.buildLog().includes('Build succeeded') && !this.buildLog().includes('Build failed')) {
            this.buildLog.update(s => s + tail);
          }
        }
      }
    } catch (e) {
      console.warn('[build] poll error:', e);
    }
  }

  async cancelBuild() {
    const pid = this.buildProcessId();
    if (!pid) return;
    await this.bridgeCall('process_kill', { id: pid });
    this.buildRunning.set(false);
    if (this.buildPollTimer) {
      clearInterval(this.buildPollTimer);
      this.buildPollTimer = undefined;
    }
  }

  // Load installed-plugin menus and surface them in the sidebar.
  async loadPluginMenus() {
    try {
      const res = await this.bridgeCall('pkg_menus', {});
      if (res.ok) {
        const value = res.value || {};
        this.pluginMenus.set(Array.isArray(value.plugins) ? value.plugins : []);
      }
    } catch (e) {
      console.warn('[plugin-menus] load failed:', e);
    }
  }

  // Multi-repo dashboard
  async loadRepos() {
    this.reposLoading.set(true);
    this.reposError.set(null);
    try {
      // Honour user-configured scan roots: one path per line. Empty → backend
      // falls back to its built-in canonical roots.
      const rootsRaw = (this.settings().reposRoots || '').trim();
      const params: Record<string, unknown> = {};
      if (rootsRaw) {
        params['roots'] = rootsRaw.split('\n').map((l) => l.trim()).filter(Boolean);
      }
      const res = await this.bridgeCall('repos_status', params);
      if (res.ok) {
        const value = res.value || {};
        const repos = Array.isArray(value.repos) ? value.repos : [];
        // Sort: dirty first, then by name
        repos.sort((a: any, b: any) => {
          if (a.dirty !== b.dirty) return a.dirty ? -1 : 1;
          return (a.name || '').localeCompare(b.name || '');
        });
        this.reposAll.set(repos);
        this.reposLoadedOnce = true;
      } else {
        this.reposError.set(res.error || 'repos_status failed');
      }
    } catch (e: any) {
      this.reposError.set('repos bridge error: ' + (e?.message || String(e)));
    } finally {
      this.reposLoading.set(false);
    }
  }

  openRepoInGit(repo: { path: string }) {
    this.workspaceRoot.set(repo.path);
    this.currentPath.set(repo.path);
    this.currentRoute.set('git');
    void this.refreshGit();
    this.saveUIState();
  }

  // Settings — typed setters so we can keep the @case template tidy.
  updateSetting<K extends keyof IdeComponent['defaultSettings']>(key: K, value: IdeComponent['defaultSettings'][K]) {
    this.settings.update((s) => ({ ...s, [key]: value }));
    this.settingsDirty.set(true);
    this.settingsSaveMessage.set(null);
  }

  saveSettings() {
    // Apply settings that change runtime state immediately. Editor knobs
    // already react via signal-bound attributes on lethean-monaco; the rest
    // affects launch defaults or other surfaces' inputs.
    const s = this.settings();
    if (this.workspaceRoot() !== s.workspaceRoot) {
      this.workspaceRoot.set(s.workspaceRoot);
      this.currentPath.set(s.workspaceRoot);
      // refresh explorer if it's the active surface
      if (this.currentRoute() === 'explorer') void this.loadDir(s.workspaceRoot);
    }
    // Force a repos rescan with the new roots next time the user opens it.
    this.reposLoadedOnce = false;
    this.flushUIState();
    this.settingsDirty.set(false);
    this.settingsSaveMessage.set('Saved. Backend settings (marketplace endpoint, SSH port) take effect after restart.');
  }

  resetSettings() {
    this.settings.set({ ...this.defaultSettings });
    this.settingsDirty.set(true);
    this.settingsSaveMessage.set(null);
  }

  // Marketplace — package browse / install / remove via /mcp/call pkg_*
  async loadMarketplace() {
    this.marketLoading.set(true);
    this.marketError.set(null);
    this.marketMessage.set(null);
    try {
      const [searchRes, installedRes] = await Promise.all([
        this.bridgeCall('pkg_search', { query: this.marketQuery(), category: this.marketCategory() }),
        this.bridgeCall('pkg_installed', {}),
      ]);
      if (searchRes.ok) {
        const value = searchRes.value || {};
        this.marketModules.set(Array.isArray(value.packages) ? value.packages : []);
      } else {
        this.marketError.set(searchRes.error || 'pkg_search failed');
      }
      if (installedRes.ok) {
        const value = installedRes.value || {};
        const pkgs = Array.isArray(value.packages) ? value.packages : [];
        this.marketInstalled.set(pkgs.map((p: any) => ({ code: p.code, name: p.name, version: p.version, entry_point: p.entry_point })));
      }
      this.marketLoadedOnce = true;
    } catch (e: any) {
      this.marketError.set('marketplace bridge error: ' + (e?.message || String(e)));
    } finally {
      this.marketLoading.set(false);
    }
  }

  isInstalled(code: string): boolean {
    return this.marketInstalled().some(p => p.code === code);
  }

  // pluginRunUrl returns the runnable URL for an installed plugin, or null
  // if the install record's entry_point isn't a URL. Marketplace fixtures
  // store runtime URLs in the upstream EntryPoint field; we surface those
  // as the Run target. Modules with no URL (themes, snippet packs, tools)
  // get no Run button.
  pluginRunUrl(code: string): string | null {
    const installed = this.marketInstalled().find(p => p.code === code);
    if (!installed) return null;
    const ep = installed.entry_point || '';
    if (ep.startsWith('http://') || ep.startsWith('https://')) return ep;
    return null;
  }

  async runPlugin(code: string) {
    const url = this.pluginRunUrl(code);
    if (!url) return;
    const installed = this.marketInstalled().find(p => p.code === code);
    const title = installed?.name || code;
    const res = await this.bridgeCall('window_open', {
      name: 'plugin-' + code,
      title,
      url,
      width: 960,
      height: 760,
      x: 120,
      y: 120,
    });
    if (!res.ok) {
      this.marketError.set(res.error || 'Failed to open plugin window');
    } else {
      this.marketMessage.set(`Running ${title} in a new window. Same MCP bridge addresses it.`);
    }
  }

  // runPluginInline mounts the plugin as an iframe panel inside the IDE
  // — sandboxed by origin, plugin runs unchanged.
  runPluginInline(code: string) {
    const url = this.pluginRunUrl(code);
    if (!url) return;
    const installed = this.marketInstalled().find(p => p.code === code);
    const title = installed?.name || code;
    this.embeddedPlugin.set({ code, name: title, url, mode: 'iframe' });
    this.marketMessage.set(`Mounted ${title} as an iframe panel.`);
  }

  // runPluginNative mounts the plugin's custom HTML element directly into
  // the host DOM — same JS context, talks to plugin API via fetch
  // (Mining-route pattern). Plugin needs to ship a registered element with
  // tag 'plugin-<code>'; v1 fixtures bundle the element into the IDE,
  // v2 will dynamic-import from /plugin/<code>/element.js.
  runPluginNative(code: string) {
    const installed = this.marketInstalled().find(p => p.code === code);
    if (!installed) return;
    const title = installed.name || code;
    const tag = pluginNativeTag(code);
    if (!tag) {
      this.marketError.set(`No native element registered for plugin: ${code}`);
      return;
    }
    this.embeddedPlugin.set({ code, name: title, url: '', mode: 'native', tag });
    this.marketMessage.set(`Mounted ${title} as a native element. Same JS context as the IDE.`);
  }

  closeEmbeddedPlugin() {
    this.embeddedPlugin.set(null);
  }

  // hasNativeMode reports whether the plugin has a registered custom
  // element. Today: hardcoded fixture allowlist; v2: read from manifest.
  hasNativeMode(code: string): boolean {
    return pluginNativeTag(code) !== null;
  }

  async installModule(code: string) {
    this.marketBusy.set(code);
    this.marketMessage.set(null);
    try {
      const res = await this.bridgeCall('pkg_install', { code });
      if (res.ok) {
        this.marketMessage.set(`Installed ${code} — added to your sidebar.`);
        await Promise.all([this.loadMarketplace(), this.loadPluginMenus()]);
      } else {
        this.marketError.set(res.error || `Install ${code} failed`);
      }
    } finally {
      this.marketBusy.set(null);
    }
  }

  async removeModule(code: string) {
    this.marketBusy.set(code);
    this.marketMessage.set(null);
    try {
      const res = await this.bridgeCall('pkg_remove', { code });
      if (res.ok) {
        this.marketMessage.set(`Removed ${code}`);
        await Promise.all([this.loadMarketplace(), this.loadPluginMenus()]);
        // If the active route was this plugin, redirect home.
        if (this.currentRoute().startsWith(`plugin:${code}`)) {
          this.currentRoute.set('marketplace');
          this.saveUIState();
        }
      } else {
        this.marketError.set(res.error || `Remove ${code} failed`);
      }
    } finally {
      this.marketBusy.set(null);
    }
  }

  // Source control — git status / diff / commit
  async refreshGit() {
    const repo = this.workspaceRoot();
    const [branchRes, statusRes] = await Promise.all([
      this.bridgeCall('git_branch', { path: repo }),
      this.bridgeCall('git_status', { path: repo }),
    ]);
    if (branchRes.ok) {
      this.gitBranch.set({ branch: branchRes.branch, ahead: branchRes.ahead, behind: branchRes.behind });
    }
    if (statusRes.ok) {
      this.gitEntries.set(statusRes.entries || []);
    } else {
      this.gitMessage.set(statusRes.error || 'git status failed');
    }
  }

  async selectGitFile(path: string) {
    this.gitSelectedFile.set(path);
    const repo = this.workspaceRoot();
    // Show worktree diff for unstaged, staged diff for staged-only.
    const entry = this.gitEntries().find((e) => e.path === path);
    const staged = !!entry?.staged && !entry?.unstaged;
    const res = await this.bridgeCall('git_diff', { path: repo, file: path, staged });
    if (res.ok) {
      this.gitDiff.set(res.diff || '(no diff — file may be untracked or unchanged)');
    } else {
      this.gitDiff.set(`(error: ${res.error || 'git diff failed'})`);
    }
  }

  gitFileLabel(entry: { index_status: string; worktree_status: string; untracked: boolean }): string {
    if (entry.untracked) return 'U';
    const s = (entry.index_status + entry.worktree_status).trim();
    return s || '·';
  }

  async stageFile(path: string, ev: Event) {
    ev.stopPropagation();
    this.gitBusy.set(true);
    const res = await this.bridgeCall('git_add', { path: this.workspaceRoot(), files: [path] });
    this.gitBusy.set(false);
    if (!res.ok) {
      this.gitMessage.set(res.error || 'stage failed');
      return;
    }
    this.gitMessage.set(`staged ${this.basename(path)}`);
    void this.refreshGit();
  }

  async unstageFile(path: string, ev: Event) {
    ev.stopPropagation();
    this.gitBusy.set(true);
    const res = await this.bridgeCall('git_unstage', { path: this.workspaceRoot(), files: [path] });
    this.gitBusy.set(false);
    if (!res.ok) {
      this.gitMessage.set(res.error || 'unstage failed');
      return;
    }
    this.gitMessage.set(`unstaged ${this.basename(path)}`);
    void this.refreshGit();
  }

  async stageAll() {
    this.gitBusy.set(true);
    const res = await this.bridgeCall('git_add', { path: this.workspaceRoot(), all: true });
    this.gitBusy.set(false);
    if (!res.ok) {
      this.gitMessage.set(res.error || 'stage all failed');
      return;
    }
    this.gitMessage.set('staged all changes');
    void this.refreshGit();
  }

  async commitStaged() {
    const msg = this.gitCommitMessage().trim();
    if (!msg) {
      this.gitMessage.set('commit message required');
      return;
    }
    this.gitBusy.set(true);
    const res = await this.bridgeCall('git_commit', { path: this.workspaceRoot(), message: msg });
    this.gitBusy.set(false);
    if (!res.ok) {
      this.gitMessage.set(res.error || 'commit failed');
      return;
    }
    this.gitMessage.set(`committed: ${msg.split('\n')[0].slice(0, 60)}`);
    this.gitCommitMessage.set('');
    void this.refreshGit();
  }

  hasStaged = computed(() => this.gitEntries().some((e) => e.staged));

  // Workspace explorer — uses MCP bridge dir_list + file_read
  private async bridgeCall(tool: string, params: Record<string, unknown>): Promise<any> {
    const res = await fetch('http://127.0.0.1:9877/mcp/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, params }),
    });
    return res.json();
  }

  async loadDir(path: string) {
    this.explorerLoading.set(true);
    try {
      const data = await this.bridgeCall('dir_list', { path });
      if (data.ok && Array.isArray(data.value)) {
        // Sort: dirs first, then files; alphabetical within each group.
        const entries = (data.value as { name: string; is_dir: boolean; type: string }[])
          .slice()
          .sort((a, b) => {
            if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        this.currentPath.set(path);
        this.dirEntries.set(entries);
        // Treat the user's last-navigated dir as the workspace root for restore.
        this.workspaceRoot.set(path);
        this.saveUIState();
      }
    } finally {
      this.explorerLoading.set(false);
    }
  }

  async openFileFromTree(name: string, isDir: boolean) {
    const path = this.currentPath().replace(/\/$/, '') + '/' + name;
    if (isDir) {
      await this.loadDir(path);
      return;
    }
    // Already open? Just switch to its tab.
    const existing = this.openFiles().findIndex((f) => f.path === path);
    if (existing >= 0) {
      this.activeFileIdx.set(existing);
      return;
    }
    const [data, lang] = await Promise.all([
      this.bridgeCall('file_read', { path }),
      this.bridgeCall('lang_detect', { path }),
    ]);
    const content = data.ok
      ? typeof data.value === 'string'
        ? data.value
        : JSON.stringify(data.value, null, 2)
      : `(error: ${data.error || 'unknown'})`;
    this.openFiles.update((files) => [
      ...files,
      {
        path,
        content,
        language: (lang.language as string) || 'plaintext',
        dirty: false,
      },
    ]);
    this.activeFileIdx.set(this.openFiles().length - 1);
    this.saveUIState();
  }

  navigateUp() {
    const p = this.currentPath();
    const idx = p.lastIndexOf('/');
    if (idx > 0) {
      void this.loadDir(p.slice(0, idx));
    }
  }

  selectTab(idx: number) {
    if (idx >= 0 && idx < this.openFiles().length) {
      this.activeFileIdx.set(idx);
      this.saveUIState();
    }
  }

  closeTab(idx: number, ev?: Event) {
    ev?.stopPropagation();
    const files = this.openFiles();
    const f = files[idx];
    if (!f) return;
    if (f.dirty) {
      const ok = confirm(`Discard unsaved changes to ${this.basename(f.path)}?`);
      if (!ok) return;
    }
    // Tell Monaco to dispose this path's model so memory is reclaimed.
    const monacoEl = this.editorRef?.nativeElement as
      | (HTMLElement & { closeModel?: (path: string) => void })
      | undefined;
    monacoEl?.closeModel?.(f.path);

    this.openFiles.update((arr) => arr.filter((_, i) => i !== idx));
    const remaining = this.openFiles().length;
    const cur = this.activeFileIdx();
    if (remaining === 0) {
      this.activeFileIdx.set(-1);
    } else if (cur >= remaining) {
      this.activeFileIdx.set(remaining - 1);
    } else if (cur > idx) {
      this.activeFileIdx.set(cur - 1);
    }
    this.saveUIState();
  }

  closeAllTabs() {
    const dirty = this.openFiles().filter((f) => f.dirty);
    if (dirty.length > 0) {
      const ok = confirm(`Discard unsaved changes in ${dirty.length} file(s)?`);
      if (!ok) return;
    }
    const monacoEl = this.editorRef?.nativeElement as
      | (HTMLElement & { closeModel?: (path: string) => void })
      | undefined;
    if (monacoEl?.closeModel) {
      for (const f of this.openFiles()) monacoEl.closeModel(f.path);
    }
    this.openFiles.set([]);
    this.activeFileIdx.set(-1);
    this.saveUIState();
  }

  onEditorChange(value: string) {
    const idx = this.activeFileIdx();
    if (idx < 0) return;
    this.openFiles.update((files) =>
      files.map((f, i) =>
        i === idx
          ? { ...f, content: value, dirty: value !== f.content || f.dirty }
          : f,
      ),
    );
  }

  async onEditorSave(value: string) {
    const idx = this.activeFileIdx();
    if (idx < 0) return;
    const f = this.openFiles()[idx];
    if (!f) return;
    const data = await this.bridgeCall('file_write', { path: f.path, content: value });
    if (data.ok) {
      this.openFiles.update((files) =>
        files.map((file, i) =>
          i === idx ? { ...file, content: value, dirty: false } : file,
        ),
      );
    } else {
      alert(`Save failed: ${data.error || 'unknown'}`);
    }
  }

  saveActiveTab() {
    const f = this.activeFile();
    if (f) void this.onEditorSave(f.content);
  }

  basename(path: string): string {
    const idx = path.lastIndexOf('/');
    return idx >= 0 ? path.slice(idx + 1) : path;
  }

  // Workspace search — dispatch ripgrep via the bridge, render results.
  async runSearch() {
    const q = this.searchQuery().trim();
    if (!q) {
      this.searchResults.set([]);
      this.searchError.set(null);
      this.searchTruncated.set(false);
      return;
    }
    this.searchLoading.set(true);
    this.searchError.set(null);
    try {
      const data = await this.bridgeCall('workspace_search', {
        query: q,
        path: this.workspaceRoot(),
        max_results: 200,
      });
      if (!data.ok) {
        this.searchError.set(data.error || 'search failed');
        this.searchResults.set([]);
        this.searchTruncated.set(false);
        return;
      }
      this.searchResults.set(data.matches || []);
      this.searchTruncated.set(!!data.truncated);
    } finally {
      this.searchLoading.set(false);
    }
  }

  async openSearchResult(match: { path: string; line: number }) {
    // Re-use the explorer's open path so the file lands in the tabs.
    const existing = this.openFiles().findIndex((f) => f.path === match.path);
    if (existing >= 0) {
      this.activeFileIdx.set(existing);
    } else {
      const [data, lang] = await Promise.all([
        this.bridgeCall('file_read', { path: match.path }),
        this.bridgeCall('lang_detect', { path: match.path }),
      ]);
      const content = data.ok
        ? typeof data.value === 'string'
          ? data.value
          : JSON.stringify(data.value, null, 2)
        : `(error: ${data.error || 'unknown'})`;
      this.openFiles.update((files) => [
        ...files,
        { path: match.path, content, language: (lang.language as string) || 'plaintext', dirty: false },
      ]);
      this.activeFileIdx.set(this.openFiles().length - 1);
      this.saveUIState();
    }
    // Switch to the explorer view so the editor pane is visible, then jump
    // to the line once Monaco's done switching models.
    this.currentRoute.set('explorer');
    this.saveUIState();
    setTimeout(() => {
      const monacoEl = this.editorRef?.nativeElement as
        | (HTMLElement & { revealLine?: (line: number, column?: number) => void })
        | undefined;
      monacoEl?.revealLine?.(match.line, 1);
    }, 250);
  }

  hideChat() { this.chatVisible.set(false); this.saveUIState(); }
  showChat() { this.chatVisible.set(true); this.saveUIState(); }

  onChatSend(text: string) {
    const t = (text || '').trim();
    if (!t) return;
    this.chatMessages.update((msgs) => [
      ...msgs,
      { id: this.chatIdCounter++, who: 'you', text: t },
    ]);
    if (t.startsWith('/')) {
      this.invokeBridgeTool(t);
      return;
    }
    // Plain text — echo placeholder until claude_bridge upstream is wired.
    setTimeout(() => {
      this.chatMessages.update((msgs) => [
        ...msgs,
        {
          id: this.chatIdCounter++,
          who: 'vi',
          text: `(echo) ${t}\n\nTry "/help" to see available bridge commands. Upstream Cladius wiring lands next.`,
        },
      ]);
    }, 200);
  }

  private async invokeBridgeTool(line: string) {
    // Parse `/tool [json-params | key=value pairs]`
    const stripped = line.replace(/^\//, '').trim();
    if (!stripped) return;
    const firstSpace = stripped.indexOf(' ');
    const tool = firstSpace < 0 ? stripped : stripped.slice(0, firstSpace);
    const argStr = firstSpace < 0 ? '' : stripped.slice(firstSpace + 1).trim();

    if (tool === 'help') {
      this.chatMessages.update((msgs) => [
        ...msgs,
        {
          id: this.chatIdCounter++,
          who: 'vi',
          text:
            'Bridge command syntax: /<tool> [json-params | key=value]\n\n' +
            'Common tools:\n' +
            '  /webview_console limit=20\n' +
            '  /webview_errors\n' +
            '  /webview_dom_tree selector=main\n' +
            '  /webview_eval {"script":"return document.title;"}\n' +
            '  /window_get\n' +
            '  /window_position x=300 y=200\n' +
            '  /file_read path=/Users/snider/Code/core/ide/CLAUDE.md\n' +
            '  /dir_list path=/Users/snider/Code/core/ide\n' +
            '  /process_start command=ls args=["-la"]\n' +
            '  /clipboard_read\n' +
            '  /theme_get\n\n' +
            'Full manifest: GET http://127.0.0.1:9877/mcp/tools',
        },
      ]);
      return;
    }

    let params: Record<string, unknown> = {};
    if (argStr.startsWith('{')) {
      try {
        params = JSON.parse(argStr);
      } catch (e) {
        this.chatMessages.update((msgs) => [
          ...msgs,
          {
            id: this.chatIdCounter++,
            who: 'vi',
            text: `JSON parse error: ${(e as Error).message}\nInput was: ${argStr}`,
          },
        ]);
        return;
      }
    } else if (argStr) {
      // Parse simple key=value pairs (whitespace-separated). Values that
      // look like numbers get parsed as numbers; everything else stays string.
      // Quoted values "with spaces" preserved. JSON arrays/objects in values
      // (like args=["-la"]) get parsed inline.
      const tokens = argStr.match(/[a-zA-Z_][a-zA-Z0-9_]*=(?:"[^"]*"|\[[^\]]*\]|\{[^}]*\}|\S+)/g) || [];
      for (const tok of tokens) {
        const eq = tok.indexOf('=');
        const k = tok.slice(0, eq);
        let v: string = tok.slice(eq + 1);
        if (v.startsWith('"') && v.endsWith('"')) {
          params[k] = v.slice(1, -1);
        } else if (v.startsWith('[') || v.startsWith('{')) {
          try { params[k] = JSON.parse(v); } catch { params[k] = v; }
        } else if (/^-?\d+$/.test(v)) {
          params[k] = parseInt(v, 10);
        } else if (/^(true|false)$/.test(v)) {
          params[k] = v === 'true';
        } else {
          params[k] = v;
        }
      }
    }

    try {
      const res = await fetch('http://127.0.0.1:9877/mcp/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, params }),
      });
      const data = await res.json();
      const formatted = JSON.stringify(data, null, 2);
      const text = formatted.length > 4000 ? formatted.slice(0, 4000) + '\n…(truncated)' : formatted;
      this.chatMessages.update((msgs) => [
        ...msgs,
        { id: this.chatIdCounter++, who: 'vi', text: `\`/${tool}\`\n\n${text}` },
      ]);
    } catch (e) {
      this.chatMessages.update((msgs) => [
        ...msgs,
        { id: this.chatIdCounter++, who: 'vi', text: `Bridge call failed: ${(e as Error).message}` },
      ]);
    }
  }

  titleForRoute(): string {
    const route = this.currentRoute();
    if (route === 'dashboard') return 'Control Panel';
    if (route === 'ask-vi') return 'Ask Vi';
    if (route.startsWith('site:')) return route.slice('site:'.length);
    return route.charAt(0).toUpperCase() + route.slice(1);
  }

  placeholderHint(): string {
    const route = this.currentRoute();
    if (route === 'explorer') return 'browse the workspace tree';
    if (route === 'search') return 'workspace-wide search';
    if (route === 'git') return 'commits, branches, working tree';
    if (route === 'settings') return 'preferences + brand + platform overrides';
    if (route === 'billing') return 'subscriptions, invoices, payment methods';
    if (route === 'ask-vi') return '⌘K command surface — modal coming soon';
    if (route.startsWith('site:')) return 'per-site detail — uptime, response, recent deploys';
    return 'detail design pending';
  }
}
