# VSCODE Development with DF Devspaces

## Install DF Devspaces

1. Create and install devspaces client as it is written in help guide https://support.devspaces.io/article/22-devspaces-client-installation.

2. Here is some details about DF Devspaces https://devspaces.io/devspaces/help

Here follows the main commands used in Devspaces cli. 

|action   |Description                                                                                   |
|---------|----------------------------------------------------------------------------------------------|
|`devspaces --help`                    |Check the available command names.                               |
|`devspaces create [options]`          |Creates a DevSpace using your local DevSpaces configuration file |
|`devspaces start <devSpace>`          |Starts the DevSpace named \[devSpace\]                           |
|`devspaces bind <devSpace>`           |Syncs the DevSpace with the current directory                    |
|`devspaces info <devSpace> [options]` |Displays configuration info about the DevSpace.                  |

Use `devspaces --help` to know about updated commands.


### Start Devspaces 

It is assumed that terminal is opened in `devspaces` folder of the repository.

1.  Create devspace.

```bash
devspaces create
```

2. Start your devspaces.
```bash
devspaces start vscode
```

3. Start containers synchronization

```bash
cd ..
devspaces bind vscode
```

4. Get some information about the created devspace.

```bash
devspaces info vscode
```

5. Connect to development container

```bash
devspaces exec vscode
```

6. Build the project

```bash
yarn
```

7. Run the tests

```bash
./scripts/test.sh
```