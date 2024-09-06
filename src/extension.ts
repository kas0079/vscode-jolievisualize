import * as jv from "jolievisualize";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import WebPanel from "./WebPanel";
import { TLS } from "./global";
import {
	getAllTopServiceFiles,
	getVisFileContent,
	hasTargetNameChanged,
	setVisfileContent,
} from "./visFile";
import { formatBuildFolder, build } from "./deploy";

// set to true if extension should rely on vscode-jolie to function
const USE_LSP = false;

let outputChannel = vscode.window.createOutputChannel("jolievisualize-extension-TS");
outputChannel.show();
let interceptSave = false;
let visFile: vscode.Uri | undefined = undefined;
const disposeables: vscode.Disposable[] = [];
const fileVersions: { fileName: string; version: number }[] = [];

/**
 * @param bool true if onSaveListener should not run on a document save
 */
export const setIntercept = (bool: boolean): void => {
	interceptSave = bool;
};

/**
 * @returns architecture file URI
 */
export const getVisFileURI = (): vscode.Uri | undefined => {
	return visFile;
};

/**
 * Main method of the extension. Registers all commands and collects them as disposables.
 * @param context Extension context
 */
export function activate(context: vscode.ExtensionContext): void {
	/**
	 * Open webview command
	 */
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"jolievisualize.open",
			async (defaultVf = true) => {
				outputChannel.appendLine("start of jolievisualize.open")
				console.log("start of jolievisualize.open");
				if (USE_LSP) {
					const vscodeJolie =
						vscode.extensions.getExtension("jolie.vscode-jolie");

					if (vscodeJolie === undefined) {
						vscode.window.showErrorMessage(
							"The vscode extension for Jolie must be enabled"
						);
						return;
					}
					if (!vscodeJolie.isActive) {
						// Activate jolie extension
						await vscodeJolie.activate();
					}
				}

				if (defaultVf) {
					const confFile = vscode.workspace
						.getConfiguration("jolievisualize")
						.get("architectureFile") as string;

					if (!vscode.workspace.workspaceFolders) {
						deactivate();
						return;
					}
					const workspaceRoot = vscode.workspace.workspaceFolders[0];
					const visFilepath = vscode.Uri.parse(
						path.join(workspaceRoot.uri.fsPath, confFile)
					);
					if (fs.existsSync(visFilepath.fsPath))
						visFile = visFilepath;
				}

				// Select architecture file and getJSON
				if (visFile === undefined) {
					await vscode.commands.executeCommand(
						"jolievisualize.choosefile"
					);
				}

				if (visFile === undefined) {
					await vscode.window.showErrorMessage(
						"No visualization file was chosen."
					);
					deactivate();
					return;
				}

				// setData of webview
				interceptSave = false;
				let getDataResult = jv.getData(visFile, false);
				outputChannel.appendLine(getDataResult);
				WebPanel.data = getDataResult;
				WebPanel.visFile = visFile;
				WebPanel.visFileContent = JSON.stringify(
					await getVisFileContent(visFile)
				);

				// open webview
				WebPanel.open(context.extensionPath);

				let tls: TLS;

				// runs before onSaveListener
				let onWillSaveListener =
					vscode.workspace.onWillSaveTextDocument(async (e) => {
						if (!e.document.fileName.endsWith(".ol") || !visFile)
							return;
						if (
							(await getAllTopServiceFiles(visFile)).includes(
								e.document.fileName
							)
						) {
							const vfContent = (await getVisFileContent(visFile))
								.flat()
								.find(
									(t) =>
										t.file &&
										e.document.fileName.endsWith(t.file)
								);
							if (!vfContent) return;
							tls = {
								file: vfContent.file,
								target: vfContent.target,
								instances: vfContent.instances,
								params: vfContent.params,
							};
						}
					});

				// create listener for onSave events
				let onSaveListener = vscode.workspace.onDidSaveTextDocument(
					async (e) => {
						if (
							(e.languageId !== "json" &&
								e.languageId !== "jolie") ||
							e.isDirty ||
							!visFile ||
							!WebPanel.currentPanel
						)
							return;

						if (
							e.languageId === "json" &&
							e.fileName === visFile.fsPath &&
							!interceptSave
						) {
							const newData = jv.getData(visFile, false);
							if (newData === WebPanel.data) return;
							WebPanel.data = newData;
							WebPanel.initData();
							return;
						}
						if (interceptSave) return;

						const tmp = fileVersions.find(
							(t) => t.fileName === e.fileName
						);
						if (tmp === undefined) {
							if (fileVersions.length >= 6)
								fileVersions.splice(0, 5);
							fileVersions.push({
								fileName: e.fileName,
								version: e.version,
							});
						} else {
							if (e.version <= tmp.version) return;
							tmp.version = e.version;
						}

						if (
							tls &&
							tls.file &&
							(await hasTargetNameChanged(tls))
						) {
							const vfContent = await getVisFileContent(visFile);
							const tlsInFile = vfContent
								.flat()
								.find(
									(t) => t.file && e.fileName.endsWith(t.file)
								);
							if (!tlsInFile) return;
							tlsInFile.file = tls.file;
							tlsInFile.target = undefined;
							tlsInFile.instances = tls.instances;
							tlsInFile.params = tls.params;
							const newContent = { content: vfContent };
							await setVisfileContent(JSON.stringify(newContent));
						}
						const newData = jv.getData(visFile, false);
						if (newData === WebPanel.data) return;
						WebPanel.data = newData;
						WebPanel.initData();
					}
				);
				disposeables.push(onSaveListener);
				disposeables.push(onWillSaveListener);
			}
		)
	);

	/**
	 * Choose file command:
	 * Opens a file selector for the user to select a architecture JSON file
	 */
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"jolievisualize.choosefile",
			async (shouldOpenWebview = true) => {
				const res = await vscode.window.showOpenDialog({
					canSelectMany: false,
					canSelectFolders: false,
				});
				if (!res) return;
				visFile = res[0];
				if (!shouldOpenWebview) return;
				WebPanel.close();
				await vscode.commands.executeCommand(
					"jolievisualize.open",
					false
				);
			}
		)
	);

	/**
	 * Initialize architecture File command:
	 * Creates a architecture.jolie.json file with a skeleton structure.
	 */
	context.subscriptions.push(
		vscode.commands.registerCommand("jolievisualize.init", async () => {
			const confFile = vscode.workspace
				.getConfiguration("jolievisualize")
				.get("architectureFile") as string;

			if (
				!vscode.workspace.workspaceFolders ||
				fs.existsSync(
					path.join(
						vscode.workspace.workspaceFolders[0].uri.fsPath,
						confFile
					)
				)
			) {
				await vscode.window.showErrorMessage(
					"Couldn't create Jolie architecture file"
				);
				deactivate();
				return;
			}

			fs.writeFileSync(
				path.join(
					vscode.workspace.workspaceFolders[0].uri.fsPath,
					confFile
				),
				`[\n\t[\n\t\t{"file": "file.ol", "target": "ServiceName"}
	]
]`
			);
		})
	);

	/**
	 * Build Project command:
	 */
	context.subscriptions.push(
		vscode.commands.registerCommand("jolievisualize.build", async () => {
			if (visFile === undefined) {
				const confFile = vscode.workspace
					.getConfiguration("jolievisualize")
					.get("architectureFile") as string;

				if (!vscode.workspace.workspaceFolders) {
					deactivate();
					return;
				}
				const workspaceRoot = vscode.workspace.workspaceFolders[0];
				const visFilepath = vscode.Uri.parse(
					path.join(workspaceRoot.uri.fsPath, confFile)
				);
				if (fs.existsSync(visFilepath.fsPath)) visFile = visFilepath;
				else visFile = undefined;
			}

			if (visFile === undefined) {
				await vscode.commands.executeCommand(
					"jolievisualize.choosefile",
					false
				);
			}
			if (visFile === undefined) {
				await vscode.window.showErrorMessage(
					"No architecture file was chosen."
				);
				return;
			}
			const buildFolder = vscode.workspace
				.getConfiguration("jolievisualize")
				.get("buildFolder") as string;

			const buildMethod = vscode.workspace
				.getConfiguration("jolievisualize")
				.get("buildMethod") as string;

			const buildData = jv.getBuildData(
				visFile,
				buildMethod === "" ? buildMethod : "docker-compose",
				formatBuildFolder(buildFolder)
			);

			build({
				data: buildData,
				visFile: visFile.fsPath,
				buildFolder: buildFolder ?? "/build",
				deployMethod: buildMethod ?? "docker-compose",
			});
		})
	);
}

/**
 * Disposes of all disposables and reset the extension
 */
export function deactivate(): void {
	interceptSave = false;
	visFile = undefined;
	while (fileVersions.length > 0) fileVersions.pop();
	disposeables.forEach((d) => d.dispose());
}
