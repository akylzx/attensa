import { Tray, Menu, BrowserWindow, nativeImage } from 'electron';
import { sessionManager } from './tracker/session-manager.js';
import { DURATION_OPTIONS } from '@attensa/shared';

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow) {
  // Create a simple 16x16 tray icon (solid circle)
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Attensa');

  updateTrayMenu(mainWindow);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });
}

function updateTrayMenu(mainWindow: BrowserWindow) {
  if (!tray) return;

  const isActive = sessionManager.isActive();

  const menuItems: Electron.MenuItemConstructorOptions[] = isActive
    ? [
        { label: 'Focus Session Active', enabled: false },
        { type: 'separator' },
        {
          label: 'End Session',
          click: () => {
            sessionManager.endSession();
          },
        },
        {
          label: 'Cancel Session',
          click: () => {
            sessionManager.cancelActiveSession();
          },
        },
      ]
    : [
        {
          label: 'Start Focus Time',
          submenu: DURATION_OPTIONS.map((opt) => ({
            label: `${opt.label} (${opt.minutes} min)`,
            click: async () => {
              await sessionManager.startSession(opt.ms);
              mainWindow.show();
              mainWindow.webContents.send('navigate', '/session/active');
            },
          })),
        },
      ];

  menuItems.push(
    { type: 'separator' },
    {
      label: 'Open Attensa',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' }
  );

  const contextMenu = Menu.buildFromTemplate(menuItems);
  tray.setContextMenu(contextMenu);
}
