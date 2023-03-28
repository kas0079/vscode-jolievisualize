import * as vscode from "vscode";
import { Create, UIEdit } from "../global";
import {
	convertToVsCodeRange,
	findInDocument,
	findTokenInProject,
	formatToJoliePath,
	getRangeWithSuffixToken,
	isTokenAnImport,
	openDocument,
	removeCommonPathPrefix,
} from "../utils";

/**
 * Creates a service in a document, filling in basic properties of the service and ports
 * @returns false if creation failed, UIEdit if success.
 */
export const createService = async (
	req: Create.ServiceRequest
): Promise<false | UIEdit> => {
	const document = await openDocument(req.file);
	if (!document) return false;

	let ops = "";
	let ips = "";
	let embs = "";

	if (req.outputPorts)
		req.outputPorts.forEach((op) => {
			ops += `outputPort ${op.name} {
		Protocol: ${op.protocol}
		Location: "${op.location}"
		${op.interfaces ? `Interfaces: ${op.interfaces.map((t) => t.name)}` : ``}
	}\n\n\t`;
		});

	if (req.inputPorts)
		req.inputPorts.forEach((ip) => {
			ips += `${
				ip.annotation ? `\t///@jolievisualize ${ip.annotation}\n` : ""
			}\tinputPort ${ip.name} {
		Protocol: ${ip.protocol}
		Location: "${ip.location}"
		${ip.interfaces ? `Interfaces: ${ip.interfaces.map((t) => t.name)}` : ``}
		${
			ip.aggregates && ip.aggregates.length > 0
				? `Aggregates: ${ip.aggregates.map((t) => t.name)}`
				: ``
		}
	}\n\n\t`;
		});

	if (req.embeddings)
		req.embeddings.forEach(
			(emb) => (embs += `embed ${emb.name} as ${emb.port}\n\t`)
		);

	const code = `\n\nservice ${req.name} {
	${req.execution ? `execution{${req.execution}}\n` : ""}
	${req.outputPorts ? `${ops}\n` : ""}${req.inputPorts ? `${ips}` : ""}${
		req.embeddings ? `${embs}\n` : ""
	}
}`;

	const range = convertToVsCodeRange(document.getText(), req.range);

	const edit = await create(document, range.end, code);
	return { edit, document, offset: document.offsetAt(range.end) };
};

/**
 * Creates an embed line in the code
 * @returns false if creation failed, UIEdit if success.
 */
export const createEmbed = async (
	req: Create.EmbedRequest
): Promise<false | UIEdit> => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const embedAs = req.embedAs === undefined ? true : req.embedAs;

	const code = `\n\n\tembed ${req.embedName}${
		embedAs ? " as " + req.embedPort : ""
	}`;

	const range = req.isFirst
		? getRangeWithSuffixToken(document, req.range, "{")
		: convertToVsCodeRange(document.getText(), req.range);

	const edit = await create(document, range.end, code);
	return { edit, document, offset: document.offsetAt(range.start) };
};

/**
 * Creates a port in a file
 * @returns false if creation failed, UIEdit if success.
 */
export const createPort = async (
	req: Create.PortRequest
): Promise<false | UIEdit> => {
	const document = await openDocument(req.file);
	if (!document) return false;

	const code = `${req.isFirst ? "\n" : ""}\n${
		req.port.annotation
			? `\t\\\\\\@jolievisualize ${req.port.annotation}`
			: ""
	}\t${req.portType} ${req.port.name} {
		Location: "${req.port.location}"
		Protocol: ${req.port.protocol}
		${
			req.port.interfaces.length === 0
				? "OneWay: dummy(void)"
				: "Interfaces: " + req.port.interfaces.map((t) => t.name)
		}
	}${req.isFirst ? "" : "\n\n\t"}`;

	const range = req.isFirst
		? getRangeWithSuffixToken(document, req.range, "{")
		: convertToVsCodeRange(document.getText(), req.range);

	const edit = req.isFirst
		? await create(document, range.end, code)
		: await create(document, range.end.translate(0, 1), code);

	return { edit, document, offset: document.offsetAt(range.start) };
};

/**
 * Checks if the import is missing of some create operations and parses the file paths into jolie import notation.
 * If the file is not found, look through the whole project for the symbol
 * @param fileName name of main file
 * @param path path of the imported declaration file
 * @param importName name of the import
 * @returns false if creation failed, UIEdit if success.
 */
export const createImportIfMissing = async (
	fileName: string,
	path: string,
	importName: string,
	keyword?: string
): Promise<UIEdit | false> => {
	if (!path && keyword) {
		//look for where the import should come from
		const tmp = await findTokenInProject(importName, keyword);
		if (!tmp) return false;
		path =
			tmp.startsWith("/") && !fileName.startsWith("/")
				? tmp.substring(1)
				: !tmp.startsWith("/") && fileName.startsWith("/")
				? "/" + tmp
				: tmp;
	}
	console.log(path, fileName);

	if (fileName === path) return false;
	const document = await openDocument(fileName);
	if (!document || path === "") return false;
	const otherDocument = await openDocument(path);
	if (!otherDocument) return false;

	//make into jolie path
	const joliePath = formatToJoliePath(
		removeCommonPathPrefix(otherDocument.uri.fsPath, document.uri.fsPath)
	);

	const edit = {
		edit: await create(
			document,
			new vscode.Position(0, 0),
			`from ${joliePath} import ${importName}\n`
		),
		document,
		offset: document.offsetAt(new vscode.Position(0, 0)),
	};

	//search for the file import
	const importPos = findInDocument(document, joliePath);
	if (!importPos) return edit;
	return isTokenAnImport(document, importName, joliePath, importPos, [
		"from",
		"interface",
		"service",
		"type",
	])
		? false
		: edit;
};

/**
 * Helper function to insert string into a file at some position
 * @param document document to insert into
 * @param position position to insert
 * @param code string of code to insert
 * @returns vscode workspace edit
 */
const create = async (
	document: vscode.TextDocument,
	position: vscode.Position,
	code: string
): Promise<vscode.WorkspaceEdit> => {
	const edit = new vscode.WorkspaceEdit();
	edit.insert(document.uri, position, code);
	return edit;
};
