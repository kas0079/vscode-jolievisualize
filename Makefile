build_jolievisualize_vscode:
	npm install
	npm update
	vsce package
	code --install-extension ./vscode-jolievisualize-1.0.0.vsix
