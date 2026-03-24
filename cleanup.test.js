import { vi } from "vitest";
import { cleanup } from "./cleanup.js";
import {
    DeviceFarmClient,
    ListUploadsCommand,
    DeleteUploadCommand
} from "@aws-sdk/client-device-farm";
import * as core from "@actions/core";
import * as github from "@actions/github";
import fs from "fs/promises";
import { UPLOAD } from "./constants.js";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-vitest";
import mock from "mock-fs";

vi.mock("@actions/core");
vi.mock("@actions/github", () => ({
    context: {
        runId: 1
    }
}));
vi.mock("fs/promises");

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
        vi.clearAllMocks();
        core.getState = vi.fn().mockImplementation(mockGetState(STATES));
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
        expect(mockDeviceFarm).toHaveReceivedCommandWith(ListUploadsCommand, {
            arn: "fake-project-arn"
        });
        expect(mockDeviceFarm).toHaveReceivedCommandWith(DeleteUploadCommand, {
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
