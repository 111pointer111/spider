import { App, ConfirmationModal, Notice } from "obsidian";

export function confirmDelete(app: App, itemName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = new ConfirmationModal(app);
    modal.titleEl.setText("确认删除");
    modal.contentEl.setText(`确认删除「${itemName}」？此操作不可撤销。`);

    modal.addCancelButton("取消");

    modal.addButton((btn) => {
      btn.setButtonText("删除").setCta().onClick(() => {
        resolve(true);
      });
    });

    modal.onClose = () => {
      resolve(false);
    };

    modal.open();
  });
}
