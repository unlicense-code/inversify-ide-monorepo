// *****************************************************************************
// Copyright (C) 2026 AwesomeOS and Contributors.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import Electron from 'electron';
const electron = require('electron') as typeof Electron;
export default electron;
// Re-export all named exports from electron
export const app = electron.app;
export const BrowserWindow = electron.BrowserWindow;
export const ipcMain = electron.ipcMain;
export const ipcRenderer = electron.ipcRenderer;
export const dialog = electron.dialog;
export const shell = electron.shell;
export const screen = electron.screen;
export const nativeImage = electron.nativeImage;
export const nativeTheme = electron.nativeTheme;
export const Menu = electron.Menu;
export const MenuItem = electron.MenuItem;
export const clipboard = electron.clipboard;
export const session = electron.session;
export const webContents = electron.webContents;
export const globalShortcut = electron.globalShortcut;
export const powerMonitor = electron.powerMonitor;
export const protocol = electron.protocol;
export const systemPreferences = electron.systemPreferences;
export const net = electron.net;
export const Notification = electron.Notification;
export const TouchBar = electron.TouchBar;
export const autoUpdater = electron.autoUpdater;
export const contentTracing = electron.contentTracing;
export const crashReporter = electron.crashReporter;
export const inAppPurchase = electron.inAppPurchase;
export const safeStorage = electron.safeStorage;
export const utilityProcess = electron.utilityProcess;
export const webFrameMain = electron.webFrameMain;
export const webUtils = electron.webUtils;
export const contextBridge = electron.contextBridge;

// Explicitly export types that might be needed
export type IpcRendererEvent = Electron.IpcRendererEvent;
export type IpcMainEvent = Electron.IpcMainEvent;
export type MenuItemConstructorOptions = Electron.MenuItemConstructorOptions;
export type OpenDialogOptions = Electron.OpenDialogOptions;
export type SaveDialogOptions = Electron.SaveDialogOptions;
export type BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions;
export type BrowserWindow = InstanceType<typeof Electron.BrowserWindow>;
export type Event = Electron.Event;

