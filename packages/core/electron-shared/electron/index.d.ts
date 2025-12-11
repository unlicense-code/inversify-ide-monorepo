import Electron from '@theia/electron/shared/electron';
export default Electron;
export * from '@theia/electron/shared/electron';
// Explicitly export types that might be needed
export type IpcRendererEvent = Electron.IpcRendererEvent;
export type IpcMainEvent = Electron.IpcMainEvent;
export type MenuItemConstructorOptions = Electron.MenuItemConstructorOptions;
export type OpenDialogOptions = Electron.OpenDialogOptions;
export type SaveDialogOptions = Electron.SaveDialogOptions;
