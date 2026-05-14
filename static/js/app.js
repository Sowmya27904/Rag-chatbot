'use strict';

const state = {
  documents: [],
  history: [],
  loading: false,
  activeFilter: null,   // filename to filter by, or null = all files
};

const $ = id => document.getElementById(id);
const uploadZone     = $('uploadZone');
const fileInput      = $('fileInput');
const uploadProgress = $('uploadProgress');
const progressLabel  = $('progressLabel');
const progressBar    = $('progressBar');
const uploadError    = $('uploadError');
const docList        = $('docList');
const docCount       = $('docCount');
const sidebarFooter  = $('sidebarFooter');
const messages       = $('messages');
const messageInput   = $('messageInput');
const sendBtn        = $('sendBtn');
const suggestions    = $('suggestions');
const headerSub      = $('headerSub');
const ragBadge       = $('ragBadge');
const sidebar        = document.querySelector('.sidebar');

// ── Sidebar toggle ────────────────────────────────────────────────────────────
$('sidebarToggle').addEventListener('click', () => sidebar.classList.toggle('collapsed'));

// ── Upload ────────────────────────────────────────────────────────────────────
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  [...e.dataTransfer.files].forEach(f => uploadFile(f));
});
fileInput.addEventListener('change', () => {
  [...fileInput.files].forEach(f => uploadFile(f));
  fileInput.value = '';
});

async function uploadFile(file) {
  hideUploadError();
  uploadProgress.style.display = 'block';
  progressBar.style.width = '0%';
  progressLabel.textContent = `Uploading ${file.name}...`;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          const pct = Math.round(e.loaded / e.total * 100);
          progressBar.style.width = pct + '%';
          progressLabel.textContent = pct < 100
            ? `Uploading ${file.name}... ${pct}%`
            : `Processing ${file.name}...`;
        }
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.message || data.error || 'Upload failed'));
        } catch { reject(new Error('Invalid server response')); }
      };
      xhr.onerror = () => reject(new Error('Network error — is the server running?'));
      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });

    addDocument(result);
    addAiMessage(
      `✅ **"${result.filename}"** uploaded successfully!\n\n` +
      `Indexed **${result.chunks} chunks** (${result.characters.toLocaleString()} characters).\n\n` +
      `You can now ask questions about this file, or upload more files.`
    );

  } catch (err) {
    showUploadError(err.message);
    addAiMessage(`❌ **Upload failed for "${file.name}"**\n\n${err.message}`);
  } finally {
    uploadProgress.style.display = 'none';
    progressBar.style.width = '0%';
  }
}

// ── Document list ─────────────────────────────────────────────────────────────
function addDocument(result) {
  state.documents = state.documents.filter(d => d.filename !== result.filename);
  state.documents.push({ filename: result.filename, chunks: result.chunks });
  renderDocList();
}

function renderDocList() {
  docCount.textContent = state.documents.length;

  if (state.documents.length === 0) {
    docList.innerHTML = '<div class="doc-empty">No documents yet.<br/>Upload files above.</div>';
    sidebarFooter.style.display = 'none';
    ragBadge.style.display = 'none';
    headerSub.textContent = 'No documents loaded';
    state.activeFilter = null;
    updateFilterBadge();
    return;
  }

  sidebarFooter.style.display = 'block';
  ragBadge.style.display = 'block';
  headerSub.textContent = `${state.documents.length} file${state.documents.length > 1 ? 's' : ''} loaded`;

  docList.innerHTML = state.documents.map(d => `
    <div class="doc-item ${state.activeFilter === d.filename ? 'doc-active' : ''}"
         onclick="toggleFilter('${escHtml(d.filename)}')"
         title="Click to filter chat to this file only">
      <div class="doc-item-top">
        <div class="doc-name">📄 ${escHtml(d.filename)}</div>
        <button class="doc-delete" onclick="event.stopPropagation(); deleteDoc('${escHtml(d.filename)}')"
                title="Remove this file">✕</button>
      </div>
      <div class="doc-meta">${d.chunks} chunks · click to focus</div>
    </div>
  `).join('');
}

// ── Filter: ask about one specific file ──────────────────────────────────────
function toggleFilter(filename) {
  if (state.activeFilter === filename) {
    state.activeFilter = null;
    addAiMessage(`🔓 Filter removed. Now searching **all uploaded files**.`);
  } else {
    state.activeFilter = filename;
    addAiMessage(`🔍 Filter set to **"${filename}"**. Your questions will now only search this file.\n\nClick the file again to remove the filter.`);
  }
  renderDocList();
  updateFilterBadge();
}

function updateFilterBadge() {
  const badge = $('filterBadge');
  if (!badge) return;
  if (state.activeFilter) {
    badge.textContent = `Searching: ${state.activeFilter}`;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

// ── Delete one document ───────────────────────────────────────────────────────
async function deleteDoc(filename) {
  try {
    await fetch(`/api/documents/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    state.documents = state.documents.filter(d => d.filename !== filename);
    if (state.activeFilter === filename) {
      state.activeFilter = null;
      updateFilterBadge();
    }
    renderDocList();
    addAiMessage(`🗑 **"${filename}"** has been removed.`);
  } catch {
    addAiMessage(`❌ Failed to delete "${filename}".`);
  }
}

// ── Clear all ─────────────────────────────────────────────────────────────────
$('clearBtn').addEventListener('click', async () => {
  if (!confirm('Remove ALL uploaded documents?')) return;
  try {
    await fetch('/api/documents', { method: 'DELETE' });
    state.documents = [];
    state.activeFilter = null;
    state.history = [];
    renderDocList();
    updateFilterBadge();
    addAiMessage('🗑 All documents cleared.');
  } catch {
    addAiMessage('❌ Failed to clear documents.');
  }
});

// ── Send message ──────────────────────────────────────────────────────────────
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + 'px';
});

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || state.loading) return;

  suggestions.style.display = 'none';
  addUserMessage(text);
  messageInput.value = '';
  messageInput.style.height = 'auto';
  state.loading = true;
  sendBtn.disabled = true;
  const loadingEl = showLoadingDots();

  try {
    const body = {
      message: text,
      history: state.history.slice(-10),
    };
    // Send file filter if active
    if (state.activeFilter) {
      body.filename_filter = state.activeFilter;
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

    state.history.push({ role: 'user', content: text });
    state.history.push({ role: 'assistant', content: data.answer });

    loadingEl.remove();
    addAiMessage(data.answer, data.sources || []);

  } catch (err) {
    loadingEl.remove();
    addAiMessage(`❌ **Error:** ${err.message}`);
  } finally {
    state.loading = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

// ── Message rendering ─────────────────────────────────────────────────────────
function addUserMessage(text) {
  const el = document.createElement('div');
  el.className = 'message user';
  el.innerHTML = `
    <div class="avatar">👤</div>
    <div class="bubble-wrap">
      <div class="bubble">${escHtml(text)}</div>
      <div class="msg-time">${nowStr()}</div>
    </div>`;
  messages.appendChild(el);
  scrollBottom();
}

function addAiMessage(markdown, sources = []) {
  const el = document.createElement('div');
  el.className = 'message ai';
  const sourcesHtml = sources.length
    ? `<div class="sources">
         <span class="source-label">Sources:</span>
         ${sources.map(s => `<span class="source-badge" onclick="toggleFilter('${escHtml(s)}')" title="Click to focus on this file">📎 ${escHtml(s)}</span>`).join('')}
       </div>`
    : '';
  el.innerHTML = `
    <div class="avatar">⚡</div>
    <div class="bubble-wrap">
      <div class="bubble">${renderMarkdown(markdown)}</div>
      ${sourcesHtml}
      <div class="msg-time">${nowStr()}</div>
    </div>`;
  messages.appendChild(el);
  scrollBottom();
}

function showLoadingDots() {
  const el = document.createElement('div');
  el.className = 'message ai';
  el.innerHTML = `<div class="avatar">⚡</div><div class="bubble-wrap"><div class="loading-bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
  messages.appendChild(el);
  scrollBottom();
  return el;
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function renderMarkdown(md) {
  if (!md) return '';
  let html = escHtml(md);
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^---$/gm, '<hr/>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^[*\-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)(\n(?!<li>)|$)/g, '<ul>$1</ul>$2');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  const blockTags = /^<(h[1-6]|ul|ol|li|pre|blockquote|hr)/;
  html = html.split(/\n{2,}/).map(block => {
    block = block.trim();
    if (!block) return '';
    return blockTags.test(block) ? block : `<p>${block.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');
  return html;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function nowStr() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function scrollBottom() { messages.scrollTop = messages.scrollHeight; }
function showUploadError(msg) { uploadError.textContent = '❌ ' + msg; uploadError.style.display = 'block'; }
function hideUploadError() { uploadError.style.display = 'none'; }
function setInput(text) { messageInput.value = text; messageInput.focus(); }

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const res = await fetch('/api/documents');
    const data = await res.json();
    if (data.documents && data.documents.length > 0) {
      data.documents.forEach(name => state.documents.push({ filename: name, chunks: '?' }));
      renderDocList();
    }
  } catch {}
})();