const { run } = require("./index.js");
const {
    DeviceFarmClient,
    ListProjectsCommand,
    ListDevicePoolsCommand,
    ListNetworkProfilesCommand,
    ListVPCEConfigurationsCommand,
    ListUploadsCommand,
    CreateUploadCommand,
    GetUploadCommand,
    ScheduleRunCommand,
    GetRunCommand,
    ListArtifactsCommand,
    ListJobsCommand,
    ListSuitesCommand,
    ListTestsCommand,
} = require("@aws-sdk/client-device-farm");
const axios = require("axios");
const fs = require("fs/promises");
const core = require("@actions/core");
const { UPLOAD, RUN } = require("./constants");
const { mockClient } = require("aws-sdk-client-mock");
require("aws-sdk-client-mock-jest");
const mock = require("mock-fs");

jest.mock("axios");
jest.mock("fs/promises");
jest.mock("@actions/core");
jest.mock("@actions/github", () => ({
    context: {
        runId: 1
    }
}));

function mockGetInput(requestResponse) {
    return function (name, options) { // eslint-disable-line no-unused-vars
        return requestResponse[name]
    }
}

const mockDeviceFarm = mockClient(DeviceFarmClient);

describe("Run", () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeviceFarm.reset();
    });

    afterEach(() => {
        mock.restore();
    });

    it("should lookups arns, upload files and download ALL artifacts (ANDROID)", async () => {
        const INPUTS = {
            "run-name": "TEST RUN",
            "run-settings-path": "run-settings.json",
            "artifact-types": "ALL",
            "upload-poll-interval": "0",
            "run-poll-interval": "0",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        mock({
            "app_resources/aws-devicefarm-sample-app.apk": "",
            "app_resources/MySampleAndroidTests.zip": "",
            "app_resources/webdriverio_spec_file.yml": "",
            "app_resources/external.zip": "",
        });
        const RUN_SETTINGS = {
            name: "replace-this",
            projectArn: "Test",
            appArn: "app_resources/aws-devicefarm-sample-app.apk",
            devicePoolArn: "Top Devices",
            test: {
                type: "APPIUM_NODE",
                testPackageArn: "app_resources/MySampleAndroidTests.zip",
                testSpecArn: "app_resources/webdriverio_spec_file.yml"
            },
            configuration: {
                extraDataPackageArn: "app_resources/external.zip",
                networkProfileArn: "Network",
                vpceConfigurationArns: ["VPCE"]
            }
        }
        fs.readFile.mockResolvedValueOnce(JSON.stringify(RUN_SETTINGS)); // run-settings file
        fs.readFile.mockResolvedValue(""); // all other files
        mockDeviceFarm
            .on(ListProjectsCommand, {})
            .resolvesOnce({
                projects: [
                    {
                        arn: "fake-project-arn",
                        name: "Test"
                    }
                ]
            })
            .on(ListDevicePoolsCommand, {
                arn: "fake-project-arn"
            })
            .resolvesOnce({
                devicePools: [
                    {
                        arn: "fake-devicepool-arn",
                        name: "Top Devices"
                    }
                ]
            })
            .on(ListNetworkProfilesCommand, {
                arn: "fake-project-arn"
            })
            .resolvesOnce({
                networkProfiles: [
                    {
                        arn: "fake-networkProfiles-arn",
                        name: "Network"
                    }
                ]
            })
            .on(ListVPCEConfigurationsCommand)
            .resolvesOnce({
                vpceConfigurations: [
                    {
                        arn: "fake-vpceConfiguration-arn",
                        vpceConfigurationName: "fake-name"
                    }
                ],
                nextToken: "fake-token",
            })
            .on(ListVPCEConfigurationsCommand, {
                nextToken: "fake-token",
            })
            .resolvesOnce({
                vpceConfigurations: [
                    {
                        arn: "fake-vpceConfiguration-arn",
                        vpceConfigurationName: "VPCE"
                    }
                ]
            })
            .on(CreateUploadCommand, {
                projectArn: "fake-project-arn",
                name: "1_aws-devicefarm-sample-app.apk",
                type: "ANDROID_APP"
            })
            .resolvesOnce({
                upload: {
                    arn: "fake-upload-arn-1",
                    url: "fake-url-1"
                }
            })
            .on(GetUploadCommand, {
                arn: "fake-upload-arn-1"
            })
            .resolvesOnce({
                upload: {
                    arn: "fake-upload-arn-1",
                    name: "1_aws-devicefarm-sample-app.apk",
                    status: UPLOAD.STATUS.SUCCEEDED
                }
            })
            .on(CreateUploadCommand, {
                projectArn: "fake-project-arn",
                name: "1_MySampleAndroidTests.zip",
                type: "APPIUM_NODE_TEST_PACKAGE"
            })
            .resolvesOnce({
                upload: {
                    arn: "fake-upload-arn-2",
                    url: "fake-url-2"
                }
            })
            .on(GetUploadCommand, {
                arn: "fake-upload-arn-2"
            })
            .resolvesOnce({
                upload: {
                    arn: "fake-upload-arn-2",
                    name: "1_MySampleAndroidTests.zip",
                    status: UPLOAD.STATUS.SUCCEEDED
                }
            })
            .on(CreateUploadCommand, {
                projectArn: "fake-project-arn",
                name: "1_webdriverio_spec_file.yml",
                type: "APPIUM_NODE_TEST_SPEC"
            })
            .resolvesOnce({
                upload: {
                    arn: "fake-upload-arn-3",
                    url: "fake-url-3"
                }
            })
            .on(GetUploadCommand, {
                arn: "fake-upload-arn-3"
            })
            .resolvesOnce({
                upload: {
                    arn: "fake-upload-arn-3",
                    name: "1_webdriverio_spec_file.yml",
                    status: UPLOAD.STATUS.SUCCEEDED
                }
            })
            .on(CreateUploadCommand, {
                projectArn: "fake-project-arn",
                name: "1_external.zip",
                type: "EXTERNAL_DATA"
            })
            .resolvesOnce({
                upload: {
                    arn: "fake-upload-arn-4",
                    url: "fake-url-4"
                }
            })
            .on(GetUploadCommand, {
                arn: "fake-upload-arn-4"
            })
            .resolvesOnce({
                upload: {
                    arn: "fake-upload-arn-4",
                    name: "1_external.zip",
                    status: UPLOAD.STATUS.SUCCEEDED
                }
            })
            .on(ScheduleRunCommand)
            .resolvesOnce({
                run: {
                    name: INPUTS["run-name"],
                    status: RUN.STATUS.COMPLETED,
                    arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id",
                    result: RUN.RESULT.PASSED,
                    counters: {total: 1, passed: 1, warned: 0, errored: 0, failed: 0, skipped: 0, stopped: 0},
                }
            })
            .on(GetRunCommand, {
                arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id"
            })
            .resolvesOnce({
                run: {
                    name: INPUTS["run-name"],
                    status: RUN.STATUS.COMPLETED,
                    arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id",
                    result: RUN.RESULT.PASSED,
                    counters: {total: 1, passed: 1, warned: 0, errored: 0, failed: 0, skipped: 0, stopped: 0},
                }
            })
            .on(ListJobsCommand, {
                arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id"
            })
            .resolvesOnce({
                jobs: [
                    {
                        arn: "arn:aws:devicefarm:us-west-2:account-id:job:project-id/run-id/fake-job-id",
                        name: "fake-job",
                        counters: {total: 1, passed: 1, warned: 0, errored: 0, failed: 0, skipped: 0, stopped: 0},
                    }
                ]
            })
            .on(ListSuitesCommand, {
                arn: "arn:aws:devicefarm:us-west-2:account-id:job:project-id/run-id/fake-job-id"
            })
            .resolvesOnce({
                suites: [
                    {
                        arn: "arn:aws:devicefarm:us-west-2:account-id:job:project-id/run-id/fake-job-id/fake-suite-id",
                        name: "fake-suite"
                    }
                ]
            })
            .on(ListTestsCommand, {
                arn: "arn:aws:devicefarm:us-west-2:account-id:job:project-id/run-id/fake-job-id/fake-suite-id"
            })
            .resolvesOnce({
                tests: [
                    {
                        arn: "arn:aws:devicefarm:us-west-2:account-id:job:project-id/run-id/fake-job-id/fake-suite-id/fake-test-id",
                        name: "fake-test"
                    }
                ]
            });
        RUN.ARTIFACT_TYPES.forEach(type => {
            mockDeviceFarm
                .on(ListArtifactsCommand, {
                    arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id",
                    type: type
                })
                .resolvesOnce({
                    artifacts: [
                        {
                            arn: `arn:aws:devicefarm:us-west-2:account-id:artifact:project-id/run-id/fake-job-id/fake-suite-id/fake-test-id/fake-asset-${type}-id`,
                            name: `fake-${type}-name`,
                            type: type,
                            extension: `fake-${type}-extension`,
                            url: `fake-${type}-url`
                        }
                    ]
                });
        });
        axios.get.mockResolvedValue(Promise.resolve({data: ""}));

        await run();

        expect(fs.readFile).toBeCalledWith(INPUTS["run-settings-path"]);
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListProjectsCommand, {});
        expect(core.saveState).toHaveBeenCalledWith("projectArn", "fake-project-arn");
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListDevicePoolsCommand, {arn: "fake-project-arn"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListNetworkProfilesCommand, {arn: "fake-project-arn"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListVPCEConfigurationsCommand, {});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(CreateUploadCommand, {projectArn: "fake-project-arn", name: "1_aws-devicefarm-sample-app.apk", type: "ANDROID_APP"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(CreateUploadCommand, {projectArn: "fake-project-arn", name: "1_MySampleAndroidTests.zip", type: "APPIUM_NODE_TEST_PACKAGE"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(CreateUploadCommand, {projectArn: "fake-project-arn", name: "1_webdriverio_spec_file.yml", type: "APPIUM_NODE_TEST_SPEC"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(CreateUploadCommand, {projectArn: "fake-project-arn", name: "1_external.zip", type: "EXTERNAL_DATA"});
        expect(axios.put).toHaveBeenCalledWith("fake-url-1", "", {"headers": {"Content-Type": "application/octet-stream"}});
        expect(axios.put).toHaveBeenCalledWith("fake-url-2", "", {"headers": {"Content-Type": "application/octet-stream"}});
        expect(axios.put).toHaveBeenCalledWith("fake-url-3", "", {"headers": {"Content-Type": "application/octet-stream"}});
        expect(axios.put).toHaveBeenCalledWith("fake-url-4", "", {"headers": {"Content-Type": "application/octet-stream"}});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(GetUploadCommand, {arn: "fake-upload-arn-1"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(GetUploadCommand, {arn: "fake-upload-arn-2"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(GetUploadCommand, {arn: "fake-upload-arn-3"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(GetUploadCommand, {arn: "fake-upload-arn-4"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ScheduleRunCommand, {
            name: "TEST RUN",
            projectArn: "fake-project-arn",
            appArn: "fake-upload-arn-1",
            devicePoolArn: "fake-devicepool-arn",
            test: {
                type: "APPIUM_NODE",
                testPackageArn: "fake-upload-arn-2",
                testSpecArn: "fake-upload-arn-3",
            },
            configuration: {
                extraDataPackageArn: "fake-upload-arn-4",
                networkProfileArn: "fake-networkProfiles-arn",
                vpceConfigurationArns: ["fake-vpceConfiguration-arn"]
            },
        });
        expect(mockDeviceFarm).toHaveReceivedCommandWith(GetRunCommand, {arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListJobsCommand, {arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id"})
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListSuitesCommand, {arn: "arn:aws:devicefarm:us-west-2:account-id:job:project-id/run-id/fake-job-id"})
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListTestsCommand, {arn: "arn:aws:devicefarm:us-west-2:account-id:job:project-id/run-id/fake-job-id/fake-suite-id"})
        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListArtifactsCommand, RUN.ARTIFACT_TYPES.length);
        RUN.ARTIFACT_TYPES.forEach(type => {
            expect(mockDeviceFarm).toHaveReceivedCommandWith(ListArtifactsCommand, {arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id", type: type});
            expect(axios.get).toHaveBeenCalledWith(`fake-${type}-url`, { "responseType": "arraybuffer" });
            expect(fs.writeFile).toBeCalledWith(`./run-id/fake-job/fake-suite/fake-test/fake-asset-${type}-id-fake-${type}-name.fake-${type}-extension`, Buffer.from(""));
        });
        expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    it("should use supplied arns and download VIDEO artifacts with failed result", async () => {
        const INPUTS = {
            "run-name": "TEST RUN",
            "run-settings-path": "run-settings.json",
            "artifact-types": "VIDEO",
            "upload-poll-interval": "0",
            "run-poll-interval": "0",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        const RUN_SETTINGS = {
            name: "replace-this",
            projectArn: "arn:fake-project-arn",
            appArn: "arn:fake-app-arn",
            devicePoolArn: "arn:fake-devicepool-arn",
            test: {
                type: "APPIUM_NODE"
            },
            configuration: {
                networkProfileArn: "arn:fake-networkProfiles-arn",
                vpceConfigurationArns: ["arn:fake-vpceConfiguration-arn"]
            }
        }
        fs.readFile.mockResolvedValueOnce(JSON.stringify(RUN_SETTINGS)); // run-settings file
        mockDeviceFarm
            .on(ListVPCEConfigurationsCommand)
            .resolvesOnce({
                vpceConfigurations: [
                    {
                        arn: "fake-vpceConfiguration-arn",
                        vpceConfigurationName: "fake-name"
                    }
                ]
            })
            .on(ScheduleRunCommand)
            .resolvesOnce({
                run: {
                    name: INPUTS["run-name"],
                    status: RUN.STATUS.COMPLETED,
                    arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id",
                    result: RUN.RESULT.PASSED,
                    counters: {total: 1, passed: 1, warned: 0, errored: 0, failed: 0, skipped: 0, stopped: 0},
                }
            })
            .on(GetRunCommand, {
                arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id"
            })
            .resolvesOnce({
                run: {
                    name: INPUTS["run-name"],
                    status: RUN.STATUS.COMPLETED,
                    arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id",
                    result: RUN.RESULT.FAILED,
                    counters: {total: 1, passed: 1, warned: 0, errored: 0, failed: 0, skipped: 0, stopped: 0},
                }
            })
            .on(ListArtifactsCommand, {
                arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id",
                type: RUN.ARTIFACT_TYPES[0]
            })
            .resolvesOnce({
                artifacts: []
            })
            .on(ListArtifactsCommand, {
                arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id",
                type: RUN.ARTIFACT_TYPES[1]
            })
            .resolvesOnce({
                artifacts: [
                    {
                        arn: "arn:aws:devicefarm:us-west-2:account-id:artifact:project-id/run-id/fake-job-id/fake-suite-id/fake-test-id/fake-asset-id",
                        name: "fake-name",
                        type: "VIDEO",
                        extension: "fake-extension",
                        url: "fake-url"
                    }
                ]
            })
            .on(ListArtifactsCommand, {
                arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id",
                type: RUN.ARTIFACT_TYPES[2]
            })
            .resolvesOnce({
                artifacts: []
            })
            .on(ListJobsCommand, {
                arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id"
            })
            .resolvesOnce({
                jobs: [
                    {
                        arn: "arn:aws:devicefarm:us-west-2:account-id:job:project-id/run-id/fake-job-id",
                        name: "fake-job",
                        counters: {total: 1, passed: 1, warned: 0, errored: 0, failed: 0, skipped: 0, stopped: 0},
                    }
                ]
            })
            .on(ListSuitesCommand, {
                arn: "arn:aws:devicefarm:us-west-2:account-id:job:project-id/run-id/fake-job-id"
            })
            .resolvesOnce({
                suites: [
                    {
                        arn: "arn:aws:devicefarm:us-west-2:account-id:job:project-id/run-id/fake-job-id/fake-suite-id",
                        name: "fake-suite"
                    }
                ]
            })
            .on(ListTestsCommand, {
                arn: "arn:aws:devicefarm:us-west-2:account-id:job:project-id/run-id/fake-job-id/fake-suite-id"
            })
            .resolvesOnce({
                tests: [
                    {
                        arn: "arn:aws:devicefarm:us-west-2:account-id:job:project-id/run-id/fake-job-id/fake-suite-id/fake-test-id",
                        name: "fake-test"
                    }
                ]
            });
        axios.get.mockImplementation(() => Promise.resolve({data: ""}));

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListProjectsCommand, 0);
        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListDevicePoolsCommand, 0);
        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListNetworkProfilesCommand, 0);
        expect(mockDeviceFarm).toHaveReceivedCommandTimes(ListVPCEConfigurationsCommand, 0);
        expect(mockDeviceFarm).toHaveReceivedCommandTimes(CreateUploadCommand, 0);
        expect(axios.put).toBeCalledTimes(0);
        expect(mockDeviceFarm).toHaveReceivedCommandTimes(GetUploadCommand, 0);
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ScheduleRunCommand, {
            name: "TEST RUN",
            projectArn: "arn:fake-project-arn",
            appArn: "arn:fake-app-arn",
            devicePoolArn: "arn:fake-devicepool-arn",
            test: {
                type: "APPIUM_NODE"
            },
            configuration: {
                networkProfileArn: "arn:fake-networkProfiles-arn",
                vpceConfigurationArns: ["arn:fake-vpceConfiguration-arn"]
            },
        });
        expect(mockDeviceFarm).toHaveReceivedCommandWith(GetRunCommand, {arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListArtifactsCommand, {arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id", type: "SCREENSHOT"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListArtifactsCommand, {arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id", type: "FILE"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListArtifactsCommand, {arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id", type: "LOG"});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListJobsCommand, {arn: "arn:aws:devicefarm:us-west-2:account-id:run:project-id/run-id"})
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListSuitesCommand, {arn: "arn:aws:devicefarm:us-west-2:account-id:job:project-id/run-id/fake-job-id"})
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListTestsCommand, {arn: "arn:aws:devicefarm:us-west-2:account-id:job:project-id/run-id/fake-job-id/fake-suite-id"})
        expect(axios.get).toHaveBeenCalledWith("fake-url", { "responseType": "arraybuffer" });
        expect(fs.writeFile).toBeCalledWith("./run-id/fake-job/fake-suite/fake-test/fake-asset-id-fake-name.fake-extension", Buffer.from(""));
        expect(core.setFailed).toHaveBeenCalledWith("FAILED");
    });

    it("should fail if project name not found", async () => {
        const INPUTS = {
            "run-name": "TEST RUN",
            "run-settings-path": "run-settings.json",
            "artifact-types": "ALL",
            "upload-poll-interval": "0",
            "run-poll-interval": "0",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        const RUN_SETTINGS = {
            projectArn: "Bad Name"
        }
        fs.readFile.mockResolvedValueOnce(JSON.stringify(RUN_SETTINGS)); // run-settings file
        mockDeviceFarm
            .on(ListProjectsCommand, {})
            .resolvesOnce({
                projects: [
                    {
                        arn: "fake-project-arn",
                        name: "Test"
                    }
                ]
            });

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListProjectsCommand, {});
        expect(core.setFailed).toHaveBeenCalledWith("No Project with name \"Bad Name\" was found.");
    });

    it("should fail if device pool name not found", async () => {
        const INPUTS = {
            "run-name": "TEST RUN",
            "run-settings-path": "run-settings.json",
            "artifact-types": "ALL",
            "upload-poll-interval": "0",
            "run-poll-interval": "0",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        const RUN_SETTINGS = {
            projectArn: "arn:fake-project-arn",
            devicePoolArn: "Bad Name"
        }
        fs.readFile.mockResolvedValueOnce(JSON.stringify(RUN_SETTINGS)); // run-settings file
        mockDeviceFarm
            .on(ListDevicePoolsCommand, {
                arn: "arn:fake-project-arn"
            })
            .resolvesOnce({
                devicePools: [
                    {
                        arn: "fake-devicepool-arn",
                        name: "Top Devices"
                    }
                ]
            });

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListDevicePoolsCommand, {arn: "arn:fake-project-arn"});
        expect(core.setFailed).toHaveBeenCalledWith("No Device Pool with name \"Bad Name\" was found.");
    });

    it("should fail if network profile name not found", async () => {
        const INPUTS = {
            "run-name": "TEST RUN",
            "run-settings-path": "run-settings.json",
            "artifact-types": "ALL",
            "upload-poll-interval": "0",
            "run-poll-interval": "0",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        const RUN_SETTINGS = {
            projectArn: "arn:fake-project-arn",
            devicePoolArn: "arn:fake-devicepool-arn",
            configuration: {
                networkProfileArn: "Bad Name"
            }
        }
        fs.readFile.mockResolvedValueOnce(JSON.stringify(RUN_SETTINGS)); // run-settings file
        mockDeviceFarm
            .on(ListNetworkProfilesCommand, {
                arn: "arn:fake-project-arn"
            })
            .resolvesOnce({
                networkProfiles: [
                    {
                        arn: "fake-networkProfiles-arn",
                        name: "fake-name"
                    }
                ]
            });

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListNetworkProfilesCommand, {arn: "arn:fake-project-arn"});
        expect(core.setFailed).toHaveBeenCalledWith("No Network Profile with name \"Bad Name\" was found.");
    });

    it("should fail if vpce configuration name not found", async () => {
        const INPUTS = {
            "run-name": "TEST RUN",
            "run-settings-path": "run-settings.json",
            "artifact-types": "ALL",
            "upload-poll-interval": "0",
            "run-poll-interval": "0",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        const RUN_SETTINGS = {
            projectArn: "arn:fake-project-arn",
            devicePoolArn: "arn:fake-devicepool-arn",
            configuration: {
                networkProfileArn: "arn:fake-networkProfiles-arn",
                vpceConfigurationArns: ["Bad Name"]
            }
        }
        fs.readFile.mockResolvedValueOnce(JSON.stringify(RUN_SETTINGS)); // run-settings file
        mockDeviceFarm
            .on(ListVPCEConfigurationsCommand)
            .resolvesOnce({
                vpceConfigurations: [
                    {
                        arn: "fake-vpceConfiguration-arn",
                        vpceConfigurationName: "fake-name"
                    }
                ]
            });

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListVPCEConfigurationsCommand, {});
        expect(core.setFailed).toHaveBeenCalledWith("No VPCE Configuration with name \"Bad Name\" was found.");
    });

    it("should fail if upload name not found (WEB_APP)", async () => {
        const INPUTS = {
            "run-name": "TEST RUN",
            "run-settings-path": "run-settings.json",
            "artifact-types": "",
            "upload-poll-interval": "0",
            "run-poll-interval": "0",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        const RUN_SETTINGS = {
            name: "replace-this",
            projectArn: "arn:fake-project-arn",
            appArn: "aws-devicefarm-sample-app.app",
            devicePoolArn: "arn:fake-devicepool-arn",
            test: {},
            configuration: {}
        }
        fs.readFile.mockResolvedValueOnce(JSON.stringify(RUN_SETTINGS)); // run-settings file
        mockDeviceFarm
            .on(ListUploadsCommand, {
                arn: "arn:fake-project-arn",
                type: "WEB_APP"
            })
            .resolvesOnce({
                uploads: [
                    {
                        arn: "arn:fake-app-arn",
                        name: "fake-name",
                    }
                ]
            });

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListUploadsCommand, {arn: "arn:fake-project-arn", type: "WEB_APP"});
        expect(core.setFailed).toHaveBeenCalledWith("No Upload with name \"aws-devicefarm-sample-app.app\" was found.");
    });

    it("should paginate network profile lookup", async () => {
        const INPUTS = {
            "run-name": "TEST RUN",
            "run-settings-path": "run-settings.json",
            "artifact-types": "",
            "upload-poll-interval": "0",
            "run-poll-interval": "0",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        const RUN_SETTINGS = {
            projectArn: "arn:fake-project-arn",
            appArn: "arn:fake-app-arn",
            devicePoolArn: "arn:fake-devicepool-arn",
            test: {},
            configuration: {
                networkProfileArn: "Network"
            }
        }
        fs.readFile.mockResolvedValueOnce(JSON.stringify(RUN_SETTINGS)); // run-settings file
        mockDeviceFarm
            .on(ListNetworkProfilesCommand, {
                arn: "arn:fake-project-arn"
            })
            .resolvesOnce({
                networkProfiles: [
                    {
                        arn: "fake-networkProfiles-arn",
                        name: "fake-name"
                    }
                ],
                nextToken: "fake-token"
            })
            .on(ListNetworkProfilesCommand, {
                arn: "arn:fake-project-arn",
                nextToken: "fake-token",
            })
            .resolvesOnce({
                networkProfiles: [
                    {
                        arn: "fake-networkProfiles-arn",
                        name: "Network"
                    }
                ]
            });

        await run();

        expect(mockDeviceFarm).toHaveReceivedNthSpecificCommandWith(1, ListNetworkProfilesCommand, {arn: "arn:fake-project-arn"});
        expect(mockDeviceFarm).toHaveReceivedNthSpecificCommandWith(2, ListNetworkProfilesCommand, {arn: "arn:fake-project-arn", nextToken: "fake-token"});
        expect(core.setFailed).toHaveBeenCalledWith("Cannot read properties of undefined (reading 'run')");
    });

    it("should lookup file arns when not found in file system (IOS)", async () => {
        const INPUTS = {
            "run-name": "TEST RUN",
            "run-settings-path": "run-settings.json",
            "artifact-types": "",
            "upload-poll-interval": "0",
            "run-poll-interval": "0",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        const RUN_SETTINGS = {
            name: "replace-this",
            projectArn: "arn:fake-project-arn",
            appArn: "aws-devicefarm-sample-app.ipa",
            devicePoolArn: "arn:fake-devicepool-arn",
            test: {},
            configuration: {}
        }
        fs.readFile.mockResolvedValueOnce(JSON.stringify(RUN_SETTINGS)); // run-settings file
        mockDeviceFarm
            .on(ListUploadsCommand, {
                arn: "arn:fake-project-arn",
                type: "IOS_APP"
            })
            .resolvesOnce({
                uploads: [
                    {
                        arn: "arn:fake-app-arn",
                        name: "aws-devicefarm-sample-app.ipa",
                    }
                ]
            });

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListUploadsCommand, {arn: "arn:fake-project-arn", type: "IOS_APP"});
        expect(core.setFailed).toHaveBeenCalledWith("Cannot read properties of undefined (reading 'run')");
    });

    it("should failed if axios put throws expection", async () => {
        const INPUTS = {
            "run-name": "TEST RUN",
            "run-settings-path": "run-settings.json",
            "artifact-types": "",
            "upload-poll-interval": "0",
            "run-poll-interval": "0",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        mock({
            "app_resources/external.zip": "",
        });
        const RUN_SETTINGS = {
            name: "replace-this",
            projectArn: "arn:fake-project-arn",
            appArn: "arn:fake-app-arn",
            devicePoolArn: "arn:fake-devicepool-arn",
            test: {
                type: "APPIUM_NODE"
            },
            configuration: {
                extraDataPackageArn: "app_resources/external.zip"
            }
        }
        fs.readFile.mockResolvedValueOnce(JSON.stringify(RUN_SETTINGS)); // run-settings file
        fs.readFile.mockResolvedValue(""); // all other files
        mockDeviceFarm
            .on(CreateUploadCommand, {
                projectArn: "arn:fake-project-arn",
                name: "1_external.zip",
                type: "EXTERNAL_DATA"
            })
            .resolvesOnce({
                upload: {
                    arn: "fake-upload-arn",
                    url: "fake-url"
                }
            });
        axios.put.mockResolvedValueOnce(Promise.reject(new Error("fake error")));

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandWith(CreateUploadCommand, {projectArn: "arn:fake-project-arn", name: "1_external.zip", type: "EXTERNAL_DATA"});
        expect(axios.put) .toHaveBeenCalledWith("fake-url", "", {"headers": {"Content-Type": "application/octet-stream"}});
        expect(core.setFailed).toHaveBeenCalledWith("fake error");
    });

    it("should failed if upload status is FAILED", async () => {
        const INPUTS = {
            "run-name": "TEST RUN",
            "run-settings-path": "run-settings.json",
            "artifact-types": "",
            "upload-poll-interval": "0",
            "run-poll-interval": "0",
        };
        core.getInput = jest.fn().mockImplementation(mockGetInput(INPUTS));
        mock({
            "app_resources/external.zip": "",
        });
        const RUN_SETTINGS = {
            name: "replace-this",
            projectArn: "arn:fake-project-arn",
            appArn: "arn:fake-app-arn",
            devicePoolArn: "arn:fake-devicepool-arn",
            test: {
                type: "APPIUM_NODE"
            },
            configuration: {
                extraDataPackageArn: "app_resources/external.zip"
            }
        }
        fs.readFile.mockResolvedValueOnce(JSON.stringify(RUN_SETTINGS)); // run-settings file
        fs.readFile.mockResolvedValue(""); // all other files
        mockDeviceFarm
            .on(CreateUploadCommand, {
                projectArn: "arn:fake-project-arn",
                name: "1_external.zip",
                type: "EXTERNAL_DATA"
            })
            .resolvesOnce({
                upload: {
                    arn: "fake-upload-arn",
                    url: "fake-url"
                }
            })
            .on(GetUploadCommand, {
                arn: "fake-upload-arn"
            })
            .resolvesOnce({
                upload: {
                    arn: "fake-upload-arn",
                    name: "1_external.zip",
                    status: UPLOAD.STATUS.FAILED
                }
            });

        await run();

        expect(mockDeviceFarm).toHaveReceivedCommandWith(CreateUploadCommand, {projectArn: "arn:fake-project-arn", name: "1_external.zip", type: "EXTERNAL_DATA"});
        expect(axios.put).toHaveBeenCalledWith("fake-url", "", {"headers": {"Content-Type": "application/octet-stream"}});
        expect(mockDeviceFarm).toHaveReceivedCommandWith(GetUploadCommand, {arn: "fake-upload-arn"});
        expect(core.setFailed).toHaveBeenCalledWith("Upload failed: FAILED undefined");
    });
});
