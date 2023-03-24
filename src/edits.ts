import * as vscode from "vscode";
import * as jv from "jolievisualize";
import { getVisFileURI, setIntercept } from "./extension";
import WebPanel from "./WebPanel";
import { UIEdit } from "./global";

const edits: UIEdit[] = [];

/**
 * Adds an edit to the stack of pending edits
 * @param edit Edit to add
 */
export const addEdit = (edit: UIEdit | false): void => {
	if (!edit) return;
	edits.push(edit);
};

/**
 * Applies all edits by sorting them by offset in the textfile, so the edit happening the
 * latest in the file gets applied first to keep the ranges intact.
 */
export const applyEditsAndSave = async (): Promise<void> => {
	edits.sort((a, b) => b.offset - a.offset);
	for (let i = 0; i < edits.length; i++)
		await vscode.workspace.applyEdit(edits[i].edit);

	setIntercept(true);
	for (let i = 0; i < edits.length; i++) await edits[i].document.save();

	while (edits.length > 0) edits.pop();

	const data = await jv.getData(getVisFileURI(), false);
	if (JSON.parse(data).error) {
		WebPanel.data = data;
		WebPanel.initData();
	} else WebPanel.sendRange(await jv.getData(getVisFileURI(), false));
};
