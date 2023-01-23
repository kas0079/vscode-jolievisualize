import * as vscode from "vscode";
import { findInDocument } from "./utils";

// TODO:
/*
*	renameToken
	renameByReplace
*/

export const renameService = async (msg: any) => {
	const oldService = msg.detail.oldService;
	const newService = msg.detail.newService;
	const res = await rename(
		oldService.name,
		newService.name,
		newService.file,
		"ervice"
	);
	return res;
};

export const renamePort = async (msg: any) => {
	const oldPort = msg.detail.oldPort;
	const newPort = msg.detail.newPort;
	let res;
	switch (msg.detail.editType) {
		case "port_name":
			res = await rename(
				oldPort.name,
				newPort.name,
				newPort.file,
				msg.detail.portType === "op" ? "outputPort" : "inputPort"
			);
			break;
		case "location":
			res = await rename(
				oldPort.location,
				newPort.location,
				newPort.file,
				"ocation"
			);
			break;
		case "protocol":
			res = await rename(
				oldPort.protocol,
				newPort.protocol,
				newPort.file,
				"rotocol"
			);
			break;
	}
	return res;
};

const renameByReplace = async (document: vscode.TextDocument) => {};

const rename = async (
	document: vscode.TextDocument,
	token: string,
	newName: string,
	prefix = ""
) => {
	const c = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
		"vscode.executeDocumentRenameProvider",
		document.uri,
		findInDocument(document, token, prefix),
		newName
	);
	if (!c) return false;
	vscode.workspace.applyEdit(c);
	return true;
};
