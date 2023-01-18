import * as vscode from "vscode";
import {
	findInDocumentText,
	findScopeRangeInServiceScope,
	getServiceText,
	openDocument,
} from "./utils";

export const removeEmbed = async (
	filename: string,
	serviceName: string,
	embedName: string,
	embedPort: string
) => {
	const document = await openDocument(filename);
	if (!document) return false;

	const serviceText = getServiceText(document, serviceName);
	if (!serviceText) return false;

	const embedLocation = findInDocumentText(
		serviceText.text,
		`embed ${embedName}`
	);
	if (!embedLocation) return false;

	const embedLocationInDocument = new vscode.Position(
		embedLocation.line + serviceText.pos.line,
		embedLocation.character
	);

	let embedEndLocation = findInDocumentText(
		serviceText.text,
		`${embedPort}`,
		"in"
	);
	if (!embedEndLocation) {
		embedEndLocation = findInDocumentText(
			serviceText.text,
			`${embedPort}`,
			"as"
		);
		if (!embedEndLocation) return false;
	}

	const embedEndLocationInDocument = new vscode.Position(
		embedEndLocation.line + serviceText.pos.line,
		embedEndLocation.character + embedPort.length + 1
	);

	const res = await remove(
		document,
		new vscode.Range(embedLocationInDocument, embedEndLocationInDocument)
	);
	if (res) await document.save();
};

export const removePort = async (
	filename: string,
	portName: string,
	portType: string,
	serviceName: string,
	shouldAutoSave = false
) => {
	const document = await openDocument(filename);
	if (!document) return false;

	const scopeRange = findScopeRangeInServiceScope(
		document,
		serviceName,
		`${portType.substring(1)} ${portName}`
	);

	if (!scopeRange) return false;

	const res = await remove(document, scopeRange);
	if (res && shouldAutoSave) await document.save();
};

const remove = async (document: vscode.TextDocument, range: vscode.Range) => {
	const edit = new vscode.WorkspaceEdit();
	edit.replace(document.uri, range, "");
	const res = await vscode.workspace.applyEdit(edit);
	return res;
};
