import * as vscode from "vscode";
import {
	findInDocument,
	findInDocumentText,
	findScopeRangeInServiceScope,
	getServiceText,
	openDocument,
} from "../utils";

export const createAggregator = async () => {};

export const createEmbed = async (req: Create.EmbedRequest) => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const serviceText = getServiceText(document, req.serviceName);
	if (!serviceText) return false;

	const parentPortRange = findScopeRangeInServiceScope(
		document,
		req.serviceName,
		`outputPort ${req.embedPort}`
	);

	const code = `\n\tembed ${req.embedName} in ${req.embedPort}\n`;

	const res = await create(
		document,
		parentPortRange
			? parentPortRange.end.translate(1, -1)
			: serviceText.pos.translate(0, 1),
		code
	);

	if (res) document.save();
	return res;
};

export const createPort = async (req: Create.PortRequest) => {
	const document = await openDocument(req.file);
	if (!document) return false;

	const servicePos = findInDocument(
		document,
		"{",
		`ervice ${req.serviceName}`
	);
	if (servicePos === undefined) return false;

	const code = `\n\t${req.portType} ${req.port.name} {
		Location: "${req.port.location}"
		Protocol: ${req.port.protocol}
		Interfaces: ${req.port.interfaces}
	}\n`;

	const serviceText = getServiceText(document, req.serviceName);
	if (!serviceText) return false;

	let posToInsert = new vscode.Position(
		servicePos.line,
		servicePos.character + 1
	);
	const firstPortDef = findInDocumentText(serviceText.text, req.portType);
	if (firstPortDef) {
		posToInsert = new vscode.Position(
			firstPortDef.line + servicePos.line,
			firstPortDef.character
		);
	}

	const res = await create(document, posToInsert, code);
	if (res) await document.save();
	return res;
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
