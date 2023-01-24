import * as vscode from "vscode";
import { findInDocument, openDocument } from "../utils";

export const createPort = async (req: Create.PortRequest) => {
	const document = await openDocument(req.file);
	if (!document) return;

	const servicePos = findInDocument(
		document,
		"{",
		`ervice ${req.serviceName}`
	);
	if (servicePos === undefined) return;

	const code = `\n\n\t${req.portType} ${req.port.name} {
		Location: "${req.port.location}"
		Protocol: ${req.port.protocol}
		Interfaces: ${req.port.interfaces}
	}\n`;

	//TODO find position of other ports of same type

	const res = await create(
		document,
		new vscode.Position(servicePos.line, servicePos.character + 1),
		code
	);
	if (res) await document.save();
};

//done
const create = async (
	document: vscode.TextDocument,
	position: vscode.Position,
	code: string
) => {
	const edit = new vscode.WorkspaceEdit();
	edit.insert(document.uri, position, code);

	const result = await vscode.workspace.applyEdit(edit);
	return result;
};
