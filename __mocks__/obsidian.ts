export const requestUrl = async () => ({
  status: 200,
  text: "",
  json: {},
  arrayBuffer: new ArrayBuffer(0),
  headers: {},
});

export const Notice = class Notice {
  constructor() {}
};

export const Plugin = class Plugin {};

export const WorkspaceLeaf = class WorkspaceLeaf {};

export const ItemView = class ItemView {};

export const FuzzySuggestModal = class FuzzySuggestModal {
  constructor() {}
  setPlaceholder() {}
  open() {}
};
