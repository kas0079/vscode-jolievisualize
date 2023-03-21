import * as fs from "fs";
import * as path from "path";
import { Deployment } from "./global";

export const formatBuildFolder = (folder: string): string => {
	let res = "";
	if (!folder.startsWith("/")) res = "/" + folder;
	if (folder.endsWith("/")) res.substring(0, res.length - 1);
	return res;
};

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
		let jpm = false;
		if (
			fs.existsSync(
				path.join(
					path.dirname(visFile),
					path.dirname(folder.main),
					"package.json"
				)
			)
		) {
			fs.cpSync(
				path.join(
					path.dirname(visFile),
					path.dirname(folder.main),
					"package.json"
				),
				path.join(buildRoot, folder.name, "package.json"),
				{ recursive: true }
			);
			jpm = true;
		}

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
				path.join(buildRoot, "-res", vol),
				{ recursive: true }
			);
		});

		const dockerFileContent = makeDockerfile(folder, jpm);
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

const makeDockerfile = (folder: Deployment.Folder, jpm: boolean): string => {
	return `FROM jolielang/jolie\n${
		folder.expose
			? "EXPOSE " + folder.expose.map((t) => t + " ") + "\n"
			: ""
	}COPY . .\n${jpm ? "RUN jpm install\n" : ""}CMD jolie --service ${
		folder.target
	}${folder.params ? " --params " + folder.params : ""}${
		folder.args ? " " + folder.args : ""
	} ${folder.main}`;
};

if (process.argv.length < 3) {
	console.log("Need input arguments.");
	process.exit(1);
}
