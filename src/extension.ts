import * as jv from "jolievisualize";
import * as vscode from "vscode";
import WebPanel from "./WebPanel";
import { TLS } from "./global";
import {
	getAllTopServiceFiles,
	getVisFileContent,
	hasTargetNameChanged,
} from "./visFile";
import { makeDeploymentFolders } from "./deploy";
import { createService } from "./operations/create";

let interceptSave = false;
let visFile: vscode.Uri[] | undefined = undefined;
const disposeables: vscode.Disposable[] = [];
const fileVersions: { fileName: string; version: number }[] = [];

export const setIntercept = (bool: boolean) => {
	interceptSave = bool;
};

export const getVisFile = () => {
	return visFile;
};

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("jolievisualize.open", async () => {
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
			WebPanel.data = jv.getData(visFile, false);
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
				}
			);

			// create listener for onSave events
			let onSaveListener = vscode.workspace.onDidSaveTextDocument(
				async (e) => {
					if (
						(e.languageId !== "json" && e.languageId !== "jolie") ||
						e.isDirty ||
						!visFile ||
						!WebPanel.currentPanel
					)
						return;

					if (
						e.languageId === "json" &&
						e.fileName === visFile[0].fsPath &&
						!interceptSave
					) {
						const newData = jv.getData(visFile, false);
						if (newData === WebPanel.data) return;
						WebPanel.data = newData;
						WebPanel.initData();
						return;
					}
					if (interceptSave) {
						console.log("intercept");
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

					if (tls && tls.file && (await hasTargetNameChanged(tls))) {
						const vfContent = await getVisFileContent(visFile[0]);
						const tlsInFile = vfContent
							.flat()
							.find((t) => t.file && e.fileName.endsWith(t.file));
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
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"jolievisualize.choosefile",
			async (shouldOpenWebview = true) => {
				visFile = await vscode.window.showOpenDialog({
					canSelectMany: false,
					canSelectFolders: false,
				});
				if (!shouldOpenWebview || !visFile) return;
				WebPanel.close();
				await vscode.commands.executeCommand("jolievisualize.open");
			}
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("jolievisualize.test", async () => {
			const edit = await createService({
				file: "/solo.ol",
				name: "Testservice",
				range: {
					start: { line: 0, char: 0 },
					end: { line: 0, char: 0 },
				},
				execution: "concurrent",
				inputPorts: [
					{
						location: '"socket://localhost:1343"',
						name: "TestIP1",
						protocol: "sodep",
						annotation: "TEST",
						interfaces: ["Dummy"],
					},
				],
				outputPorts: [
					{
						location: '"socket://localhost:4343"',
						name: "TestOP1",
						protocol: "sodep",
						interfaces: ["Dummy2"],
					},
					{
						location: '"socket://localhost:4343"',
						name: "TestOP1",
						protocol: "sodep",
						interfaces: ["Dummy2"],
					},
				],
			});

			if (edit !== false) vscode.workspace.applyEdit(edit.edit);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("jolievisualize.build", async () => {
			if (visFile === undefined) {
				await vscode.commands.executeCommand(
					"jolievisualize.choosefile",
					false
				);
			}
			if (visFile === undefined) {
				vscode.window.showErrorMessage(
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
				buildMethod === "" ? buildMethod : "docker-compose"
			);

			makeDeploymentFolders({
				data: buildData,
				visFile: visFile[0].fsPath,
				buildFolder: buildFolder ?? "build",
				deployMethod: buildMethod ?? "docker-compose",
			});
		})
	);
}

export function deactivate() {
	disposeables.forEach((d) => d.dispose());
}
