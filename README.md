# Jolie Visualization for Visual Studio Code

Visualize, refactor and build [Jolie](https://www.jolie-lang.org) projects directly in vscode.

## Requirements

-   It is required that Jolie, version 1.11.0-git, is set up correctly. Look [here](https://www.jolie-lang.org/downloads.html) for further explanation on how to set up Jolie correctly.

*   A JSON configuration file is used for getting information about the top-level services and networks. See the section on how to set up the visualization file.

## Features

### Setting up the visualization config file

Run the command `Jolie: Initialize Visualization File` and a standard skeleton JSON file will be created. Change the `file` field to the Jolie file which contains the service you want to visualize. Change the `target` field to the name of the service, or remove it if only one service exists in the file. Add more services if needed, and see the section about the structure of the visualization file for more features.

### Visualize

When a valid visualization file has been created, run the command: `Jolie: Visualize` to bring up the UI:
![Jolievisualize vscode example](https://i.imgur.com/KlO4bKw.png)

### Refactor

From the UI, you can change the architecture of the project. The code gets updated after any changes.

Possible refactors at the moment include:

-   Changing the location of ports
-   Changing the protocol of ports
-   Embedding and disembedding services
-   Move service to other networks
-   Creating input and output ports
-   Select some services and add an Aggregator service in front of them.

### Build

Build the project using the command: `Jolie: Build Project` and a folder will be created containing each service, and its dependencies, with a corresponding Dockerfile. A docker-compose.yml file will also be created.

## Extension Settings

-   `jolievisualize.buildFolder`: Relative path to where the project should build to. The default is `./build`.
-   `jolievisualize.buildMethod`: Deployment method to use for the build. Only `docker-compose` is supported at the moment.
-   `jolievisualize.visualizationfile`: Standard visualization file to get the top-level service information from. The default is `./visualize.jolie.json`.

## All Commands

| **Command**                          | **Description**                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Jolie: Visualize                     | Opens the UI                                                                                      |
| Jolie: Build Project                 | Creates the build folder, in the root of the project, and sets up a deployment yaml file          |
| Jolie: Initialize Visualization File | Creates a skeleton visualisation JSON file in the root of the project                             |
| Jolie: Choose Visualization File     | Opens a file selector which allows the user to choose another JSON file as the visualization file |

## Snippets

### jv

Skeleton visualization file.

```JSON
[
    [
        {"file":"svc.ol", "target":"name", "instances":1}
    ]
]
```

### jvservice

Skeleton top-level service.

```JSON
{"file":"svc.ol", "target":"name", "instances":1}
```

### jvdocker

Skeleton top-level Docker service.

```JSON
{"name":"svc", "image":"image", "instances": 1, "ports":["3000:3000"]}
```

## Visualize JSON File Structure

The file contains an array of arrays of services. Each array in the enveloping array represents a network.

Example:

```JSON
[
    [
        {...}, {...}
    ],
    [
        {...}
    ]
]
```

This means that there are _two_ networks where the first contains two services and the second contains one service.

### Service Fields

Here is a table of possible fields for a service:

| **Field** | **Description**                                                                     | **Type**       | **Example**                                       |
| --------- | ----------------------------------------------------------------------------------- | -------------- | ------------------------------------------------- |
| file      | The location of a Jolie file relative to the visualization file                     | String         | `main.ol`                                         |
| target    | Name of the service in the file                                                     | String         | `MainService`                                     |
| name      | Name of the service in the file                                                     | String         | `MainService`                                     |
| instances | Number of instances of the service to be visualized                                 | Long           | `2`                                               |
| container | Name of the container in the deployment yaml file                                   | String         | `MainContainer`                                   |
| args      | Jolie arguments which gets added to the Dockerfile after building                   | String         | `--connlimit 10 --stackTraces`                    |
| params    | Either path to a JSON file containing service parameters, or the parameters as JSON | String or JSON | `params.json` or `{ location: "localhost:3432" }` |
| env       | Deployment environment variables. Gets added in the deployment yaml file            | JSON           | `{ username: "test", password: "123" }`           |
| images    | Specifies a remote image which gets added in the deployment yaml file               | String         | `emilovcina/SomeJolieImage`                       |
| ports     | List of strings defining Docker port mappings                                       | String[]       | `["4000:4000","3444:9000"]`                       |
| volumes   | List of file locations which will get bound as volumes when running the deployment  | String[]       | `["/config.ini","assets/test.txt"]`               |

## Known Issues

-   Renaming ports and service does not work
-   User must manually import interfaces and services before refactoring in the UI

## Release Notes

### 1.0.0

Initial release
