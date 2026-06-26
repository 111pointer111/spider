import { App, ButtonComponent, Modal, Notice } from "obsidian";

interface ConfirmActionOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

export function confirmAction(app: App, options: ConfirmActionOptions): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    // Use a plain Modal (not ConfirmationModal) and create ButtonComponent
    // instances directly. Both Modal.addButton and ConfirmationModal.addButton
    // install a default onClick AFTER the user callback runs, which clobbers
    // any handler set inside the callback. Creating ButtonComponent directly
    // is the only way to keep the click handler we actually want.
    const modal = new Modal(app);
    modal.titleEl.setText(options.title);
    modal.contentEl.setText(options.message);

    const buttonRow = modal.contentEl.createDiv({ cls: "spider-confirm-row" });

    new ButtonComponent(buttonRow)
      .setButtonText(options.cancelText)
      .onClick(() => {
        settle(false);
        modal.close();
      });

    new ButtonComponent(buttonRow)
      .setButtonText(options.confirmText)
      .setCta()
      .onClick(() => {
        settle(true);
        modal.close();
      });

    // Escape key, scrim click, or any other path that closes the modal
    // resolves to false.
    modal.onClose = (): void => {
      settle(false);
    };

    try {
      modal.open();
    } catch (openError: unknown) {
      const message = openError instanceof Error ? openError.message : String(openError);
      new Notice(`打开确认弹窗失败：${message}`);
      settle(false);
    }
  });
}

export function confirmDelete(app: App, itemName: string): Promise<boolean> {
  return confirmAction(app, {
    title: "确认删除",
    message: `确认删除「${itemName}」？此操作不可撤销。`,
    confirmText: "删除",
    cancelText: "取消",
  });
}
