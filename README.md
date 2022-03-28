# CMDRunner
Run commands in a CMD Terminal easily.

# Download and install

Find the latest release [here](https://github.com/ste2425/CMDRunner/releases/latest).

Download the zip `CMDRunner-win32-x64.zip` and extract it somewhere.

It is not an installer, but the extracted files needed to run. `C:/ProgramFiles/CMDRunner` would be a good location.

Open the extracted folder and execute `CMDRunner.exe`.

You may wish to put a shortcut to this exe somewhere.

If you wish to run commands regularly you may wish to add this app to your startup programs.

# How does it work

CMDRunner executes a cmd.exe terminal and feeds the command stored in settings into it as arguments. From that point it's job is finished. It does not manage terminals behind the scenes, it merely opens them and feeds into it the commands stored in settings.

# Settings

Settings can be opened in your default editor to make changes by right clicking `CMDRunner` icon in your taskbar and selecting `Settings`.

This will open the `settings.json` file which will have a default command to open Google. Changes to this file are watched and will apply as soon as it is saved.

## Settings Validation

Settings file is validated upon saving. If a field is missing it will tell you which field. If the field is for a command it will tell you the index of that command in the list of commands.

## Dark/Light theme

It is possible to set the icon to a dark vs light mode by modyfing the settings file.

# Examples

The following command 

```json
{
    "label": "Example: Open Google",
    "command": "/C \"start https://google.com\""
}
```

Will result in the following being excuted `cmd.exe /C "start https://google.com"`

## Gotchas

* `/C`, `/K` - To actually execute commands with `cmd.exe` the arguments `/C` and `/K` are used, passing them the command to run. These two arguments are useful however. `/C` will close the terminal as soon as the command is complete whilst `/K` will keep it open, should you wish to inspect the output of a command for example.
* Escaped strings - Consider the command `"/C \"start https://google.com\""`. The escaped string is not required here. However if you combine commands, say `/K "cd <somePath> && dir"` only the first half, `cd` will be executed. Wrapping the entire thing in a string will cause the whole thing to be executed.

# Building manually

Clone the repository, execute `npm install` then `npm start` to launch the app.
