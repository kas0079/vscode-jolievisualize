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
} from "./visFile";
import { formatBuildFolder, makeDeploymentFolders } from "./deploy";

const USE_LSP = false;

let interceptSave = false;
let visFile: vscode.Uri | undefined = undefined;
const disposeables: vscode.Disposable[] = [];
const fileVersions: { fileName: string; version: number }[] = [];

export const setIntercept = (bool: boolean): void => {
	interceptSave = bool;
};

export const getVisFile = (): vscode.Uri | undefined => {
	return visFile;
};

export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"jolievisualize.open",
			async (defaultVf = true) => {
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
						.get("visualizationfile") as string;

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

				// Select visualize file and getJSON
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
				WebPanel.data = jv.getData(visFile, false);
				WebPanel.visFile = visFile;
				WebPanel.visFileContent = JSON.stringify(
					await getVisFileContent(visFile)
				);

				// open webview
				WebPanel.open(context.extensionPath);

				let tls: TLS;

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
						if (tmp === undefined)
							fileVersions.push({
								fileName: e.fileName,
								version: e.version,
							});
						else {
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
							await WebPanel.setVisfileContent(
								JSON.stringify(newContent)
							);
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

	context.subscriptions.push(
		vscode.commands.registerCommand("jolievisualize.init", async () => {
			const confFile = vscode.workspace
				.getConfiguration("jolievisualize")
				.get("visualizationfile") as string;

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
					"Couldn't create Jolie visualization file"
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

	context.subscriptions.push(
		vscode.commands.registerCommand("jolievisualize.build", async () => {
			if (visFile === undefined) {
				const confFile = vscode.workspace
					.getConfiguration("jolievisualize")
					.get("visualizationfile") as string;

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
					"No visualization file was chosen."
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

			makeDeploymentFolders({
				data: buildData,
				visFile: visFile.fsPath,
				buildFolder: buildFolder ?? "/build",
				deployMethod: buildMethod ?? "docker-compose",
			});
		})
	);
}

export function deactivate(): void {
	interceptSave = false;
	visFile = undefined;
	while (fileVersions.length > 0) fileVersions.pop();
	disposeables.forEach((d) => d.dispose());
}
