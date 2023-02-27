import * as fs from "fs";
import * as path from "path";
import { Deployment } from "./global";

export const makeDeploymentFolders = (p: {
	data: string;
	visFile: string;
	buildFolder: string;
	deployMethod: string;
}): void => {
	const visFile = p.visFile;
	const buildRoot = path.join(path.dirname(visFile), p.buildFolder);
	const deployMethod = p.deployMethod;

	if (fs.existsSync(buildRoot)) fs.rmSync(buildRoot, { recursive: true });

	fs.mkdirSync(buildRoot, { recursive: true });

	console.log(visFile, buildRoot, deployMethod);

	let build;

	switch (deployMethod) {
		case "docker-compose":
			build = dockerComposeBuild(p.data, buildRoot);
			break;
		case "kubernetes":
			//! not implemented
			break;
	}

	if (!build) return;

	build.folders.forEach((folder) => {
		fs.mkdirSync(path.join(buildRoot, folder.name), { recursive: true });
		if (fs.existsSync(path.join(path.dirname(visFile), "package.json")))
			fs.cpSync(
				path.join(path.dirname(visFile), "package.json"),
				path.join(buildRoot, folder.name, "package.json"),
				{ recursive: true }
			);

		const mainPath = path.join(path.dirname(visFile), folder.main);
		fs.cpSync(mainPath, path.join(buildRoot, folder.name, folder.main), {
			recursive: true,
		});

		folder.files.forEach((file) => {
			const oLPath = path.join(path.dirname(visFile), file);
			fs.cpSync(oLPath, path.join(buildRoot, folder.name, file), {
				recursive: true,
			});
		});

		folder.volumes?.forEach((vol) => {
			fs.cpSync(
				path.join(path.join(path.dirname(visFile)), vol),
				path.join(buildRoot, "-res", vol)
			);
		});

		const dockerFileContent = makeDockerfile(folder);
		fs.writeFileSync(
			path.join(buildRoot, folder.name, "Dockerfile"),
			dockerFileContent
		);
	});
};

const dockerComposeBuild = (
	dockercomposeData: string,
	buildRoot: string
): Deployment.BuildInfo => {
	const build = JSON.parse(dockercomposeData) as Deployment.BuildInfo;
	fs.writeFileSync(
		path.join(buildRoot, "docker-compose.yml"),
		build.deployment
	);

	return build;
};

const makeDockerfile = (folder: Deployment.Folder): string => {
	return `FROM jolielang/jolie\n${
		folder.expose
			? "EXPOSE " + folder.expose.map((t) => t + " ") + "\n"
			: ""
	}COPY . .\nCMD jolie --service ${folder.target}${
		folder.params ? " --params " + folder.params : ""
	}${folder.args ? " " + folder.args : ""} ${folder.main}`;
};

if (process.argv.length < 3) {
	console.log("Need input arguments.");
	process.exit(1);
}
