const { app, Menu, Tray, shell, BrowserWindow, session, dialog } = require('electron'),
  path = require('path'),
  fs = require('fs'),
  { spawn } = require('child_process');

/** @typedef {{ label: string, command: string }} ConfigCommand */
/** @typedef {{ commands: ConfigCommand[] }} Config */

/** @type {Config} */
const defaultConfig = { 
  commands: [{
    label: 'Example: Open Google',
    command: '/C "start https://google.com"'
  }] 
};

const iconFile = path.join(__dirname, 'icon.png');

class CMDRunner {
  /** @type {Tray} */ #tray;
  /** @type {string} */ #settingsPath;
  /** @type {fs.FSWatcher} */ #settingsWatcher;
  /** @type {number} */ #watchDebounceTimeout;

  constructor() {
    app.whenReady()
      .then(() => {
        this.#tray = new Tray(iconFile);
        this.#settingsPath = path.join(app.getPath('userData'), 'settings.json');

        this.#verifySettingsFile();
        this.#generateMenu();

        this.#settingsWatcher = fs.watch(this.#settingsPath).on('change', () => this.#watchHandler());

        app.on('quit', () => this.#settingsWatcher.close());

        // Prevent closing about page quiting app.
        app.on('window-all-closed', (e) => e.preventDefault());
      });
  }

  // Watch sometimes fires multiple times so just debounce it
  #watchHandler() {
    clearTimeout(this.#watchDebounceTimeout);

    this.#watchDebounceTimeout = setTimeout(() => this.#generateMenu(), 500);
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
    const config = JSON.parse(fs.readFileSync(this.#settingsPath));

    const validationErrors = this.#verifyConfig(config),
      hasErrors = validationErrors.length !== 0;

    if (hasErrors) {
      dialog.showErrorBox('Errors found with settings config', `Errors found:\n${validationErrors.join('\n')}`);
    }

    const template = hasErrors ? [] : config.commands.map(this.#genrateMenuItem);

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
      label: `Run ${configCommand.label}`,
      click() {
        spawn('cmd.exe', [configCommand.command], {
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
      
      if(request.url.includes('icon.png')) {
          session.defaultSession.protocol.uninterceptProtocol('http');
      }

      callback(filePath);
    });

    win.loadURL('http://localhost/about.html');
  }

  /** @param {Config} config */
  #verifyConfig(config = {}) {
    const errors = [];

    if (!config.commands || !Array.isArray(config.commands))
      errors.push('Config missing commands array.');
    else
      config.commands.forEach((c, i) => {
        const hasLabel = 'label' in c,
          hasCommand = 'command' in c;

        if (!hasCommand && !hasLabel)
          errors.push(`command and label fields missing for command at index ${i}`);
        else if (!hasCommand)
          errors.push(`command field missing for command at index ${i}`);
        else if (!hasLabel)
          errors.push(`label field missing for command at index ${i}`);
      });

    return errors;
  }
}

new CMDRunner();