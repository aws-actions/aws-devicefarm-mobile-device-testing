const { cleanup } = require("./cleanup.js");
const {
    DeviceFarmClient,
    ListUploadsCommand,
    DeleteUploadCommand
} = require("@aws-sdk/client-device-farm");
const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs/promises");
const { UPLOAD } = require("./constants");
const { mockClient } = require("aws-sdk-client-mock");
require("aws-sdk-client-mock-jest");
const mock = require("mock-fs");

jest.mock("@actions/core");
jest.mock("@actions/github", () => ({
    context: {
        runId: 1
    }
}));
jest.mock("fs/promises");

function mockGetState(requestResponse) {
    return function (name, options) { // eslint-disable-line no-unused-vars
        return requestResponse[name]
    }
}

const STATES = {
    projectArn: "fake-project-arn",
    artifactFolder: "folder"
};

const mockDeviceFarm = mockClient(DeviceFarmClient);

describe("Cleanup", () => {

    beforeEach(() => {
        jest.clearAllMocks();
        core.getState = jest.fn().mockImplementation(mockGetState(STATES));
        mockDeviceFarm.reset();
    });

    afterEach(() => {
        mock.restore();
    });

    it("should delete matching upload(s) only", async () => {
        mockDeviceFarm
            .on(ListUploadsCommand, {
                arn: "fake-project-arn"
            })
            .resolves({
                uploads: [
                    { // Matches all criteria
                        arn: "fake-upload-arn-1",
                        name: "1_fake-upload-name",
                        status: UPLOAD.STATUS.INITIALIZED,
                        type: "ANDROID_APP",
                        category: UPLOAD.CATEGORY.PRIVATE
                    },
                    { // Fails match on category
                        arn: "fake-upload-arn-2",
                        name: "1_fake-upload-name",
                        status: UPLOAD.STATUS.INITIALIZED,
                        type: "ANDROID_APP",
                        category: UPLOAD.CATEGORY.CURATED
                    },
                    { // Fails match on name
                        arn: "fake-upload-arn-3",
                        name: "2_fake-upload-name",
                        status: UPLOAD.STATUS.INITIALIZED,
                        type: "ANDROID_APP",
                        category: UPLOAD.CATEGORY.PRIVATE
                    },
                    { // Fails match on status
                        arn: "fake-upload-arn-4",
                        name: "1_fake-upload-name",
                        status: UPLOAD.STATUS.SUCCEEDED,
                        type: "ANDROID_APP",
                        category: UPLOAD.CATEGORY.PRIVATE
                    }
                ]
        });

        await cleanup();

        expect(github.context.runId).toBe(1);
        expect(mockDeviceFarm).toHaveReceivedNthSpecificCommandWith(1, ListUploadsCommand, {
            arn: "fake-project-arn"
        });
        expect(mockDeviceFarm).toHaveReceivedNthSpecificCommandWith(1, DeleteUploadCommand, {
            arn: "fake-upload-arn-1"
        });
        expect(core.setFailed).toHaveBeenCalledTimes(0);
    });


    it("should delete artifact folder", async () => {
        mockDeviceFarm
            .on(ListUploadsCommand, {
                arn: "fake-project-arn"
            })
            .resolves({
                uploads: []
        });
        mock({
            'folder': {/** empty directory */}
        });

        await cleanup();

        expect(fs.rm).toBeCalledTimes(1);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    it("should not delete any folder", async () => {
        mockDeviceFarm
            .on(ListUploadsCommand, {
                arn: "fake-project-arn"
            })
            .resolves({
                uploads: []
        });

        await cleanup();

        expect(fs.rm).toBeCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
    });

    it("should handle exceptions gracefully", async () => {
        await cleanup();
        expect(core.setFailed).toHaveBeenCalledWith("Cannot read properties of undefined (reading 'uploads')");
    });
});
