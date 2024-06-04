const {
    DeviceFarmClient,
    paginateListProjects,
    paginateListDevicePools,
    ListNetworkProfilesCommand, // No paginator available
    ListVPCEConfigurationsCommand, // No paginator available
    paginateListUploads,
    CreateUploadCommand,
    GetUploadCommand,
    ScheduleRunCommand,
    GetRunCommand,
    paginateListArtifacts,
    paginateListJobs,
    paginateListSuites,
    paginateListTests,
} = require("@aws-sdk/client-device-farm");
const path = require("path");
const axios = require("axios");
const fs = require("fs/promises");
const { existsSync } = require("fs");
const core = require("@actions/core");
const github = require("@actions/github");
const { INPUTS, OUTPUTS, UPLOAD, RUN } = require("./constants");

const deviceFarm = new DeviceFarmClient();

function countersToString(counters) {
    return `Total: ${counters.total}, passed: ${counters.passed}, warned: ${counters.warned}, errored: ${counters.errored}, failed: ${counters.failed}, skipped: ${counters.skipped}, stopped: ${counters.stopped}`;
}

async function getProjectArn(projectArn) {
    // ARN Already supplied no action required.
    if (projectArn.startsWith("arn:")) return projectArn;
    const listProjects = paginateListProjects({
        client: deviceFarm
    }, {});
    for await (const page of listProjects) {
        const project = page.projects.find(p => p.name === projectArn);
        if (project) {
            return project.arn;
        }
    }
    throw new Error(`No Project with name "${projectArn}" was found.`);
}

async function getDevicePoolArn(projectArn, devicePoolArn) {
    // ARN Already supplied no action required.
    if (devicePoolArn.startsWith("arn:")) return devicePoolArn;
    const listDevicePools = paginateListDevicePools({
        client: deviceFarm
    }, {
        arn: projectArn,
    });
    for await (const page of listDevicePools) {
        const devicePool = page.devicePools.find(d => d.name === devicePoolArn);
        if (devicePool) {
            return devicePool.arn;
        }
    }
    throw new Error(`No Device Pool with name "${devicePoolArn}" was found.`);
}

async function getNetworkProfileArn(projectArn, networkProfileArn) {
    if (networkProfileArn.startsWith("arn:")) return networkProfileArn;
    let listNetworkProfilesCommand = new ListNetworkProfilesCommand({
        arn: projectArn
    });
    let listNetworkProfilesRes = await deviceFarm.send(listNetworkProfilesCommand);
    const profile = listNetworkProfilesRes.networkProfiles.find(p => p.name === networkProfileArn);
    if (profile) {
        return profile.arn;
    } else {
        // Handle pagination
        while (listNetworkProfilesRes.nextToken) {
            listNetworkProfilesCommand = new ListNetworkProfilesCommand({
                arn: projectArn,
                nextToken: listNetworkProfilesRes.nextToken,
            });
            listNetworkProfilesRes = await deviceFarm.send(listNetworkProfilesCommand);
            const profile = listNetworkProfilesRes.networkProfiles.find(p => p.name === networkProfileArn);
            /* istanbul ignore else */
            if (profile) {
                return profile.arn;
            }
        }
        throw new Error(`No Network Profile with name "${networkProfileArn}" was found.`);
    }
}

async function listVPCEConfigurations() {
    let vpceConfigurations = [];
    let listVPCEConfigurationsCommand = new ListVPCEConfigurationsCommand();
    let listVPCEConfigurationsRes = await deviceFarm.send(listVPCEConfigurationsCommand);
    vpceConfigurations.push(...listVPCEConfigurationsRes.vpceConfigurations);
    // Handle pagination
    while (listVPCEConfigurationsRes.nextToken) {
        listVPCEConfigurationsCommand = new ListVPCEConfigurationsCommand({
            nextToken: listVPCEConfigurationsRes.nextToken,
        });
        listVPCEConfigurationsRes = await deviceFarm.send(listVPCEConfigurationsCommand);
        vpceConfigurations.push(...listVPCEConfigurationsRes.vpceConfigurations);
    }
    return vpceConfigurations;
}

async function getVPCEConfigurationArns(vpceArns) {
    let arns = vpceArns.filter(vpce => vpce.startsWith("arn:"));
    const vpceNames = vpceArns.filter(vpce => !vpce.startsWith("arn:"));
    if (vpceNames.length == 0) return arns;
    const vpceConfigurations = await listVPCEConfigurations();
    vpceNames.forEach(vpceName => {
        const vpce = vpceConfigurations.find(v => v.vpceConfigurationName === vpceName);
        if (vpce) {
            arns.push(vpce.arn);
        } else {
            throw new Error(`No VPCE Configuration with name "${vpceName}" was found.`);
        }
    });
    return arns;
}

async function getUploadArn(projectArn, type, uploadName) {
    const listUploads = paginateListUploads({
        client: deviceFarm
    }, {
        arn: projectArn,
        type: type,
    });
    for await (const page of listUploads) {
        const upload = page.uploads.find(u => u.name === uploadName);
        if (upload) {
            return upload.arn;
        }
    }
    throw new Error(`No Upload with name "${uploadName}" was found.`);
}

async function uploadFile(projectArn, fileArn, fileType, testType, pollInterval) {
    // Ensure a value was supplied for the fileArn.
    if (fileArn) {
        // ARN Already supplied no action required.
        if (fileArn.startsWith("arn:")) {
            return fileArn;
        } else {
            // Set the fileType by checking the extension of the App file supplied
            if (fileType == "APP") {
                switch (path.extname(fileArn).toLowerCase()) {
                    case ".ipa":
                        fileType = "IOS_APP";
                        break;
                    case ".apk":
                        fileType = "ANDROID_APP";
                        break;
                    default:
                        fileType = "WEB_APP";
                }
                // Set the fileType by combining the Test Type with the File Type
            } else if (testType) {
                fileType = `${testType}_${fileType}`;
            }
            // Check if file exists within repo if not check Device Farm for existing file with same name.
            if (!existsSync(fileArn)) {
                core.info(`Upload file: ${fileArn} was not found in the repository checking AWS Device Farm for existing file...`);
                return await getUploadArn(projectArn, fileType, fileArn);
                // File found in repo therefore upload the file to Device Farm
            } else {
                const createUploadCommand = new CreateUploadCommand({
                    projectArn: projectArn,
                    name: `${github.context.runId}_${path.basename(fileArn)}`,
                    type: fileType
                });
                let createUploadRes;
                try {
                    createUploadRes = await deviceFarm.send(createUploadCommand);
                    const url = createUploadRes.upload.url;
                    core.info(`Upload of ${createUploadRes.upload.name} starting...`);
                    const fileData = await fs.readFile(fileArn);
                    await axios.put(url, fileData, {
                        headers: { "Content-Type": "application/octet-stream" }
                    });
                    core.info(`Upload of ${createUploadRes.upload.name} complete.`);
                }
                catch (error) {
                    core.error(`Upload of ${createUploadRes.upload.name} failed.`);
                    throw error;
                }
                let uploadStatus = { upload: { status: UPLOAD.STATUS.INITIALIZED } };
                while (uploadStatus.upload.status == UPLOAD.STATUS.INITIALIZED || uploadStatus.upload.status == UPLOAD.STATUS.PROCESSING) {
                    uploadStatus = await deviceFarm.send(new GetUploadCommand({
                        arn: createUploadRes.upload.arn
                    }));
                    core.info(`${uploadStatus.upload.name} upload status is ${uploadStatus.upload.status}...`);
                    await new Promise(r => setTimeout(r, pollInterval));
                }
                core.info(`${uploadStatus.upload.name} upload status is ${uploadStatus.upload.status}.`);
                if (uploadStatus.upload.status == UPLOAD.STATUS.FAILED) {
                    throw new Error(`Upload failed: ${uploadStatus.upload.status} ${uploadStatus.upload.metadata}`);
                }
                return uploadStatus.upload.arn;
            }
        }
    }
    return null;
}

async function scheduleRun(runSettings, pollInterval) {
    core.startGroup("Automated Test run progress");
    const scheduleRunCommand = new ScheduleRunCommand(runSettings);
    core.info(`${runSettings.name} run is being scheduled...`);
    const scheduleRunRes = await deviceFarm.send(scheduleRunCommand);
    let runStatus = { run: { status: RUN.STATUS.PENDING } };
    while (runStatus.run.status != RUN.STATUS.COMPLETED) {
        runStatus = await deviceFarm.send(new GetRunCommand({
            arn: scheduleRunRes.run.arn
        }));
        core.info(`${runSettings.name} run is ${runStatus.run.status}...`);
        await new Promise(r => setTimeout(r, pollInterval));
    }
    core.info(`${runSettings.name} run is ${runStatus.run.status}.`);
    core.endGroup();
    return runStatus.run
}

async function listJobs(runArn) {
    let jobs = [];
    const listJobs = paginateListJobs({
        client: deviceFarm
    }, {
        arn: runArn,
    });
    for await (const page of listJobs) {
        jobs.push(...page.jobs);
    }
    core.startGroup("Job results");
    jobs.forEach(job => core.notice(`${job.name}: ${countersToString(job.counters)}.`));
    core.endGroup();
    return jobs;
}

async function listSuites(jobArn) {
    let suites = [];
    const listSuites = paginateListSuites({
        client: deviceFarm
    }, {
        arn: jobArn,
    });
    for await (const page of listSuites) {
        suites.push(...page.suites);
    }
    return suites;
}

async function listTests(suiteArn) {
    let tests = [];
    const listTests = paginateListTests({
        client: deviceFarm
    }, {
        arn: suiteArn,
    });
    for await (const page of listTests) {
        tests.push(...page.tests);
    }
    return tests;
}

async function getFolderLookups(runArn) {
    const jobs = await listJobs(runArn);
    const suites = (await Promise.all(jobs.map(job => listSuites(job.arn)))).flat();
    const tests = (await Promise.all(suites.map(suite => listTests(suite.arn)))).flat();
    const jobLookups = Object.fromEntries(jobs.map(job => [job.arn.split("/")[2], job.name]));
    const suiteLookups = Object.fromEntries(suites.map(suite => {
        const suiteSplit = suite.arn.split("/");
        return [
            suiteSplit.slice(2, 4).join("/"),
            `${jobLookups[suiteSplit[2]]}/${suite.name}`
        ]
    }));
    const testLookups = Object.fromEntries(tests.map(test => {
        const testSplit = test.arn.split("/");
        return [
            testSplit.slice(2, 5).join("/"),
            `${suiteLookups[testSplit.slice(2, 4).join("/")]}/${test.name}`
        ]
    }));
    return testLookups;
}

async function getDesiredArtifacts(runArn, desiredTypes) {
    /* istanbul ignore if */
    if (desiredTypes.length == 0) return [];
    const artifactsProm = RUN.ARTIFACT_TYPES.map(async type => {
        const artifacts = [];
        const listArtifacts = paginateListArtifacts({
            client: deviceFarm
        }, {
            arn: runArn,
            type: type,
        });
        for await (const page of listArtifacts) {
            if (desiredTypes.toString() == ["ALL"].toString()) {
                artifacts.push(...page.artifacts);
            } else {
                const desiredArtifacts = page.artifacts.filter(artifact => desiredTypes.includes(artifact.type));
                artifacts.push(...desiredArtifacts);
            }
        }
        return artifacts;
    });
    return (await Promise.all(artifactsProm)).flat();
}

async function downloadArtifact(subFolderLookups, folderName, artifact) {
    // Use Path from S3 to produce local path but only use 3 levels of the 4 available. It will be used later.
    const arnSplit = artifact.arn.split("/");
    const subFolder = subFolderLookups[arnSplit.slice(2, 5).join("/")]
    const artifactFolder = `./${folderName}/${subFolder}`;
    await fs.mkdir(artifactFolder, { recursive: true })
    const response = await axios.get(artifact.url, { responseType: "arraybuffer" });
    const fileData = Buffer.from(response.data, "binary");
    // Use the 4th level ignored above in the filename to be certain the name is unique.
    const artifactPath = `${artifactFolder}/${arnSplit[5]}-${artifact.name}.${artifact.extension}`
    core.info(`Downloading ${artifactPath}...`)
    return fs.writeFile(artifactPath, fileData);
}

async function run() {
    // Get inputs
    const runSettingsJson = core.getInput(INPUTS.runSettingsJson, { required: true });
    const artifactTypes = core.getInput(INPUTS.artifactTypes, { required: false }).split(",").map(v => v.trim()).filter(v => v !== "");
    const uploadPollInterval = parseInt(core.getInput(INPUTS.uploadPollInterval, { required: false }));
    const runPollInterval = parseInt(core.getInput(INPUTS.runPollInterval, { required: false }));
    try {
        // Read Run Settings in from Json file
        const runSettings = JSON.parse(runSettingsJson);
        // Set Project Arn
        runSettings.projectArn = await getProjectArn(runSettings.projectArn);
        core.saveState("projectArn", runSettings.projectArn);
        core.info(`Project ARN being used: ${runSettings.projectArn}.`);
        /* istanbul ignore else */
        // Set Device Pool Arn
        if (runSettings.devicePoolArn) {
            runSettings.devicePoolArn = await getDevicePoolArn(runSettings.projectArn, runSettings.devicePoolArn);
            core.info(`Device Pool ARN being used: ${runSettings.devicePoolArn}.`);
        }
        // Set Network Profile Arn
        if (runSettings.configuration?.networkProfileArn) {
            runSettings.configuration.networkProfileArn = await getNetworkProfileArn(runSettings.projectArn, runSettings.configuration.networkProfileArn);
            core.info(`Network Profile ARN being used: ${runSettings.configuration.networkProfileArn}.`);
        }
        // Set VPCE Configuration ARNs
        if (runSettings.configuration?.vpceConfigurationArns) {
            runSettings.configuration.vpceConfigurationArns = await getVPCEConfigurationArns(runSettings.configuration.vpceConfigurationArns);
            core.info(`VPCE Configuration ARNs being used: ${runSettings.configuration.vpceConfigurationArns}.`);
        }
        // Upload App File
        const appProm = uploadFile(runSettings.projectArn, runSettings.appArn, "APP", null, uploadPollInterval);
        // Upload Test Package File
        const tpkProm = uploadFile(runSettings.projectArn, runSettings.test.testPackageArn, "TEST_PACKAGE", runSettings.test.type, uploadPollInterval);
        // Upload Test Specification File
        const tspProm = uploadFile(runSettings.projectArn, runSettings.test.testSpecArn, "TEST_SPEC", runSettings.test.type, uploadPollInterval);
        // Upload External Data File
        const extProm = uploadFile(runSettings.projectArn, runSettings.configuration?.extraDataPackageArn, "EXTERNAL_DATA", null, uploadPollInterval);
        core.startGroup("Uploading files");
        const [appArn, tpkArn, tspArn, extArn] = await Promise.all([appProm, tpkProm, tspProm, extProm]);
        core.endGroup();
        // Set App Upload Arn
        runSettings.appArn = appArn;
        // Set Test Package Upload Arn
        if (runSettings.test.testPackageArn) {
            runSettings.test.testPackageArn = tpkArn;
        }
        // Set Test Specification Upload Arn
        if (runSettings.test.testSpecArn) {
            runSettings.test.testSpecArn = tspArn;
        }
        // Set External Data Upload Arn
        if (runSettings.configuration?.extraDataPackageArn) {
            runSettings.configuration.extraDataPackageArn = extArn;
        }
        const testRun = await scheduleRun(runSettings, runPollInterval);
        core.startGroup("Automated Test run details");
        core.notice(`${runSettings.name} run result is ${testRun.result}.`);
        const consoleUrl = `https://${process.env.AWS_REGION}.console.aws.amazon.com/devicefarm/home#/mobile/projects/${testRun.arn.split(":")[6].replace("/", "/runs/")}`;
        core.notice(consoleUrl)
        core.setOutput(OUTPUTS.consoleUrl, consoleUrl);
        core.notice(`${countersToString(testRun.counters)}.`);
        core.endGroup();
        const artifactFolder = testRun.arn.split(":")[6].split("/")[1]
        core.saveState("artifactFolder", artifactFolder);
        /* istanbul ignore else */
        if (artifactTypes.length > 0) {
            const desiredArtifacts = await getDesiredArtifacts(testRun.arn, artifactTypes);
            /* istanbul ignore else */
            if (desiredArtifacts.length > 0) {
                const folderLookups = await getFolderLookups(testRun.arn);
                core.startGroup("Download test artifacts");
                await Promise.all(desiredArtifacts.map(desiredArtifact => downloadArtifact(folderLookups, artifactFolder, desiredArtifact)));
                core.endGroup();
            }
        }
        core.setOutput(OUTPUTS.arn, testRun.arn);
        core.setOutput(OUTPUTS.status, testRun.status);
        core.setOutput(OUTPUTS.result, testRun.result);
        core.setOutput(OUTPUTS.artifactFolder, artifactFolder);
        if (testRun.result != RUN.RESULT.PASSED) {
            core.setFailed(testRun.result);
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

module.exports = {
    run,
};

/* istanbul ignore next */
if (require.main === module) {
    run();
}
