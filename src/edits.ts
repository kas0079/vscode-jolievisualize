import * as vscode from "vscode";

const edits: { edit: vscode.WorkspaceEdit; document: vscode.TextDocument }[] =
	[];

export const addEdit = (
	edit: vscode.WorkspaceEdit,
	document: vscode.TextDocument
): void => {
	edits.push({ edit, document });
};

export const applyEditsAndSave = (): void => {
	edits.forEach(async (edit) => {
		await vscode.workspace.applyEdit(edit.edit);
	});
};
