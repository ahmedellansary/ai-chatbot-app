// ═════════════════════════════════════════════════════════════════
//  X.v1 Instruction Manager — Extracted Module (Phase 3 Refactor)
// ═════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const InstructionManager = {
    files: [],
    activeEditingId: null,

    async load() {
      try {
        const custom = localStorage.getItem('instruction_files');
        if (custom) {
          this.files = JSON.parse(custom);
          if (Array.isArray(this.files) && this.files.length) return this.files;
        }
        const res = await fetch('./instructions.json?t=' + Date.now());
        if (res.ok) {
          this.files = await res.json();
          this.save();
          return this.files;
        }
      } catch (e) {
        console.warn('[InstructionManager] Load error:', e);
      }
      if (!this.files || !this.files.length) {
        this.files = [{
          id: 'core_general',
          name: 'التعليمات العامة الأساسية',
          icon: '🧠',
          desc: 'الهوية الأساسية، الأسلوب الودود، الذكاء والوضوح',
          isCore: true,
          enabled: true,
          keywords: [],
          content: 'You are "X.v1", an intelligent, creative, and friendly AI assistant.'
        }];
      }
      return this.files;
    },

    save() {
      try { localStorage.setItem('instruction_files', JSON.stringify(this.files)); } catch (e) { console.warn('[InstructionManager] Save error:', e); }
    },

    renderList() {
      const container = document.getElementById('instruction-files-list');
      if (!container) return;
      container.innerHTML = '';
      this.files.forEach(file => {
        const card = document.createElement('div');
        card.className = `inst-file-card ${this.activeEditingId === file.id ? 'active' : ''}`;
        card.onclick = () => this.openEditor(file.id);
        const esc = window.MessageRenderer ? window.MessageRenderer.escapeHtml : (s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));
        card.innerHTML = `
          <div class="inst-file-info">
            <span class="inst-file-icon">${file.icon || '📄'}</span>
            <div class="inst-file-text">
              <div class="inst-file-title">${esc(file.name)}</div>
              <div class="inst-file-desc">${esc(file.desc || '')}</div>
            </div>
          </div>
          <div class="inst-file-badges">
            ${file.isCore ? '<span class="inst-tag-badge">أساسي</span>' : ''}
            <button class="inst-toggle-btn ${file.enabled ? 'enabled' : ''}" onclick="event.stopPropagation(); window._toggleInstructionFile('${file.id}')">
              ${file.enabled ? '✓ مفعل' : '✕ معطل'}
            </button>
          </div>
        `;
        container.appendChild(card);
      });
    },

    openEditor(fileId) {
      this.activeEditingId = fileId;
      const file = this.files.find(f => f.id === fileId);
      if (!file) return;
      const panel = document.getElementById('instruction-editor-panel');
      if (!panel) return;
      panel.classList.remove('hidden');
      const iconEl = document.getElementById('inst-editor-icon');
      if (iconEl) iconEl.textContent = file.icon || '📄';
      const nameInput = document.getElementById('inst-editor-name');
      if (nameInput) { nameInput.value = file.name || ''; nameInput.readOnly = !!file.isCore; }
      const descInput = document.getElementById('inst-editor-desc');
      if (descInput) descInput.value = file.desc || '';
      const kwInput = document.getElementById('inst-editor-keywords');
      if (kwInput) kwInput.value = (file.keywords || []).join(', ');
      const contentTextarea = document.getElementById('inst-editor-content');
      if (contentTextarea) contentTextarea.value = file.content || '';
      const enabledCheckbox = document.getElementById('inst-editor-enabled');
      if (enabledCheckbox) enabledCheckbox.checked = !!file.enabled;
      const deleteBtn = document.getElementById('inst-delete-btn');
      if (deleteBtn) deleteBtn.classList.toggle('hidden', !!file.isCore);
      this.renderList();
    },

    closeEditor() {
      this.activeEditingId = null;
      document.getElementById('instruction-editor-panel')?.classList.add('hidden');
      this.renderList();
    },

    saveActive() {
      if (!this.activeEditingId) return;
      const file = this.files.find(f => f.id === this.activeEditingId);
      if (!file) return;
      const name = document.getElementById('inst-editor-name')?.value.trim();
      const desc = document.getElementById('inst-editor-desc')?.value.trim();
      const keywordsRaw = document.getElementById('inst-editor-keywords')?.value.trim();
      const content = document.getElementById('inst-editor-content')?.value.trim();
      const enabled = document.getElementById('inst-editor-enabled')?.checked;
      if (!name || !content) {
        if (window.MessageRenderer) window.MessageRenderer.showToast('يرجى كتابة اسم الملف والتعليمات', 'warning');
        return;
      }
      if (!file.isCore) file.name = name;
      file.desc = desc;
      file.keywords = keywordsRaw ? keywordsRaw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
      file.content = content;
      file.enabled = enabled;
      this.save();
      if (window.MessageRenderer) window.MessageRenderer.showToast(`✅ تم حفظ ملف "${file.name}" بنجاح!`, 'success');
      this.renderList();
    },

    toggle(fileId) {
      const file = this.files.find(f => f.id === fileId);
      if (!file) return;
      file.enabled = !file.enabled;
      this.save();
      if (this.activeEditingId === fileId) {
        const checkbox = document.getElementById('inst-editor-enabled');
        if (checkbox) checkbox.checked = file.enabled;
      }
      this.renderList();
      if (window.MessageRenderer) window.MessageRenderer.showToast(`${file.enabled ? '🟢 تم تفعيل' : '⚪ تم تعطيل'} ملف "${file.name}"`, 'info');
    },

    addNew() {
      const id = 'custom_' + Date.now();
      const newFile = { id, name: 'ملف تعليمات جديد', icon: '📝', desc: 'تعليمات متخصصة لسياق محدد', isCore: false, enabled: true, keywords: [], content: 'اكتب التوجيهات الخاصة بهذا الملف هنا...' };
      this.files.push(newFile);
      this.save();
      this.openEditor(id);
      if (window.MessageRenderer) window.MessageRenderer.showToast('📄 تم إنشاء ملف تعليمات جديد', 'info');
    },

    deleteActive() {
      if (!this.activeEditingId) return;
      const file = this.files.find(f => f.id === this.activeEditingId);
      if (!file || file.isCore) return;
      if (confirm(`هل أنت متأكد من حذف ملف "${file.name}"؟`)) {
        this.files = this.files.filter(f => f.id !== this.activeEditingId);
        this.save();
        this.closeEditor();
        if (window.MessageRenderer) window.MessageRenderer.showToast('🗑️ تم حذف الملف', 'info');
      }
    },

    async resetDefaults() {
      if (confirm('هل تريد استعادة كافة ملفات التعليمات الافتراضية؟')) {
        try {
          const res = await fetch('./instructions.json?t=' + Date.now());
          if (res.ok) {
            this.files = await res.json();
            this.save();
            this.closeEditor();
            this.renderList();
            if (window.MessageRenderer) window.MessageRenderer.showToast('🔄 تمت استعادة ملفات التعليمات الافتراضية بنجاح!', 'success');
          }
        } catch (e) {
          if (window.MessageRenderer) window.MessageRenderer.showToast('تعذر جلب الملفات: ' + e.message, 'error');
        }
      }
    },

    assemblePrompt(userText = '', attachments = []) {
      if (!this.files || !this.files.length) return 'You are X.v1, an advanced AI assistant.';
      const coreFile = this.files.find(f => f.isCore && f.enabled) || this.files[0];
      let fullPrompt = `👑 [MASTER GOVERNING LAYER - التعليمات العامة الحاكمة]\n${coreFile ? coreFile.content : ''}`;
      const filesDirectory = this.files.map(f => `- [${f.name}] (ID: ${f.id}) : ${f.desc} | Keywords: [${(f.keywords || []).join(', ')}]`).join('\n');
      fullPrompt += `\n\n═══════════════════════════════════════════════════════════════\n📁 فهرس ملفات التعليمات التخصصية المتاحة:\n${filesDirectory}\n═══════════════════════════════════════════════════════════════\nقواعد التطبيق الهيكلية:\n1. التعليمات العامة أعلاه هي الطبقة العليا الحاكمة لشخصيتك، أسلوبك، وطريقتك في التفكير والرد وطرح الأسئلة دائماً.\n2. افحص عناوين وتخصصات الفهرس، وطبق المعايير التخصصية للملفات المناسبة لسياق المحادثة الحالي تلقائياً دون سردها للمستخدم.\n3. إذا طلب المستخدم صراحة إضافة أو تسجيل تعليمة جديدة (مثال: "أضف للتعليمات..." أو "احفظ في الفلاش باك..."): افحص الفهرس وصنفها في الملف المناسب، ثم أخرج في نهاية ردك:\n---BEGIN_INSTRUCTION_UPDATE---\n{"action":"append", "targetFileId":"<id>", "newInstruction":"<نص التعليمة المنسق>"}\n---END_INSTRUCTION_UPDATE---`;
      const textLower = (userText + ' ' + (attachments || []).map(a => a.name || '').join(' ')).toLowerCase();
      const activeContextualFiles = this.files.filter(f => !f.isCore && f.enabled);
      const matchedFiles = activeContextualFiles.filter(f => {
        if (!Array.isArray(f.keywords) || !f.keywords.length) return true;
        return f.keywords.some(kw => kw && textLower.includes(kw.toLowerCase()));
      });
      if (matchedFiles.length > 0) {
        matchedFiles.forEach(file => {
          fullPrompt += `\n\n═══════════════════════════════════════════════════════════════\n🎯 ملف تخصصي نشط ومطبق في هذا السياق: [${file.name}]\n═══════════════════════════════════════════════════════════════\n${file.content}`;
        });
      }
      return fullPrompt;
    },

    handleAutoInstructionUpdate(aiText) {
      if (!aiText || !aiText.includes('---BEGIN_INSTRUCTION_UPDATE---')) return;
      try {
        const match = aiText.match(/---BEGIN_INSTRUCTION_UPDATE---([\s\S]*?)---END_INSTRUCTION_UPDATE---/);
        if (!match || !match[1]) return;
        const data = JSON.parse(match[1].trim());
        if (data.action === 'append' && data.targetFileId && data.newInstruction) {
          const target = this.files.find(f => f.id === data.targetFileId);
          if (target) {
            target.content += `\n- ${data.newInstruction.trim()}`;
            this.save();
            if (window.MessageRenderer) window.MessageRenderer.showToast(`✨ تم تصنيف وحفظ التعليمة بنجاح في ملف [${target.name}]!`, 'success');
          }
        } else if (data.action === 'create' && data.fileName && data.newInstruction) {
          const newId = 'custom_' + Date.now();
          this.files.push({ id: newId, name: data.fileName, icon: '📁', desc: data.category || 'ملف تعليمات مخصص', isCore: false, enabled: true, keywords: data.keywords || [], content: data.newInstruction });
          this.save();
          if (window.MessageRenderer) window.MessageRenderer.showToast(`✨ تم إنشاء وتصنيف التعليمة في ملف جديد: [${data.fileName}]!`, 'success');
        }
      } catch (e) { console.warn('[InstructionManager] Auto update parse error:', e); }
    }
  };

  window.InstructionManager = InstructionManager;
})();
