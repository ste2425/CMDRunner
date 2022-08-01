const { app, Menu, Tray, shell, BrowserWindow, session, dialog, clipboard } = require('electron'),
  path = require('path'),
  fs = require('fs'),
  { spawn } = require('child_process');

/** @typedef {{ label: string, command: string, group: string }} ConfigCommand */
/** @typedef {{ darkTheme: boolean }} ConfigGeneral */
/** @typedef {{ commands: ConfigCommand[], general: ConfigGeneral }} Config */

/** @type {Config} */
const defaultConfig = {
  general: {
    darkTheme: true
  },
  commands: [
    {
      label: "Example: Open GitHub",
      command: "/C \"start https://github.com\""
    }, {
      label: 'Example: Open Google',
      command: '/C "start https://google.com"',
      group: "Optional Group"
    }]
};

const defaultCommand = "/K \"echo Command not provided\"",
  defaultLabel = "Label not provided";

const gotTheLock = app.requestSingleInstanceLock();

class CMDRunner {
  /** @type {Tray} */ #tray;
  /** @type {string} */ #settingsPath;
  /** @type {fs.FSWatcher} */ #settingsWatcher;
  /** @type {number} */ #watchDebounceTimeout;

  constructor() {
    app.whenReady()
      .then(() => {
        this.#settingsPath = path.join(app.getPath('userData'), 'settings.json');
        this.#verifySettingsFile();

        this.#tray = new Tray(this.#getTrayIconPath());

        this.#generateMenu();

        this.#settingsWatcher = fs.watch(this.#settingsPath).on('change', () => this.#watchHandler());

        app.on('quit', () => this.#settingsWatcher.close());

        // Prevent closing about page quiting app.
        app.on('window-all-closed', (e) => e.preventDefault());
      })
      .catch((e = {}) => {
        const message = `${JSON.stringify({
            message: e.message || 'No Message',
            stack: e.stack || 'No Stack'
        }, null, 3)}
        
Error has been copied to clip board.`;

        clipboard.writeText(message);

        const index = dialog.showMessageBoxSync({
          type: 'error',
          title: 'Unexpected Error',
          message
        });

        app.quit();
      });
  }

  /** @returns {Config} */
  #getConfig() {
    return JSON.parse(fs.readFileSync(this.#settingsPath));
  }

  #getTrayIconPath() {
    const config = this.#getConfig();

    const image = config?.general?.darkTheme ? 'icon-dark.png' : 'icon-light.png';

    return path.join(__dirname, image);
  }

  // Watch sometimes fires multiple times so just debounce it
  #watchHandler() {
    clearTimeout(this.#watchDebounceTimeout);

    this.#watchDebounceTimeout = setTimeout(() => {
      this.#generateMenu();

      this.#tray.setImage(this.#getTrayIconPath());
    }, 500);
  }

  #verifySettingsFile() {
    try {
      fs.writeFileSync(this.#settingsPath, JSON.stringify(defaultConfig, null, 3), { flag: 'wx' });
    } catch (error) {
      if (error.code == 'EEXIST') {
        console.log(`Settings file found at ${error.path}`);
      } else {
        throw error;
      }
    }
  }

  #generateMenu() {
    const config = this.#getConfig();

    const commandsGrouped = config.commands.reduce((grouped, command) => {
      const group = command.group || 'ROOT';

      if (group in grouped) {
        grouped[group].push(this.#genrateMenuItem(command));
      } else {
        grouped[group] = [this.#genrateMenuItem(command)];
      }

      return grouped;
    }, {});

    const template = Object.entries(commandsGrouped).flatMap(([label, commandList]) => {
      if (label === 'ROOT')
        return commandList;
      else
        return {
          label,
          submenu: commandList
        };
    });

    const defaultCommands = [
      {
        label: 'Settings',
        click: () => shell.openExternal(this.#settingsPath)
      },
      {
        label: 'About',
        click: () => this.#loadAboutPage()
      },
      {
        label: 'Quit',
        click: () => app.quit()
      }
    ]

    this.#tray.setContextMenu(Menu.buildFromTemplate([...template, ...defaultCommands]));
  }

  /** @param {ConfigCommand} configCommand */
  #genrateMenuItem(configCommand) {
    return {
      label: configCommand.label || defaultLabel,
      click() {
        spawn('cmd.exe', [configCommand.command || defaultCommand], {
          detached: true,
          shell: true
        });
      }
    }
  }

  #loadAboutPage() {
    const win = new BrowserWindow({ autoHideMenuBar: true });

    // YT refuses to embed within a page loaded with a file protocol.
    // This monkey patches the http protocol to load from file.
    session.defaultSession.protocol.interceptFileProtocol('http', (request, callback) => {
      const fileUrl = request.url.replace('http://localhost/', '');
      const filePath = path.join(__dirname, fileUrl);

      if (request.url.includes('about.html')) {
        session.defaultSession.protocol.uninterceptProtocol('http');
      }

      callback(filePath);
    });

    win.loadURL('http://localhost/about.html');
  }
}

if (gotTheLock) {
  new CMDRunner();
} else {
  app.quit();
}