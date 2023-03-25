import { Pattern, SimpleRange, UIEdit } from "../global";
import {
	createImportIfMissing,
	createPort,
	createService,
} from "../operations/create";
import { openDocument } from "../utils";

/**
 * Handles a create aggregator request from the UI.
 * Creates all necessary ports in code, as well as the aggregator service.
 * @returns false if creation failed, UIEdit if success.
 */
export const createAggregator = async (
	req: Pattern.AggregatorRequest
): Promise<false | UIEdit[]> => {
	const edits: UIEdit[] = [];

	for (let i = 0; i < req.newIps.length; i++) {
		const ip = req.newIps[i];
		ip.location = ip.location.startsWith("!local") ? "local" : ip.location;
		const p = await createPort({
			file: ip.file,
			isFirst: ip.isFirst,
			port: ip,
			portType: "inputPort",
			range: ip.range,
		});
		if (!p) continue;
		edits.push(p);
		for (const interf of ip.interfaces) {
			const imp = await createImportIfMissing(
				ip.file,
				interf.file ?? "",
				interf.name
			);
			if (imp) edits.push(imp);
		}
	}

	const document = await openDocument(req.service.file);
	if (!document) return false;

	const pos = document.positionAt(document.getText().length);
	const range: SimpleRange = {
		start: { line: pos.line, char: pos.character },
		end: { line: pos.line, char: pos.character },
	};

	const ops = req.service.outputPorts.map((t) => {
		return {
			interfaces: t.interfaces?.filter((t) => t !== undefined),
			name: t.name,
			location: t.location.startsWith("!local") ? "local" : t.location,
			protocol: t.protocol,
		};
	});
	for (const op of ops)
		for (const interf of op.interfaces ?? []) {
			const imp = await createImportIfMissing(
				req.service.file,
				interf.file ?? "",
				interf.name
			);
			if (imp) edits.push(imp);
		}

	for (const emb of req.embeddings ?? []) {
		const imp = await createImportIfMissing(
			req.service.file,
			emb.file ?? "",
			emb.name
		);
		if (imp) edits.push(imp);
	}

	const svc = await createService({
		file: req.service.file,
		name: req.service.name,
		execution: req.service.execution,
		inputPorts: req.service.inputPorts,
		outputPorts: ops,
		embeddings: req.embeddings,
		range,
	});

	if (!svc) return false;
	edits.push(svc);
	return edits;
};
