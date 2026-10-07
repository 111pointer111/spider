import { vi } from "vitest";

export const requestUrl = vi.fn(async () => ({
  status: 200,
  text: "",
  json: {},
  arrayBuffer: new ArrayBuffer(0),
  headers: {},
}));

export const Notice = class Notice {
  constructor() {}
};

export const Plugin = class Plugin {};
export const PluginSettingTab = class PluginSettingTab {};

export const WorkspaceLeaf = class WorkspaceLeaf {};

export const ItemView = class ItemView {
  async setState() {}
};

export const FuzzySuggestModal = class FuzzySuggestModal {
  constructor() {}
  setPlaceholder() {}
  open() {}
};
