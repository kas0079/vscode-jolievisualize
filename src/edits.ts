import * as vscode from "vscode";
import * as jv from "jolievisualize";
import { getVisFile, setIntercept } from "./extension";
import WebPanel from "./WebPanel";
import { UIEdit } from "./global";

const edits: UIEdit[] = [];

export const addEdit = (edit: UIEdit | false): void => {
	if (!edit) return;
	edits.push(edit);
};

export const applyEditsAndSave = async (): Promise<void> => {
	edits.sort((a, b) => b.offset - a.offset);
	for (let i = 0; i < edits.length; i++)
		await vscode.workspace.applyEdit(edits[i].edit);

	setIntercept(true);
	for (let i = 0; i < edits.length; i++) await edits[i].document.save();

	while (edits.length > 0) edits.pop();

	WebPanel.sendRange(await jv.getData(getVisFile(), false));
};
