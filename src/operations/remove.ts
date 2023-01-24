import * as vscode from "vscode";
import {
	findInDocumentText,
	findScopeRangeInServiceScope,
	getServiceText,
	openDocument,
} from "../utils";

//how to make shorter?
export const removeEmbed = async (req: Remove.EmbedRequest) => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const serviceText = getServiceText(document, req.serviceName);
	if (!serviceText) return false;

	const embedLocation = findInDocumentText(
		serviceText.text,
		`embed ${req.embedName}`
	);
	if (!embedLocation) return false;

	const embedLocationInDocument = new vscode.Position(
		embedLocation.line + serviceText.pos.line,
		embedLocation.character
	);

	let embedEndLocation = findInDocumentText(
		serviceText.text,
		`${req.embedPort}`,
		"in"
	);
	if (!embedEndLocation) {
		embedEndLocation = findInDocumentText(
			serviceText.text,
			`${req.embedPort}`,
			"as"
		);
		if (!embedEndLocation) return false;
	}

	const embedEndLocationInDocument = new vscode.Position(
		embedEndLocation.line + serviceText.pos.line,
		embedEndLocation.character + req.embedPort.length + 1
	);

	const res = await remove(
		document,
		new vscode.Range(embedLocationInDocument, embedEndLocationInDocument)
	);
	if (res) await document.save();
};

//done
export const removePort = async (req: Remove.PortRequest) => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const scopeRange = findScopeRangeInServiceScope(
		document,
		req.serviceName,
		`${req.portType.substring(1)} ${req.portName}`
	);

	if (!scopeRange) return false;

	return await remove(document, scopeRange);
};

//done
const remove = async (document: vscode.TextDocument, range: vscode.Range) => {
	const edit = new vscode.WorkspaceEdit();
	edit.delete(document.uri, range);
	const res = await vscode.workspace.applyEdit(edit);
	return res;
};
