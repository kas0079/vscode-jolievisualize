import * as jv from "jolievisualize";
import * as vscode from "vscode";
import WebPanel from "./WebPanel";
import {
	getAllTopServiceFiles,
	getVisFileContent,
	hasTargetNameChanged,
} from "./visFile";

let visFile: vscode.Uri[] | undefined = undefined;
const disposeables: vscode.Disposable[] = [];
const fileVersions: { fileName: string; version: number }[] = [];

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("jolievisualize.open", async () => {
			const vscodeJolie =
				vscode.extensions.getExtension("jolie.vscode-jolie");

			if (vscodeJolie === undefined) {
				vscode.window.showErrorMessage(
					"The vscode extension for Jolie must be enabled and active"
				);
				return;
			}

			if (!vscodeJolie.isActive) {
				// Activate jolie extension
				await vscodeJolie.activate();
			}

			// Select visualize file and getJSON
			if (visFile === undefined) {
				await vscode.commands.executeCommand(
					"jolievisualize.choosefile"
				);
			}

			if (visFile === undefined) {
				vscode.window.showErrorMessage(
					"No visualization file was chosen."
				);
				return;
			}

			// setData of webview
			WebPanel.data = await jv.getData(visFile, false);
			WebPanel.visFile = visFile[0];
			WebPanel.visFileContent = JSON.stringify(
				await getVisFileContent(visFile[0])
			);

			// open webview
			WebPanel.open(context.extensionPath);

			let tls: TLS;

			let onWillSaveListener = vscode.workspace.onWillSaveTextDocument(
				async (e) => {
					if (!e.document.fileName.endsWith(".ol") || !visFile)
						return;
					if (
						(await getAllTopServiceFiles(visFile[0])).includes(
							e.document.fileName
						)
					) {
						const vfContent = (await getVisFileContent(visFile[0]))
							.flat()
							.find((t) => e.document.fileName.endsWith(t.file));
						if (!vfContent) return;
						tls = {
							file: vfContent.file,
							target: vfContent.target,
							instances: vfContent.instances,
							params: vfContent.params,
						};
					}
				}
			);

			// create listener for onSave events
			let onSaveListener = vscode.workspace.onDidSaveTextDocument(
				async (e) => {
					if (
						(e.languageId !== "json" && e.languageId !== "jolie") ||
						e.isDirty ||
						!visFile ||
						WebPanel.updatedFromUI
					)
						return;
					if (
						e.languageId === "json" &&
						e.fileName === visFile[0].fsPath
					) {
						const newData = await jv.getData(visFile, false);
						if (newData === WebPanel.data) return;
						WebPanel.data = newData;
						WebPanel.initData();
						return;
					}

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

					if (tls && (await hasTargetNameChanged(tls))) {
						const vfContent = await getVisFileContent(visFile[0]);
						const tlsInFile = vfContent
							.flat()
							.find((t) => e.fileName.endsWith(t.file));
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

					const newData = await jv.getData(visFile, false);
					if (newData === WebPanel.data) return;
					WebPanel.data = newData;
					WebPanel.initData();
				}
			);
			disposeables.push(onSaveListener);
			disposeables.push(onWillSaveListener);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"jolievisualize.choosefile",
			async () => {
				visFile = await vscode.window.showOpenDialog({
					canSelectMany: false,
					canSelectFolders: false,
				});
				if (!visFile) return;
				WebPanel.close();
				vscode.window.showInformationMessage(
					"Chosen Visualization File:" + visFile[0].path
				);
				await vscode.commands.executeCommand("jolievisualize.open");
			}
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("jolievisualize.test", async () => {})
	);
}

export function deactivate() {
	disposeables.forEach((d) => d.dispose());
}
