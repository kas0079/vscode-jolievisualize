import * as path from "path";
import * as vscode from "vscode";
import * as jv from "jolievisualize";
import { addEdit, applyEditsAndSave } from "./edits";
import { deactivate, getVisFile, setIntercept } from "./extension";
import { createEmbed, createPort } from "./operations/create";
import { removeEmbed, removePort } from "./operations/remove";
import { renamePort, renameService } from "./operations/rename";
import { createAggregator } from "./patterns/aggregator";

export default class WebPanel {
	static currentPanel: WebPanel | undefined;

	static readonly #viewtype = "jolievisualize";
	static data: string;
	static visFile: vscode.Uri;
	static visFileContent: string;
	readonly #panel: vscode.WebviewPanel;
	readonly #extensionPath: string;
	#disposables: vscode.Disposable[] = [];

	constructor(extensionPath: string, column: vscode.ViewColumn) {
		this.#extensionPath = extensionPath;

		this.#panel = vscode.window.createWebviewPanel(
			WebPanel.#viewtype,
			`Jolie Visualize`,
			column,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [
					vscode.Uri.file(
						path.join(
							this.#extensionPath,
							"node_modules",
							"jolievisualize",
							"web"
						)
					),
				],
			}
		);
		this.#panel.webview.html = this.#getHTML();

		this.#panel.webview.onDidReceiveMessage(async (msg: any) => {
			// console.log("start", msg.command, msg.save, msg.fromPopup);
			if (msg.command === "getData") WebPanel.initData();
			else if (msg.command === "visData") {
				setIntercept(true);
				await WebPanel.setVisfileContent(msg.detail);
			} else if (msg.command === "getRanges")
				WebPanel.sendRange(await jv.getData(getVisFile(), false));
			else if (msg.command === "renamePort")
				addEdit(await renamePort(msg.detail));
			else if (msg.command === "removeEmbed")
				addEdit(await removeEmbed(msg.detail));
			else if (msg.command === "addEmbed")
				addEdit(await createEmbed(msg.detail));
			else if (msg.command === "removePorts") {
				msg.detail.ports.forEach(async (req: any) => {
					addEdit(await removePort(req));
				});
			} else if (msg.command === "renameService")
				addEdit(await renameService(msg.detail));
			else if (msg.command === "newPort")
				addEdit(await createPort(msg.detail));
			else if (msg.command === "create.pattern.aggregator") {
				const edits = await createAggregator(msg.detail);
				if (edits) edits.forEach((e) => addEdit(e));
			}

			if (msg.save) await applyEditsAndSave();
			if (msg.fromPopup) setIntercept(false);
		});

		this.#panel.onDidDispose(
			() => this.#dispose(),
			null,
			this.#disposables
		);
	}

	static initData() {
		if (!WebPanel.currentPanel) return;
		WebPanel.currentPanel.#panel.webview.postMessage({
			command: "initData",
			data: WebPanel.data,
		});
	}

	static sendData() {
		if (!WebPanel.currentPanel) return;
		WebPanel.currentPanel.#panel.webview.postMessage({
			command: "setData",
			data: WebPanel.data,
		});
	}

	static sendRange(data: any) {
		if (!WebPanel.currentPanel) return;
		WebPanel.currentPanel.#panel.webview.postMessage({
			command: "setRanges",
			data,
		});
	}

	static undo() {
		if (!WebPanel.currentPanel) return;
		WebPanel.currentPanel.#panel.webview.postMessage({
			command: "undo",
		});
	}

	static async setVisfileContent(visfileContent: string) {
		const jsonContent = JSON.parse(visfileContent);
		const contentString = JSON.stringify(jsonContent.content);
		if (
			vscode.workspace.workspaceFolders === undefined ||
			WebPanel.visFileContent === contentString
		)
			return;

		WebPanel.visFileContent = contentString;

		const document = await vscode.workspace.openTextDocument(this.visFile);
		const numOfLines = document.lineCount - 1;
		const lastCharPor = document.lineAt(numOfLines).text.length;

		const edit = new vscode.WorkspaceEdit();
		edit.replace(
			this.visFile,
			new vscode.Range(
				new vscode.Position(0, 0),
				new vscode.Position(numOfLines, lastCharPor)
			),
			contentString
		);

		await vscode.workspace.applyEdit(edit);
		const success = await document.save();
		setIntercept(false);

		if (!success) {
			vscode.window.showErrorMessage(
				`Could not overwrite visualization file: ${document.fileName}`
			);
		}
	}

	static open(extensionPath: string) {
		const column = vscode.ViewColumn.Beside;
		if (WebPanel.currentPanel) WebPanel.currentPanel.#panel.reveal(column);
		else WebPanel.currentPanel = new WebPanel(extensionPath, column);
	}

	static close() {
		if (!WebPanel.currentPanel) return;
		WebPanel.currentPanel.#dispose();
	}

	#getHTML() {
		const scriptPathOnDisk = vscode.Uri.file(
			path.join(
				this.#extensionPath,
				"node_modules",
				"jolievisualize",
				"web",
				"bundle.js"
			)
		);
		const scriptUri = this.#panel.webview.asWebviewUri(scriptPathOnDisk);

		const stylePathOnDisk = vscode.Uri.file(
			path.join(
				this.#extensionPath,
				"node_modules",
				"jolievisualize",
				"web",
				"bundle.css"
			)
		);
		const styleUri = this.#panel.webview.asWebviewUri(stylePathOnDisk);

		const nonce = getNonce();
		return `<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
				<meta name="theme-color" content="#000000">
				<title>Jolie Visualize</title>
				<script defer src="https://d3js.org/d3.v7.min.js"></script>
				<script defer src="https://cdn.jsdelivr.net/npm/elkjs@0.8.2/lib/elk.bundled.min.js"></script>
				<link rel="stylesheet" type="text/css" href="${styleUri}">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}';style-src vscode-resource: 'unsafe-inline' http: https: data:;">
				<script defer nonce="${nonce}" src="${scriptUri}"></script>
			</head>
			<body style="overflow:hidden;">
				<noscript>You need to enable JavaScript to run this app.</noscript>
				<div id="app"></div>
			</body>
			</html>`;
	}

	#dispose() {
		WebPanel.currentPanel = undefined;
		this.#panel.dispose();

		while (this.#disposables.length) {
			const x = this.#disposables.pop();
			if (x) x.dispose();
		}
		deactivate();
	}
}

function getNonce() {
	let text = "";
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
