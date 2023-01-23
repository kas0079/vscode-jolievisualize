import * as vscode from "vscode";
import { findInDocument, openDocument } from "./utils";

export const createPort = async (req: CreatePortRequest, portToken: string) => {
	const document = await openDocument(req.file);
	if (!document) return;

	const servicePos = findInDocument(
		document,
		"{",
		`ervice ${req.serviceName}`
	);

	if (servicePos === undefined) return;

	const code = `\n\n\t${portToken} ${req.port.name} {
		Location: "${req.port.location}"
		Protocol: ${req.port.protocol}
		Interfaces: ${req.port.interfaces}
	}\n`;

	const res = await create(
		document,
		new vscode.Position(servicePos.line, servicePos.character + 1),
		code
	);
	if (res) await document.save();
};

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

type CreatePortRequest = {
	serviceName: string;
	file: string;
	port: {
		name: string;
		location: string;
		protocol: string;
		interfaces: string;
	};
};
