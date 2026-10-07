class Component {
  cleanups = [];
  load() {
  }
  unload() {
    this.cleanups.splice(0).forEach((fn) => fn());
  }
  register(fn) {
    this.cleanups.push(fn);
  }
}
class ItemView extends Component {
  contentEl = document.createElement("div");
  leaf;
  constructor(leaf) {
    super();
    this.leaf = leaf;
    Object.assign(this.contentEl, {
      empty() {
        this.replaceChildren();
      },
      addClass(name) {
        this.classList.add(name);
      },
      onWindowMigrated(listener) {
        const event = () => listener();
        this.addEventListener("test-window-migrated", event);
        return () => this.removeEventListener("test-window-migrated", event);
      }
    });
  }
}
class WorkspaceLeaf {
}
class FuzzySuggestModal {
}
class Modal {
}
class ButtonComponent {
}
class Notice {
}
class App {
}
// Minimal native settings API fixture; production continues to use Obsidian's API.
Object.assign(HTMLElement.prototype, {
  empty() { this.replaceChildren(); },
  addClass(name) { this.classList.add(name); },
  createEl(tag, options = {}) {
    const el = this.ownerDocument.createElement(tag);
    if (options.cls) el.className = options.cls;
    if (options.text) el.textContent = options.text;
    if (options.href) el.setAttribute("href", options.href);
    this.append(el);
    return el;
  },
  createDiv(options) { return this.createEl("div", options); },
});
class PluginSettingTab {
  containerEl = document.createElement("div");
}
class Setting {
  constructor(container) {
    this.settingEl = container.createDiv({ cls: "setting-item" });
    this.info = this.settingEl.createDiv({ cls: "setting-item-info" });
    this.name = this.info.createDiv({ cls: "setting-item-name" });
    this.desc = this.info.createDiv({ cls: "setting-item-description" });
    this.control = this.settingEl.createDiv({ cls: "setting-item-control" });
  }
  setName(value) { this.name.textContent = value; return this; }
  setDesc(value) { this.desc.textContent = value; return this; }
  setClass(value) { this.settingEl.classList.add(value); return this; }
  setHeading() { this.settingEl.classList.add("setting-item-heading"); this.settingEl.setAttribute("role", "heading"); return this; }
  addControl(tag, type, callback) {
    const el = this.control.createEl(tag);
    if (type) el.type = type;
    const component = {
      inputEl: el,
      selectEl: el,
      toggleEl: el,
      addOption(value, label) { el.append(new Option(label, value)); return this; },
      setValue(value) { if (type === "checkbox") el.checked = value; else el.value = value; return this; },
      setPlaceholder(value) { el.placeholder = value; return this; },
      setButtonText(value) { el.textContent = value; return this; },
      setDisabled(value) { el.disabled = value; return this; },
      onChange(fn) { el.addEventListener(tag === "select" || type === "checkbox" ? "change" : "input", () => fn(type === "checkbox" ? el.checked : el.value)); return this; },
      onClick(fn) { el.addEventListener("click", fn); return this; },
    };
    callback(component);
    return this;
  }
  addText(callback) { return this.addControl("input", "text", callback); }
  addTextArea(callback) { return this.addControl("textarea", null, callback); }
  addDropdown(callback) { return this.addControl("select", null, callback); }
  addToggle(callback) { return this.addControl("input", "checkbox", callback); }
  addButton(callback) { return this.addControl("button", "button", callback); }
}
const normalizePath = (path) => path;
const requestUrl = async () => {
  throw new Error("Network disabled in UI test");
};
const MarkdownRenderer = {
  async render(_app, markdown, root) {
    const delay = markdown.startsWith("slow") ? 90 : 5;
    await new Promise((resolve) => setTimeout(resolve, delay));
    for (const line of markdown.split("\n\n")) {
      const p = root.ownerDocument.createElement("p");
      p.textContent = line;
      root.append(p);
    }
  }
};
export {
  App,
  ButtonComponent,
  Component,
  FuzzySuggestModal,
  ItemView,
  MarkdownRenderer,
  Modal,
  Notice,
  WorkspaceLeaf,
  normalizePath,
  requestUrl,
  PluginSettingTab,
  Setting
};
