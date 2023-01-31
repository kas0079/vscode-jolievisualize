import * as vscode from "vscode";
import { convertToVsCodeRange, openDocument } from "../utils";

//done
export const renameService = async (req: Rename.ServiceRequest) => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const res = await renameToken(
		document,
		convertToVsCodeRange(document.getText(), req.range).start,
		req.newServiceName
	);
	if (res) document.save();
	return res;
};

// TODO: test
export const renamePort = async (req: Rename.PortRequest) => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const res =
		req.editType === "port_name"
			? await renameToken(
					document,
					convertToVsCodeRange(document.getText(), req.range).start,
					req.newLine
			  )
			: await replaceLine(
					document,
					convertToVsCodeRange(document.getText(), req.range),
					req.newLine
			  );
	if (res) document.save();
	return res;
};

// done
const replaceLine = async (
	document: vscode.TextDocument,
	range: vscode.Range,
	newText: string
) => {
	const edit = new vscode.WorkspaceEdit();
	edit.replace(document.uri, range, newText);
	return await vscode.workspace.applyEdit(edit);
};

// done
const renameToken = async (
	document: vscode.TextDocument,
	pos: vscode.Position,
	newName: string
) => {
	const c = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
		"vscode.executeDocumentRenameProvider",
		document.uri,
		pos,
		newName
	);
	if (!c) return false;
	vscode.workspace.applyEdit(c);
	return true;
};
