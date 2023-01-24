import * as vscode from "vscode";
import {
	findInDocument,
	findInDocumentText,
	findScopeRangeInServiceScope,
	findTokenInServiceText,
	openDocument,
} from "../utils";

//done
export const renameService = async (req: Rename.ServiceRequest) => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const namePos = findInDocument(document, req.oldServiceName, "ervice");
	if (!namePos) return false;

	const res = await renameToken(document, namePos, req.newServiceName);
	return res;
};

// maybe remove switch
export const renamePort = async (req: Rename.PortRequest) => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	let res = false;
	switch (req.editType) {
		case "port_name":
			const tokenPos = findTokenInServiceText(
				document,
				req.serviceName,
				req.oldLine,
				req.portType
			);
			if (!tokenPos) return false;
			res = await renameToken(document, tokenPos, req.newLine);
			break;
		case "location":
			res = await replacePortCodeLine(
				document,
				req.serviceName,
				req.oldLine,
				req.newLine,
				req.portName,
				req.portType
			);
			break;
		case "protocol":
			res = await replacePortCodeLine(
				document,
				req.serviceName,
				req.oldLine,
				req.newLine,
				req.portName,
				req.portType
			);
			break;
	}
	return res;
};

//done
const replacePortCodeLine = async (
	document: vscode.TextDocument,
	serviceName: string,
	oldLine: string,
	newLine: string,
	portName: string,
	portType: string
) => {
	const portRange = findScopeRangeInServiceScope(
		document,
		serviceName,
		`${portType} ${portName}`
	);
	if (!portRange) return false;
	const scopeText = document.getText(portRange);
	const linePos = findInDocumentText(scopeText, oldLine)?.translate(
		portRange.start.line
	);
	if (!linePos) return false;

	return await replaceLine(
		document,
		new vscode.Range(
			linePos,
			new vscode.Position(
				linePos.line,
				linePos.character + oldLine.length
			)
		),
		newLine
	);
};

// done
const replaceLine = async (
	document: vscode.TextDocument,
	range: vscode.Range,
	newText: string
) => {
	const edit = new vscode.WorkspaceEdit();
	edit.replace(document.uri, range, newText);
	const res = await vscode.workspace.applyEdit(edit);
	if (res) document.save();
	return res;
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
