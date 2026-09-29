// Ayan Extension - Ultimate Main-World Code Editor & Clipboard Engine for IITM & Web Portals

(function () {
  'use strict';
  if (window.__ayan_unblocker_initialized__) return;
  window.__ayan_unblocker_initialized__ = true;

  let lastPasteTimestamp = 0;

  // --- 1. NEUTRALIZE Event.prototype.preventDefault ---
  const origPreventDefault = Event.prototype.preventDefault;

  const UNBLOCK_EVENTS = new Set([
    'copy',
    'cut',
    'paste',
    'contextmenu',
    'selectstart',
    'selectionchange',
    'dragstart',
    'drop',
    'beforecopy',
    'beforecut',
    'beforepaste',
    'beforeinput'
  ]);

  Event.prototype.preventDefault = function () {
    // Never allow webpage to cancel clipboard or selection events
    if (UNBLOCK_EVENTS.has(this.type)) {
      return;
    }

    // Never allow webpage to cancel Cmd+C, Cmd+V, Cmd+X, Cmd+A (Mac) or Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A (Win)
    if (this.type === 'keydown' || this.type === 'keyup' || this.type === 'keypress') {
      const k = (this.key || '').toLowerCase();
      const code = this.code || '';
      const isModifier = this.ctrlKey || this.metaKey || this.altKey;

      if (
        (isModifier && (k === 'c' || k === 'v' || k === 'x' || k === 'a' || code === 'KeyC' || code === 'KeyV' || code === 'KeyX' || code === 'KeyA' || k === 'insert' || code === 'Insert')) ||
        (this.shiftKey && (k === 'insert' || code === 'Insert'))
      ) {
        return; // Suppress website trying to preventDefault on copy/paste/cut shortcuts
      }
    }

    return origPreventDefault.apply(this, arguments);
  };

  // --- 2. OVERRIDE oncopy, onpaste, oncut, oncontextmenu on DOM Prototypes ---
  const PROTECTED_PROPS = [
    'oncopy',
    'oncut',
    'onpaste',
    'oncontextmenu',
    'onselectstart',
    'ondragstart',
    'onbeforecopy',
    'onbeforecut',
    'onbeforepaste'
  ];

  const TARGET_PROTOTYPES = [
    window,
    document,
    Document.prototype,
    HTMLElement.prototype,
    SVGElement.prototype,
    Element.prototype
  ];

  PROTECTED_PROPS.forEach(prop => {
    TARGET_PROTOTYPES.forEach(proto => {
      try {
        Object.defineProperty(proto, prop, {
          get() { return null; },
          set() { return true; },
          configurable: true,
          enumerable: true
        });
      } catch (e) {}
    });
  });

  // --- 3. DEEP MONACO / CODEMIRROR / REACT FIBER RESOLVER ---
  function findMonacoEditorInstance() {
    try {
      if (window.monaco && window.monaco.editor && window.monaco.editor.getEditors) {
        const editors = window.monaco.editor.getEditors();
        if (editors && editors.length > 0) {
          const focused = editors.find(ed => {
            try { return ed.hasTextFocus(); } catch (e) { return false; }
          });
          if (focused) return focused;

          const active = document.activeElement;
          for (const ed of editors) {
            try {
              const domNode = ed.getDomNode();
              if (domNode && (domNode === active || domNode.contains(active))) {
                return ed;
              }
            } catch (e) {}
          }
          return editors[0];
        }
      }
    } catch (e) {}

    try {
      const monacoElements = document.querySelectorAll('.monaco-editor, [data-keybinding-context], .view-lines');
      for (const el of monacoElements) {
        const target = el.closest('.monaco-editor') || el;
        for (const key of Object.keys(target)) {
          if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')) {
            let fiber = target[key];
            let depth = 0;
            while (fiber && depth < 25) {
              if (fiber.memoizedProps && fiber.memoizedProps.editor) {
                return fiber.memoizedProps.editor;
              }
              if (fiber.stateNode && fiber.stateNode.editor) {
                return fiber.stateNode.editor;
              }
              if (fiber.memoizedState && fiber.memoizedState.editor) {
                return fiber.memoizedState.editor;
              }
              fiber = fiber.return;
              depth++;
            }
          }
        }
      }
    } catch (e) {}

    return null;
  }

  function getActiveCodeMirror() {
    try {
      const active = document.activeElement;
      if (active) {
        const cmEl = active.closest ? active.closest('.CodeMirror') : null;
        if (cmEl && cmEl.CodeMirror) return cmEl.CodeMirror;
      }
      const firstCm = document.querySelector('.CodeMirror');
      if (firstCm && firstCm.CodeMirror) return firstCm.CodeMirror;
    } catch (e) {}
    return null;
  }

  function getActiveAceEditor() {
    try {
      if (window.ace && window.ace.edit) {
        const active = document.activeElement;
        if (active) {
          const aceEl = active.closest ? active.closest('.ace_editor') : null;
          if (aceEl) return window.ace.edit(aceEl);
        }
        const firstAce = document.querySelector('.ace_editor');
        if (firstAce) return window.ace.edit(firstAce);
      }
    } catch (e) {}
    return null;
  }

  // --- 4. TEXT EXTRACTION (FOR COPYING FROM EDITOR) ---
  function extractTextFromPageOrEditor() {
    // 1. Monaco Editor (Model Selection)
    const monacoEd = findMonacoEditorInstance();
    if (monacoEd) {
      try {
        const sel = monacoEd.getSelection();
        const model = monacoEd.getModel();
        if (sel && model) {
          const selText = model.getValueInRange(sel);
          if (selText) return selText;
        }
      } catch (e) {}
    }

    // 2. CodeMirror
    const cm = getActiveCodeMirror();
    if (cm) {
      try {
        const text = cm.getSelection();
        if (text) return text;
      } catch (e) {}
    }

    // 3. Ace
    const aceEd = getActiveAceEditor();
    if (aceEd) {
      try {
        const text = aceEd.getSelectedText();
        if (text) return text;
      } catch (e) {}
    }

    // 4. Native DOM Selection
    try {
      const sel = window.getSelection();
      if (sel && sel.toString()) {
        return sel.toString();
      }
    } catch (e) {}

    // 5. Monaco Visual DOM View-Lines (if model was unreachable)
    try {
      const monacoContainer = document.querySelector('.monaco-editor');
      if (monacoContainer) {
        const selectedDoms = monacoContainer.querySelectorAll('.selected-text');
        if (selectedDoms && selectedDoms.length > 0) {
          return Array.from(selectedDoms).map(d => d.textContent).join('\n');
        }
      }
    } catch (e) {}

    // 6. Input / Textarea
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      try {
        const start = active.selectionStart;
        const end = active.selectionEnd;
        if (start !== undefined && end !== undefined && start !== end && active.value) {
          return active.value.substring(start, end);
        }
      } catch (e) {}
    }

    // 7. Fallback: Entire model
    if (monacoEd && monacoEd.getValue) {
      try {
        return monacoEd.getValue();
      } catch (e) {}
    }

    return '';
  }

  // --- 5. DIRECT TEXT INJECTION (Debounced to NEVER paste twice) ---
  function insertTextIntoActiveEditor(text) {
    if (!text) return false;

    // Prevent duplicate rapid calls
    const now = Date.now();
    if (now - lastPasteTimestamp < 350) return false;
    lastPasteTimestamp = now;

    // 1. Monaco Editor via API
    const monacoEd = findMonacoEditorInstance();
    if (monacoEd) {
      try {
        const sel = monacoEd.getSelection ? monacoEd.getSelection() : null;
        if (sel) {
          monacoEd.executeEdits('ayan-paste', [{
            range: sel,
            text: text,
            forceMoveMarkers: true
          }]);
          if (monacoEd.pushUndoStop) monacoEd.pushUndoStop();
          if (monacoEd.focus) monacoEd.focus();
          return true;
        }
      } catch (e) {}
    }

    // 2. Monaco Editor via InputArea BeforeInput / ExecCommand
    const monacoInputArea = document.querySelector('.monaco-editor textarea.inputarea, textarea.inputarea');
    if (monacoInputArea) {
      try {
        monacoInputArea.focus();
        const beforeInputEvt = new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: text
        });
        monacoInputArea.dispatchEvent(beforeInputEvt);
        document.execCommand('insertText', false, text);
        return true;
      } catch (e) {}
    }

    // 3. CodeMirror
    const cm = getActiveCodeMirror();
    if (cm) {
      try {
        cm.replaceSelection(text);
        if (cm.focus) cm.focus();
        return true;
      } catch (e) {}
    }

    // 4. Ace Editor
    const aceEd = getActiveAceEditor();
    if (aceEd) {
      try {
        aceEd.insert(text);
        if (aceEd.focus) aceEd.focus();
        return true;
      } catch (e) {}
    }

    // 5. Standard Input / Textarea / ContentEditable
    const active = document.activeElement;
    if (active) {
      if (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') {
        try {
          const start = active.selectionStart || 0;
          const end = active.selectionEnd || 0;
          const val = active.value || '';
          active.value = val.substring(0, start) + text + val.substring(end);
          active.selectionStart = active.selectionEnd = start + text.length;

          ['beforeinput', 'input', 'change'].forEach(evt => {
            active.dispatchEvent(new Event(evt, { bubbles: true, cancelable: true }));
          });
          return true;
        } catch (e) {}
      } else if (active.isContentEditable) {
        try {
          document.execCommand('insertText', false, text);
          return true;
        } catch (e) {}
      }
    }

    try {
      if (document.execCommand('insertText', false, text)) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  // --- 6. EVENT LISTENERS (CAPTURE PHASE) ---

  // Handle native PASTE event:
  // Since Event.prototype.preventDefault is overridden, browser/Monaco natively processes the paste once!
  // We record timestamp to avoid double insertion if a fallback event also arrives.
  window.addEventListener('paste', () => {
    lastPasteTimestamp = Date.now();
  }, { capture: true, passive: true });

  // Handle native COPY event
  window.addEventListener('copy', (e) => {
    const text = extractTextFromPageOrEditor();
    if (text && e.clipboardData) {
      try {
        e.clipboardData.setData('text/plain', text);
        e.clipboardData.setData('text/html', text);
      } catch (err) {}
    }
  }, { capture: true, passive: false });

  // Handle native CUT event
  window.addEventListener('cut', (e) => {
    const text = extractTextFromPageOrEditor();
    if (text && e.clipboardData) {
      try {
        e.clipboardData.setData('text/plain', text);
      } catch (err) {}
    }
  }, { capture: true, passive: false });

  // --- 7. MONACO & EDITOR AUTO-CONFIGURATOR ---
  function configureMonacoEditors() {
    if (window.monaco && window.monaco.editor) {
      try {
        if (window.monaco.editor.getEditors) {
          window.monaco.editor.getEditors().forEach(ed => {
            try {
              ed.updateOptions({
                readOnly: false,
                contextmenu: true,
                domReadOnly: false
              });
            } catch (e) {}
          });
        }
      } catch (e) {}
    }

    document.querySelectorAll('.CodeMirror').forEach(cmEl => {
      if (cmEl.CodeMirror) {
        try { cmEl.CodeMirror.setOption('readOnly', false); } catch (e) {}
      }
    });

    if (window.ace && window.ace.edit) {
      document.querySelectorAll('.ace_editor').forEach(aceEl => {
        try {
          const ed = window.ace.edit(aceEl);
          if (ed) ed.setReadOnly(false);
        } catch (e) {}
      });
    }

    document.querySelectorAll('input, textarea, [contenteditable]').forEach(el => {
      try {
        if (el.readOnly && !el.dataset.keepReadonly) el.readOnly = false;
        if (el.disabled) el.disabled = false;
      } catch (e) {}
    });
  }

  // --- 8. POSTMESSAGE BRIDGE (FOR HOTKEY FALLBACKS) ---
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'AYAN_TRIGGER_PASTE') {
      const text = event.data.text;
      if (text) {
        insertTextIntoActiveEditor(text);
      }
    } else if (event.data.type === 'AYAN_TRIGGER_COPY_REQ') {
      const text = extractTextFromPageOrEditor();
      window.postMessage({ type: 'AYAN_TRIGGER_COPY_RESP', text: text }, '*');
    }
  });

  setInterval(configureMonacoEditors, 400);
  configureMonacoEditors();

  window.__ayan_paste = insertTextIntoActiveEditor;
  window.__ayan_copy = extractTextFromPageOrEditor;
})();
